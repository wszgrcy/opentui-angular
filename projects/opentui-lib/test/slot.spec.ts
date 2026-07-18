import { createTestRenderer, TestRendererOptions } from '@opentui/core/testing';
import { APP_CONTEXT_TOKEN, createAngularSlotRegistry, useKeyboard } from '@cyia/opentui-angular';
import {
  Component,
  ComponentRef,
  computed,
  createComponent,
  effect,
  EnvironmentInjector,
  inject,
  InjectionToken,
  Injector,
  input,
  inputBinding,
  isSignal,
  NO_ERRORS_SCHEMA,
  signal,
  Type,
  untracked,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AngularPlugin, Slot } from '../plugins/slot';
import { PluginErrorEvent, SlotRegistry } from '@opentui/core';
import { CliRendererToken } from '../token/cli-render.token';
import { initTestEnv } from './util/init-env';
type AppSlots = {
  statusbar: { user: string };
  sidebar: { items: string[] };
};

const hostContext = {
  appName: 'angular-slot-tests',
  version: '1.0.0',
};
let testSetup: Awaited<ReturnType<typeof createTestRenderer>>;
async function setupSlotTest(
  createNode: (
    registry: ReturnType<typeof createAngularSlotRegistry<AppSlots, typeof hostContext>>,
  ) => {
    Component: Type<any>;
    inputs: Record<string, any>;
  },
  options: TestRendererOptions,
) {
  let root: any | null = null;

  const setup = await createTestRenderer({
    ...options,
    onDestroy() {
      if (root) {
        root.unmount();
        root = null;
      }

      options.onDestroy?.();
    },
  });
  // temp fix
  const oldRaf = global.requestAnimationFrame;
  let index = 0;
  const animationRequest = new Map<number, NodeJS.Timeout>();
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const timeout = setTimeout(() => {
      oldRaf(callback);
    });
    animationRequest.set(index++, timeout);
    return index;
  };
  global.cancelAnimationFrame = (input: number) => {
    clearTimeout(animationRequest.get(input));
  };

  const registry = createAngularSlotRegistry<AppSlots, typeof hostContext>(
    setup.renderer,
    hostContext,
  );
  const { Component, inputs } = createNode(registry);
  TestBed.configureTestingModule({
    imports: [Component],
    providers: [
      {
        provide: CliRendererToken,
        useValue: setup.renderer,
      },
      {
        provide: APP_CONTEXT_TOKEN,
        useValue: {
          keyHandler: setup.renderer.keyInput,
          renderer: setup.renderer,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Component, {
    bindings: Object.entries(inputs).map(([key, value]) =>
      inputBinding(key, isSignal(value) ? value : signal(value)),
    ),
  });
  fixture.detectChanges();
  fixture.componentRef.onDestroy(() => {
    testSetup.renderer.destroy();
  });

  return { setup, registry, fixture };
}
describe('Angular Slot System', () => {
  beforeEach(async () => {
    testSetup?.renderer.destroy();
    initTestEnv();
  });

  afterEach(() => {
    testSetup?.renderer.destroy();
  });

  it('reuses one registry per renderer and rejects different context', async () => {
    const setup = await createTestRenderer({ width: 20, height: 4 });
    testSetup = setup;

    const context = { appName: 'angular-slot-tests', version: '1.0.0' };
    const first = createAngularSlotRegistry<AppSlots, typeof context>(setup.renderer, context);
    const second = createAngularSlotRegistry<AppSlots, typeof context>(setup.renderer, context);

    expect(first).toBe(second);

    expect(() => {
      createAngularSlotRegistry<AppSlots, typeof context>(setup.renderer, {
        appName: 'other',
        version: '2.0.0',
      });
    }).toThrow('different context');
  });
  it('renders fallback content when no plugin matches', async () => {
    const { setup } = await setupSlotTest(
      (registry) => {
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            ><text>fallback-only</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry } };
      },

      { width: 50, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('fallback-only');
  });
  it('renders fallback content when no plugin matches(ng-template)', async () => {
    const { setup } = await setupSlotTest(
      (registry) => {
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            ><ng-template><text>fallback-only</text></ng-template>
          </ngx-slot>`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry } };
      },

      { width: 50, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('fallback-only');
  });
  it('coordinated teardown does not re-remove nodes the renderer already destroyed', async () => {
    const { setup } = await setupSlotTest(
      (registry) => {
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            ><text>fallback-only</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: registry } };
      },
      { width: 50, height: 6 },
    );
    testSetup = setup;
    await testSetup.renderOnce();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      testSetup.renderer.destroy();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
  it('appends plugin output after fallback content by default', async () => {
    const plugin: AngularPlugin<AppSlots, typeof hostContext> = {
      id: 'append-plugin',
      slots: {
        statusbar: (() => {
          @Component({
            template: `<text>plugin:{{ ctx().appName }}:{{ props().user }}</text>`,
            schemas: [NO_ERRORS_SCHEMA],
          })
          class TestComponent {
            ctx = input.required<any>();
            props = input.required<any>();
          }
          let componentRef: ComponentRef<TestComponent>;
          return (ctx, props) => {
            componentRef ??= createComponent(TestComponent, {
              environmentInjector: inject(EnvironmentInjector),
            });
            componentRef.setInput('ctx', ctx);
            componentRef.setInput('props', props);
            return componentRef;
          };
        })(),
      },
    };

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register(plugin);
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'ava' }"
            ><text>base-content</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return {
          Component: SlotComponent,
          inputs: { registry: slotRegistry },
        };
      },
      { width: 60, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('base-content');
    expect(frame).toContain('plugin:angular-slot-tests:ava');
  });

  it('replace mode hides fallback and renders all ordered plugins', async () => {
    const { setup, registry } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'late',
          order: 10,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'late',
                template: `<text>late-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class LatePluginComponent {}
              let componentRef: ComponentRef<LatePluginComponent>;
              return () => {
                componentRef ??= createComponent(LatePluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        slotRegistry.register({
          id: 'early',
          order: 0,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'early',
                template: `<text>early-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class EarlyPluginComponent {}
              let componentRef: ComponentRef<EarlyPluginComponent>;
              return () => {
                componentRef ??= createComponent(EarlyPluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });
        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'lee' }"
            mode="replace"
            ><text>replace-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 40, height: 6 },
    );

    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('early-plugin');
    expect(frame).toContain('late-plugin');
    expect(frame).not.toContain('replace-fallback');
  });

  it('replace mode does not invoke fallback components when plugin content wins', async () => {
    const fallbackLifecycle: string[] = [];

    @Component({
      selector: 'fallback-probe-cmp',
      template: `<text>fallback-probe</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class FallbackProbeComponent {
      fallbackLifecycle: string[] = fallbackLifecycle;
      constructor() {
        this.fallbackLifecycle.push('constructor');
      }
      ngOnInit(): void {
        this.fallbackLifecycle.push('ngOnInit');
      }
      ngOnDestroy(): void {
        this.fallbackLifecycle.push('ngOnDestroy');
      }
    }

    const { setup, registry } = await setupSlotTest(
      (slotRegistry) => {
        const replacePlugin: AngularPlugin<AppSlots, typeof hostContext> = {
          id: 'replace-plugin',
          slots: {
            statusbar: (() => {
              @Component({
                template: `<text>plugin-only</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class ReplacePluginComponent {}
              let componentRef: ComponentRef<ReplacePluginComponent>;
              return () => {
                componentRef ??= createComponent(ReplacePluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        };
        slotRegistry.register(replacePlugin);
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'lee' }"
            mode="replace"
          >
            <ng-template>
              <fallback-probe-cmp></fallback-probe-cmp>
            </ng-template>
          </ngx-slot>`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot, FallbackProbeComponent],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 40, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('plugin-only');
    expect(frame).not.toContain('fallback-probe');
    expect(fallbackLifecycle).toEqual([]);
  });

  it('single_winner mode renders only the highest-priority plugin', async () => {
    const { setup, registry } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'late',
          order: 10,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'late',
                template: `<text>late-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class LatePluginComponent {}
              let componentRef: ComponentRef<LatePluginComponent>;
              return () => {
                componentRef ??= createComponent(LatePluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });
        slotRegistry.register({
          id: 'early',
          order: 0,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'early',
                template: `<text>early-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class EarlyPluginComponent {}
              let componentRef: ComponentRef<EarlyPluginComponent>;
              return () => {
                componentRef ??= createComponent(EarlyPluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });
        @Component({
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'lee' }"
            mode="single_winner"
            ><text>single-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 40, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('early-plugin');
    expect(frame).not.toContain('late-plugin');
    expect(frame).not.toContain('single-fallback');
  });

  it('replace mode keeps healthy plugin output when another plugin fails', async () => {
    const { setup, registry } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'broken-plugin',
          order: 0,
          slots: {
            statusbar: (() => () => {
              throw new Error('broken render');
            })(),
          },
        });

        slotRegistry.register({
          id: 'healthy-plugin',
          order: 10,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'healthy',
                template: `<text>healthy-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class HealthyPluginComponent {}
              let componentRef: ComponentRef<HealthyPluginComponent>;
              return () => {
                componentRef ??= createComponent(HealthyPluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'lee' }"
            mode="replace"
            ><text>replace-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 50, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('healthy-plugin');
    expect(frame).not.toContain('replace-fallback');
  });

  it('single_winner mode falls back when highest-priority plugin fails', async () => {
    const { setup, registry } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'broken-winner',
          order: 0,
          slots: {
            statusbar: (() => () => {
              throw new Error('winner failed');
            })(),
          },
        });

        slotRegistry.register({
          id: 'healthy-second',
          order: 10,
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'healthy-second',
                template: `<text>healthy-second</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class HealthySecondComponent {}
              let componentRef: ComponentRef<HealthySecondComponent>;
              return () => {
                componentRef ??= createComponent(HealthySecondComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'lee' }"
            mode="single_winner"
            ><text>single-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 50, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('single-fallback');
    expect(frame).not.toContain('healthy-second');
  });

  it('angular to plugin registration and unregistering', async () => {
    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'kai' }"
            mode="replace"
            ><text>dynamic-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 40, height: 6 },
    );
    testSetup = setup;

    const plugin: AngularPlugin<AppSlots, typeof hostContext> = {
      id: 'dynamic-plugin',
      slots: {
        statusbar: (() => {
          @Component({
            selector: 'dynamic',
            template: `<text>dynamic-plugin</text>`,
            schemas: [NO_ERRORS_SCHEMA],
          })
          class DynamicPluginComponent {}
          let componentRef: ComponentRef<DynamicPluginComponent>;
          return () => {
            componentRef ??= createComponent(DynamicPluginComponent, {
              environmentInjector: inject(EnvironmentInjector),
            });
            return componentRef;
          };
        })(),
      },
    };
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain('dynamic-fallback');

    registry.register(plugin);
    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();
    const withPlugin = testSetup.captureCharFrame();
    expect(withPlugin).toContain('dynamic-plugin');
    expect(withPlugin).not.toContain('dynamic-fallback');

    registry.unregister('dynamic-plugin');
    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();
    const withoutPlugin = testSetup.captureCharFrame();
    expect(withoutPlugin).toContain('dynamic-fallback');
    expect(withoutPlugin).not.toContain('dynamic-plugin');
  });

  it('switches rendered slot when props.name changes', async () => {
    @Component({
      selector: 'test-slot',
      template: `<ngx-slot
        [registry]="registry()"
        [name]="dynamicProps().name"
        [slotProps]="dynamicProps().slotProps"
        [mode]="dynamicProps().mode"
        ><text>dynamic-name-fallback</text></ngx-slot
      >`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Slot],
    })
    class DynamicNameHarness {
      registry = input.required<SlotRegistry<any, any, any>>();
      slotName = signal('statusbar');
      dynamicProps = computed(() =>
        this.slotName() === 'statusbar'
          ? ({ name: 'statusbar', slotProps: { user: 'sam' }, mode: 'replace' } as const)
          : ({ name: 'sidebar', slotProps: { items: ['one'] }, mode: 'replace' } as const),
      );
      constructor() {
        useKeyboard((key) => {
          if (key.name === 'tab') {
            this.slotName.update((current) => (current === 'statusbar' ? 'sidebar' : 'statusbar'));
          }
        });
      }
    }
    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'status-plugin',
          slots: {
            statusbar: (() => {
              @Component({
                selector: 'status',
                template: `<text>status-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class StatusPluginComponent {}
              let componentRef: ComponentRef<StatusPluginComponent>;
              return () => {
                componentRef ??= createComponent(StatusPluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        slotRegistry.register({
          id: 'sidebar-plugin',
          slots: {
            sidebar: (() => {
              @Component({
                selector: 'sidebar',
                template: `<text>sidebar-plugin</text>`,
                schemas: [NO_ERRORS_SCHEMA],
              })
              class SidebarPluginComponent {}
              let componentRef: ComponentRef<SidebarPluginComponent>;
              return () => {
                componentRef ??= createComponent(SidebarPluginComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        return { Component: DynamicNameHarness, inputs: { registry: slotRegistry } };
      },
      { width: 60, height: 8 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const initialFrame = testSetup.captureCharFrame();
    expect(initialFrame).toContain('status-plugin');
    expect(initialFrame).not.toContain('sidebar-plugin');
    testSetup.renderer.keyInput.emit('keypress', { name: 'tab' } as any);
    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();
    const switchedFrame = testSetup.captureCharFrame();
    expect(switchedFrame).toContain('sidebar-plugin');
    expect(switchedFrame).not.toContain('status-plugin');
    expect(switchedFrame).not.toContain('dynamic-name-fallback');
  });

  it('renders plugin nodes within provider context', async () => {
    const ValueContext = new InjectionToken('ValueContext');
    @Component({
      selector: 'context-reader',
      template: `<text>ctx:{{ ctxValue }}</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ContextReaderComponent {
      ctxValue = inject(ValueContext);
    }
    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'context-plugin',
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<ContextReaderComponent>;
              return () => {
                componentRef ??= createComponent(ContextReaderComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                  elementInjector: Injector.create({
                    providers: [
                      {
                        provide: ValueContext,
                        useValue: 'inside-provider',
                      },
                    ],
                    parent: inject(Injector),
                  }),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'max' }"
          ></ngx-slot>`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 60, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain('ctx:inside-provider');
  });

  it('keeps plugin identity stable when append order changes', async () => {
    const mountLog: string[] = [];

    @Component({
      selector: 'stateful-plugin-node',
      template: `<text>{{ pluginId() }}:{{ createdBy() }}</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class StatefulPluginNodeComponent {
      pluginId = input.required<string>();
      createdBy = computed(() => this.pluginId());

      ngOnInit(): void {
        mountLog.push(`ngOnInit:${this.pluginId()}:${this.createdBy()}`);
      }
      ngOnDestroy(): void {
        mountLog.push(`ngOnDestroy:${this.pluginId()}:${this.createdBy()}`);
      }
    }

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'alpha',
          order: 0,
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<StatefulPluginNodeComponent>;
              return () => {
                componentRef ??= createComponent(StatefulPluginNodeComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                componentRef.setInput('pluginId', 'alpha');
                return componentRef;
              };
            })(),
          },
        });

        slotRegistry.register({
          id: 'beta',
          order: 10,
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<StatefulPluginNodeComponent>;
              return () => {
                componentRef ??= createComponent(StatefulPluginNodeComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                componentRef.setInput('pluginId', 'beta');
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
          ></ngx-slot>`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const beforeReorder = testSetup.captureCharFrame();

    expect(beforeReorder).toContain('alpha:alpha');
    expect(beforeReorder).toContain('beta:beta');

    registry.updateOrder('beta', -1);
    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();
    const afterReorder = testSetup.captureCharFrame();

    expect(afterReorder).toContain('beta:beta');
    expect(afterReorder).toContain('alpha:alpha');
    expect(afterReorder).not.toContain('beta:alpha');
    expect(afterReorder).not.toContain('alpha:beta');
    expect(mountLog).toEqual(['ngOnInit:alpha:alpha', 'ngOnInit:beta:beta']);
  });

  it('captures plugin render invocation errors and reports plugin metadata', async () => {
    const errors: string[] = [];

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.onPluginError((event) => {
          errors.push(
            `${event.pluginId}:${event.slot}:${event.phase}:${event.source}:${event.error.message}`,
          );
        });

        slotRegistry.register({
          id: 'broken-plugin',
          slots: {
            statusbar: (() => () => {
              throw new Error('render failed');
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            ><text>fallback-visible</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 70, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('fallback-visible');
    expect(errors).toEqual(['broken-plugin:statusbar:render:angular:render failed']);
  });

  it('replace mode falls back when plugin fails and no placeholder is configured', async () => {
    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'broken-plugin',
          slots: {
            statusbar: (() => () => {
              throw new Error('render failed');
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            mode="replace"
            ><text>replace-fallback-visible</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 70, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('replace-fallback-visible');
  });

  it('replace mode falls back when plugin subtree crashes and no placeholder is configured', async () => {
    const errors: string[] = [];

    @Component({
      selector: 'exploding-plugin-node',
      template: `<text>should-not-render</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ExplodingPluginNodeComponent {
      constructor() {
        throw new Error('replace subtree exploded');
      }
    }

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.onPluginError((event) => {
          errors.push(
            `${event.pluginId}:${event.slot}:${event.phase}:${event.source}:${event.error.message}`,
          );
        });

        slotRegistry.register({
          id: 'replace-exploding-plugin',
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<ExplodingPluginNodeComponent>;
              return () => {
                componentRef ??= createComponent(ExplodingPluginNodeComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            mode="replace"
            ><text>replace-safe-fallback</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('replace-safe-fallback');
    expect(errors).toContain(
      'replace-exploding-plugin:statusbar:render:angular:replace subtree exploded',
    );
  });

  it('reports error_placeholder and keeps fallback when placeholder throws after plugin render error', async () => {
    const errors: string[] = [];

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.onPluginError((event) => {
          errors.push(
            `${event.pluginId}:${event.slot}:${event.phase}:${event.source}:${event.error.message}`,
          );
        });

        slotRegistry.register({
          id: 'broken-plugin',
          slots: {
            statusbar: (() => () => {
              throw new Error('render failed');
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            [pluginFailurePlaceholder]="pluginFailurePlaceholder"
            ><text>fallback-visible</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
          pluginFailurePlaceholder = () => {
            throw new Error('placeholder failed');
          };
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('fallback-visible');
    expect(errors).toContain('broken-plugin:statusbar:render:angular:render failed');
    expect(errors).toContain(
      'broken-plugin:statusbar:error_placeholder:angular:placeholder failed',
    );
  });

  it('reports error_placeholder and keeps fallback when placeholder throws after subtree crash', async () => {
    const errors: string[] = [];

    @Component({
      selector: 'exploding-plugin-node-crash',
      template: `<text>should-not-render</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ExplodingPluginNodeCrashComponent {
      constructor() {
        throw new Error('component exploded');
      }
    }

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.onPluginError((event) => {
          errors.push(
            `${event.pluginId}:${event.slot}:${event.phase}:${event.source}:${event.error.message}`,
          );
        });

        slotRegistry.register({
          id: 'exploding-plugin',
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<ExplodingPluginNodeCrashComponent>;
              return () => {
                componentRef ??= createComponent(ExplodingPluginNodeCrashComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            [pluginFailurePlaceholder]="pluginFailurePlaceholder"
            ><text>safe-host-content</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
          pluginFailurePlaceholder(): any {
            throw new Error('placeholder crashed');
          }
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('safe-host-content');
    expect(errors).toContain('exploding-plugin:statusbar:render:angular:component exploded');
    expect(errors).toContain(
      'exploding-plugin:statusbar:error_placeholder:angular:placeholder crashed',
    );
  });

  it('catches plugin subtree errors via per-plugin boundary', async () => {
    const errors: string[] = [];

    @Component({
      selector: 'exploding-component-plugin',
      template: `<text>should-not-render</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ExplodingComponentPluginNodeComponent {
      constructor() {
        throw new Error('component exploded');
      }
    }

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.onPluginError((event) => {
          errors.push(`${event.pluginId}:${event.slot}:${event.phase}:${event.error.message}`);
        });

        slotRegistry.register({
          id: 'exploding-component-plugin',
          slots: {
            statusbar: (() => {
              let componentRef: ComponentRef<ExplodingComponentPluginNodeComponent>;
              return () => {
                componentRef ??= createComponent(ExplodingComponentPluginNodeComponent, {
                  environmentInjector: inject(EnvironmentInjector),
                });
                return componentRef;
              };
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `<ngx-slot
            [registry]="registry()"
            name="statusbar"
            [slotProps]="{ user: 'sam' }"
            ><text>safe-host-content</text></ngx-slot
          >`,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('safe-host-content');
    expect(errors).toEqual(['exploding-component-plugin:statusbar:render:component exploded']);
  });

  it('renders optional plugin failure placeholder when configured', async () => {
    @Component({
      selector: 'placeholder-text',
      template: `<text>plugin-error:{{ failure().pluginId }}:{{ failure().slot }}</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class PlaceholderTextComponent {
      failure = input.required<PluginErrorEvent>();
    }

    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => {
        slotRegistry.register({
          id: 'broken-plugin',
          slots: {
            statusbar: (() => () => {
              throw new Error('render failed');
            })(),
          },
        });

        @Component({
          selector: 'test-slot',
          template: `
            <ngx-slot
              [registry]="registry()"
              name="statusbar"
              [slotProps]="{ user: 'sam' }"
              [pluginFailurePlaceholder]="pluginFailurePlaceholder"
            >
              <text>fallback-visible</text>
            </ngx-slot>
          `,
          schemas: [NO_ERRORS_SCHEMA],
          imports: [Slot],
        })
        class SlotComponent {
          registry = input.required<SlotRegistry<any, any, any>>();
          pluginFailurePlaceholder = (failure: PluginErrorEvent) => {
            const ref = createComponent(PlaceholderTextComponent, {
              environmentInjector: inject(EnvironmentInjector),
            });
            ref.setInput('failure', failure);
            return ref;
          };
        }
        return { Component: SlotComponent, inputs: { registry: slotRegistry } };
      },
      { width: 80, height: 6 },
    );
    testSetup = setup;

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('fallback-visible');
    expect(frame).toContain('plugin-error:broken-plugin:statusbar');
  });

  it('does not continuously emit plugin errors after pressing e then d', async () => {
    const debugEvents: string[] = [];
    let pluginErrorEventCount = 0;
    let listenerStateUpdates = 0;
    const maxListenerStateUpdates = 20;
    @Component({
      selector: 'clock-ok',
      template: `<text>clock-ok</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ClockOkComponent {}
    @Component({
      selector: 'clock-sidebar-ok',
      template: `<text>clock-sidebar-ok</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ClockSidebarOkComponent {}
    function createClockPlugin(crash: boolean): AngularPlugin<AppSlots, typeof hostContext> {
      return {
        id: 'clock-plugin',
        order: 0,
        slots: {
          statusbar: (() => {
            let componentRef: ComponentRef<any>;

            return () => {
              if (crash) {
                throw new Error('Forced subtree crash in clock-plugin');
              }
              componentRef ??= createComponent(ClockOkComponent, {
                environmentInjector: inject(EnvironmentInjector),
              });
              return componentRef;
            };
          })(),
          sidebar: (() => {
            let componentRef: ComponentRef<any>;

            return () => {
              componentRef ??= createComponent(ClockSidebarOkComponent, {
                environmentInjector: inject(EnvironmentInjector),
              });
              return componentRef;
            };
          })(),
        },
      };
    }
    @Component({
      selector: 'activity-ok',
      template: `<text>activity-ok</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ActivityOkComponent {}
    function createActivityPlugin(crash: boolean): AngularPlugin<AppSlots, typeof hostContext> {
      return {
        id: 'activity-plugin',
        order: 10,
        slots: {
          statusbar: (() => {
            let componentRef: ComponentRef<ActivityOkComponent>;
            return () => {
              if (crash) {
                throw new Error('Forced activity render failure');
              }
              componentRef ??= createComponent(ActivityOkComponent, {
                environmentInjector: inject(EnvironmentInjector),
              });
              return componentRef;
            };
          })(),
        },
      };
    }

    @Component({
      selector: 'placeholder-text-error',
      template: `<text>placeholder:{{ failure().pluginId }}:{{ failure().phase }}</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class PlaceholderTextErrorComponent {
      failure = input.required<PluginErrorEvent>();
    }

    @Component({
      selector: 'test-slot',
      template: `
        <ngx-slot
          [registry]="registry()"
          name="statusbar"
          [slotProps]="{ user: 'sam' }"
          mode="append"
        >
          <text>fallback-statusbar</text>
        </ngx-slot>
        <ngx-slot
          [registry]="registry()"
          name="sidebar"
          [slotProps]="{ items: ['x'] }"
          mode="replace"
        >
          <text>fallback-sidebar</text>
        </ngx-slot>
        <text>errors:{{ errorLines().length }}</text>
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Slot],
    })
    class ErrorSequenceHarness {
      registry = input.required<SlotRegistry<any, any, any>>();
      clockCrashEnabled = signal(false);
      activityCrashEnabled = signal(false);
      errorLines = signal<string[]>([]);
      pluginFailurePlaceholder = (failure: PluginErrorEvent) => {
        const ref = createComponent(PlaceholderTextErrorComponent, {
          environmentInjector: inject(EnvironmentInjector),
        });
        ref.setInput('failure', failure);
        return ref;
      };
      constructor() {
        effect((onCleanup) => {
          const registry = this.registry();
          untracked(() => {
            const ref = registry.onPluginError((event) => {
              pluginErrorEventCount++;
              const line = `${event.pluginId}:${event.phase}:${event.source}:${event.error.message}`;

              if (debugEvents.length < 40) {
                debugEvents.push(`event#${pluginErrorEventCount} ${line}`);
              }

              if (listenerStateUpdates < maxListenerStateUpdates) {
                listenerStateUpdates++;
                this.errorLines.update((current) => [line, ...current].slice(0, 6));
              }
            });
            onCleanup(() => {
              ref();
            });
          });
        });
        effect((onCleanup) => {
          const registry = this.registry();
          const clockCrashEnabled = this.clockCrashEnabled();
          const activityCrashEnabled = this.activityCrashEnabled();
          const unregisterCallbacks: Array<() => void> = [];

          unregisterCallbacks.push(registry.register(createClockPlugin(clockCrashEnabled)));
          unregisterCallbacks.push(registry.register(createActivityPlugin(activityCrashEnabled)));
          onCleanup(() => {
            for (const unregister of unregisterCallbacks.reverse()) {
              unregister();
            }
          });
        });

        useKeyboard((key) => {
          if (key.name === 'e') {
            this.clockCrashEnabled.update((current) => !current);
            return;
          }

          if (key.name === 'd') {
            this.activityCrashEnabled.update((current) => !current);
          }
        });
      }
    }
    const { setup, registry, fixture } = await setupSlotTest(
      (slotRegistry) => ({ Component: ErrorSequenceHarness, inputs: { registry: slotRegistry } }),
      { width: 80, height: 10 },
    );
    testSetup = setup;

    await testSetup.renderOnce();

    testSetup.renderer.keyInput.emit('keypress', { name: 'e' } as any);

    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();

    testSetup.renderer.keyInput.emit('keypress', { name: 'd' } as any);
    await fixture.whenStable();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await testSetup.renderOnce();

    for (let index = 0; index < 5; index++) {
      await testSetup.renderOnce();
    }

    const frame = testSetup.captureCharFrame();
    if (pluginErrorEventCount > 4 || listenerStateUpdates > 4) {
      console.log('[angular-slot-debug] frame after e,d:\n' + frame);
      console.log('[angular-slot-debug] plugin error events:', pluginErrorEventCount);
      console.log('[angular-slot-debug] listener state updates:', listenerStateUpdates);
      console.log('[angular-slot-debug] sample events:\n' + debugEvents.join('\n'));
    }

    expect(pluginErrorEventCount).toBeLessThanOrEqual(4);
    expect(listenerStateUpdates).toBeLessThanOrEqual(4);
  });
});
