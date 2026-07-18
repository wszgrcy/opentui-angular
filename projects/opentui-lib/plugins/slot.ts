import {
  createSlotRegistry as createCoreSlotRegistry,
  PluginErrorEvent,
  SlotRegistry,
  type CliRenderer,
  type Plugin,
  type PluginContext,
  type ResolvedSlotRenderer,
  type SlotMode,
  type SlotRegistryOptions,
} from '@opentui/core';
import {
  afterNextRender,
  Component,
  ComponentRef,
  computed,
  contentChild,
  effect,
  inject,
  Injector,
  input,
  runInInjectionContext,
  signal,
  TemplateRef,
  viewChildren,
} from '@angular/core';
import { ComponentRefDirective } from './container-ref.directive';
import { PurePipe } from './pure.pipe';
import { NgTemplateOutlet } from '@angular/common';
import { RefDetachDirective } from './ref-detach.directive';

type SlotMap = Record<string, object>;

function renderPluginFailurePlaceholder(
  registry: SlotRegistry<ComponentRef<any>, any, any>,
  pluginFailurePlaceholder: ((failure: PluginErrorEvent) => ComponentRef<any>) | undefined,
  failure: PluginErrorEvent,
  pluginId: string,
  slot: string,
): ComponentRef<any> | undefined {
  if (!pluginFailurePlaceholder) {
    return undefined;
  }

  try {
    return pluginFailurePlaceholder(failure);
  } catch (error) {
    registry.reportPluginError({
      pluginId,
      slot,
      phase: 'error_placeholder',
      source: 'angular',
      error,
    });

    return undefined;
  }
}

export type AngularPlugin<
  TSlots extends SlotMap,
  TContext extends PluginContext = PluginContext,
> = Plugin<any, TSlots, TContext>;

export function createAngularSlotRegistry<
  TSlots extends SlotMap,
  TContext extends PluginContext = PluginContext,
>(
  renderer: CliRenderer,
  context: TContext,
  options: SlotRegistryOptions = {},
): SlotRegistry<any, TSlots, TContext> {
  return createCoreSlotRegistry<any, TSlots, TContext>(
    renderer,
    'angular:slot-registry',
    context,
    options,
  );
}

@Component({
  selector: 'ngx-slot',
  templateUrl: './slot.html',
  imports: [ComponentRefDirective, PurePipe, NgTemplateOutlet, RefDetachDirective],
})
export class Slot<
  TSlots extends SlotMap,
  K extends keyof TSlots,
  TContext extends PluginContext = PluginContext,
> {
  cmpRefList = viewChildren<ComponentRefDirective>('cmpRef');
  registry = input.required<SlotRegistry<any, TSlots, TContext>>();
  name = input.required<K>();
  mode = input<SlotMode>();
  pluginFailurePlaceholder = input<(failure: PluginErrorEvent) => ComponentRef<any>>();
  contentChildTemplate = contentChild(TemplateRef);

  version = signal(0);
  entries = computed(() => {
    this.version();
    return this.registry().resolveEntries(this.name());
  });
  slotName = computed(() => String(this.name()));
  renderType = computed(() => {
    if (this.entries().length === 0) {
      return 0;
    } else {
      const mode = this.mode();
      switch (mode) {
        case 'single_winner': {
          return 1;
        }
        case 'replace': {
          return 2;
        }
        default: {
          return 3;
        }
      }
    }
  });
  slotProps = input<any>();
  renderFailuresByPluginRef = new Map<string, PluginErrorEvent>();
  pendingRenderReportsRef = new Map<string, { pluginId: string; slot: string; error: Error }>();
  constructor() {
    effect(() => {
      this.registry().subscribe(() => {
        this.version.update((current) => current + 1);
      });
    });
    afterNextRender(() => {
      if (this.pendingRenderReportsRef.size === 0) {
        return;
      }

      const pendingReports = [...this.pendingRenderReportsRef.values()];
      this.pendingRenderReportsRef.clear();

      for (const report of pendingReports) {
        const failure = this.registry().reportPluginError({
          pluginId: report.pluginId,
          slot: report.slot,
          phase: 'render',
          source: 'angular',
          error: report.error,
        });

        this.renderFailuresByPluginRef.set(`${report.slot}:${report.pluginId}:render`, failure);
      }
    });
  }

  #injector = inject(Injector);

  renderEntry = (
    entry: ResolvedSlotRenderer<ComponentRef<any>, TSlots[K], TContext>,
    fallbackOnFailure?: any,
  ): any => {
    const failureKey = `${this.slotName()}:${entry.id}:render`;

    try {
      const rendered = runInInjectionContext(this.#injector, () =>
        entry.renderer(this.registry().context, this.slotProps()),
      );
      return rendered;
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : typeof error === 'string'
            ? new Error(error)
            : new Error(String(error));
      const lastFailure = this.renderFailuresByPluginRef.get(failureKey);
      const isSameFailure = lastFailure && lastFailure.error.message === normalizedError.message;
      if (!isSameFailure) {
        const queued = this.pendingRenderReportsRef.get(failureKey);
        if (!queued || queued.error.message !== normalizedError.message) {
          this.pendingRenderReportsRef.set(failureKey, {
            pluginId: entry.id,
            slot: this.slotName(),
            error: normalizedError,
          });
        }
      }
      const failure: PluginErrorEvent =
        isSameFailure && lastFailure
          ? lastFailure
          : {
              pluginId: entry.id,
              slot: this.slotName(),
              phase: 'render',
              source: 'angular',
              error: normalizedError,
              timestamp: Date.now(),
            };
      this.renderFailuresByPluginRef.set(failureKey, failure);
      const placeholder = runInInjectionContext(this.#injector, () =>
        renderPluginFailurePlaceholder(
          this.registry(),
          this.pluginFailurePlaceholder(),
          failure,
          entry.id,
          this.slotName(),
        ),
      );
      return placeholder;
    }
  };
  entryList = (list: ResolvedSlotRenderer<any, TSlots[K], TContext>[]) =>
    list.map((item) => this.renderEntry(item)).filter(Boolean);
}
