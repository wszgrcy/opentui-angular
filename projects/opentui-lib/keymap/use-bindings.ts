import { computed, DestroyRef, inject, afterEveryRender } from '@angular/core';
import type { KeyEvent, Renderable } from '@opentui/core';
import { useKeymap } from './use-keymap';
import {
  KEYMAP_EXTENSION_CONTEXT,
  type KeymapExtensionContext,
  type Keymap,
  type Layer,
  type TargetMode,
} from '@opentui/keymap';

type OpenTuiKeymap = Keymap<Renderable, KeyEvent>;
type OpenTuiLayer = Layer<Renderable, KeyEvent>;
type LayerSlots = KeymapExtensionContext<Renderable, KeyEvent>['layers'];
type ReplaceLayer = (layer: OpenTuiLayer | undefined) => void;

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

/**
 * Holds one registration in the keymap at the mount order of this call, so replacing a layer in place keeps its
 * precedence instead of jumping ahead of every layer mounted later.
 */
export function createLayerSlot(keymap: OpenTuiKeymap): ReplaceLayer {
  const layers: LayerSlots = keymap[KEYMAP_EXTENSION_CONTEXT]().layers;
  const slot = layers.createSlot();
  return (layer) => {
    layers.replaceLayer(slot, layer);
  };
}

export function useBindings<TRenderable extends Renderable = Renderable>(
  createLayer: () => UseBindingsLayer<TRenderable>,
): void {
  const keymap = useKeymap();
  const layer = computed(createLayer);
  let keymapRef: OpenTuiKeymap | undefined;
  let replaceLayerRef: ReplaceLayer | undefined;
  let registeredRef:
    | { layer: UseBindingsLayer<TRenderable>; targetMode?: TargetMode; target?: Renderable }
    | undefined;

  const unregister = () => {
    replaceLayerRef?.(undefined);
    keymapRef = undefined;
    replaceLayerRef = undefined;
    registeredRef = undefined;
  };

  afterEveryRender(() => {
    const currentKeymap = keymap();
    if (currentKeymap !== keymapRef) {
      unregister();
      keymapRef = currentKeymap;
      replaceLayerRef = createLayerSlot(currentKeymap);
    }

    const currentLayer = layer();
    const hasExplicitTarget = currentLayer.targetRef !== undefined;
    const explicitTarget = resolveBindingsTarget(currentLayer.targetRef);
    const targetMode = currentLayer.targetMode ?? (hasExplicitTarget ? 'focus-within' : undefined);
    const target = targetMode ? explicitTarget : undefined;

    if (!hasExplicitTarget && targetMode) {
      throw new Error('useBindings local bindings need a targetRef');
    }

    if (
      registeredRef?.layer === currentLayer &&
      registeredRef.targetMode === targetMode &&
      registeredRef.target === target
    ) {
      return;
    }

    registeredRef = { layer: currentLayer, targetMode, target };
    const { targetRef: _targetRef, targetMode: _targetMode, ...baseLayer } = currentLayer;
    replaceLayerRef!(targetMode ? target && { ...baseLayer, target, targetMode } : baseLayer);
  });

  inject(DestroyRef).onDestroy(unregister);
}
