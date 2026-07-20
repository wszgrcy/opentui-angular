import { computed, DestroyRef, inject, afterEveryRender } from '@angular/core';
import type { KeyEvent, Renderable } from '@opentui/core';
import { useKeymap } from './use-keymap';
import { Layer, TargetMode } from '@opentui/keymap';

export interface UseBindingsLayer<TRenderable extends Renderable = Renderable> extends Omit<
  Layer<Renderable, KeyEvent>,
  'target' | 'targetMode'
> {
  /** Reference to the target renderable */
  targetRef?: TRenderable;
  /** How the target is resolved for matching */
  targetMode?: TargetMode;
}

/**
 * Resolve a bindings layer's target from its ref.
 */
function resolveBindingsTarget<TRenderable extends Renderable = Renderable>(
  targetRef: TRenderable | undefined,
): Renderable | undefined {
  return targetRef ?? undefined;
}

export function useBindings<TRenderable extends Renderable = Renderable>(
  createLayer: () => UseBindingsLayer<TRenderable>,
): void {
  const keymap = useKeymap();
  const layer = computed(createLayer);
  const layerRef = layer;
  let disposeRef: (() => void) | undefined;
  let registeredLayerRef: UseBindingsLayer<TRenderable> | undefined;
  let registeredTargetModeRef: TargetMode | undefined;
  let registeredTargetRef: Renderable | undefined;
  const unregister = () => {
    disposeRef?.();
    disposeRef = undefined;
    registeredLayerRef = undefined;
    registeredTargetModeRef = undefined;
    registeredTargetRef = undefined;
  };
  afterEveryRender(() => {
    const currentLayer = layerRef();
    const hasExplicitTarget = currentLayer.targetRef !== undefined;
    const explicitTarget = resolveBindingsTarget(currentLayer.targetRef);
    const nextTargetMode =
      currentLayer.targetMode ?? (hasExplicitTarget ? 'focus-within' : undefined);
    const nextTarget = nextTargetMode ? explicitTarget : undefined;

    if (!hasExplicitTarget && nextTargetMode) {
      throw new Error('useBindings local bindings need a targetRef');
    }

    if (
      registeredLayerRef === currentLayer &&
      registeredTargetModeRef === nextTargetMode &&
      registeredTargetRef === nextTarget
    ) {
      return;
    }

    unregister();

    if (!nextTarget && nextTargetMode) {
      registeredLayerRef = currentLayer;
      registeredTargetModeRef = nextTargetMode;
      registeredTargetRef = undefined;
      return;
    }

    const { targetRef: _targetRef, targetMode: _targetMode, ...baseLayer } = currentLayer;
    disposeRef = keymap().registerLayer(
      !nextTargetMode
        ? {
            ...baseLayer,
          }
        : {
            ...baseLayer,
            target: nextTarget!,
            targetMode: nextTargetMode,
          },
    );
    registeredLayerRef = currentLayer;
    registeredTargetModeRef = nextTargetMode;
    registeredTargetRef = nextTarget;
  });

  inject(DestroyRef).onDestroy(() => {
    disposeRef?.();
    disposeRef = undefined;
  });
}
