import { Component, inject, NO_ERRORS_SCHEMA, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui';
import { testRender } from './util/test-render';
import { initTestEnv } from './util/init-env';
import { CliRendererToken } from '../token/cli-render.token';
import { KEYMAP_TOKEN, useBindings } from '../keymap';

describe('keymap-use-bindings', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  function provideKeymap() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: KEYMAP_TOKEN,
          useFactory: () => signal(createDefaultOpenTuiKeymap(inject(CliRendererToken))),
        },
      ],
    });
  }

  it('routes a key to the layer mounted last', async () => {
    const hits: string[] = [];

    @Component({
      selector: 'first-layer',
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class FirstLayer {
      constructor() {
        useBindings(() => ({
          bindings: [{ key: 'x', cmd: () => hits.push('first') }],
        }));
      }
    }

    @Component({
      selector: 'second-layer',
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class SecondLayer {
      constructor() {
        useBindings(() => ({
          bindings: [{ key: 'x', cmd: () => hits.push('second') }],
        }));
      }
    }

    @Component({
      template: `<first-layer></first-layer><second-layer></second-layer>`,
      imports: [FirstLayer, SecondLayer],
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Host {}

    provideKeymap();
    const { testSetup, fixture } = await testRender(Host, { width: 20, height: 5 });

    testSetup.renderer.stdin.emit('data', Buffer.from('x'));
    await new Promise((res) => setTimeout(res, 50));
    await fixture.whenStable();

    expect(hits).deep.eq(['second']);
  });

  it('keeps a changed layer in its mount position', async () => {
    const hits: string[] = [];

    @Component({
      selector: 'first-layer',
      template: `<box [height]="extra() ? 2 : 1"></box>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class FirstLayer {
      extra = signal(false);

      constructor() {
        useBindings(() => ({
          bindings: [
            { key: 'x', cmd: () => hits.push('first') },
            ...(this.extra() ? [{ key: 'z', cmd: () => hits.push('first-z') }] : []),
          ],
        }));
      }
    }

    @Component({
      selector: 'second-layer',
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class SecondLayer {
      constructor() {
        useBindings(() => ({
          bindings: [{ key: 'x', cmd: () => hits.push('second') }],
        }));
      }
    }

    @Component({
      template: `<first-layer #first></first-layer><second-layer></second-layer>`,
      imports: [FirstLayer, SecondLayer],
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Host {
      first = viewChild.required<FirstLayer>('first');
    }

    provideKeymap();
    const { testSetup, fixture } = await testRender(Host, { width: 20, height: 5 });

    const press = async (key: string) => {
      testSetup.renderer.stdin.emit('data', Buffer.from(key));
      await new Promise((res) => setTimeout(res, 20));
      await fixture.whenStable();
    };

    await press('x');
    expect(hits).deep.eq(['second']);

    hits.length = 0;
    fixture.componentInstance.first().extra.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    await press('z');
    expect(hits).deep.eq(['first-z']);

    hits.length = 0;
    // Replacing `first` in place must not lift it over `second`, which mounted after it.
    await press('x');
    expect(hits).deep.eq(['second']);
  });

  it('drops the layer when the component is destroyed', async () => {
    const hits: string[] = [];

    @Component({
      selector: 'scoped-layer',
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class ScopedLayer {
      constructor() {
        useBindings(() => ({
          bindings: [{ key: 'x', cmd: () => hits.push('scoped') }],
        }));
      }
    }

    @Component({
      template: `@if (open()) {
        <scoped-layer></scoped-layer>
      }`,
      imports: [ScopedLayer],
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Host {
      open = signal(true);
    }

    provideKeymap();
    const { testSetup, fixture } = await testRender(Host, { width: 20, height: 5 });

    testSetup.renderer.stdin.emit('data', Buffer.from('x'));
    await fixture.whenStable();
    expect(hits).deep.eq(['scoped']);

    hits.length = 0;
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    testSetup.renderer.stdin.emit('data', Buffer.from('x'));
    await fixture.whenStable();
    expect(hits).deep.eq([]);
  });
});
