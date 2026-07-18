import { inject, Signal, computed, effect, InjectionToken, signal, untracked } from '@angular/core';
import type { KeyEvent, Renderable } from '@opentui/core';
import { ActiveKeyOptions, Keymap, ReactiveMatcher } from '@opentui/keymap';
import { SignalOrValue, toValue } from '@cyia/opentui-angular';

type OpenTuiKeymap = Keymap<Renderable, KeyEvent>;

export const KEYMAP_TOKEN = new InjectionToken<Signal<OpenTuiKeymap>>('KEYMAP_TOKEN');

export function useKeymap() {
  const keymap = inject(KEYMAP_TOKEN, { optional: true });

  if (!keymap) {
    throw new Error('Keymap not found. Wrap the tree in <KeymapProvider>.');
  }

  return keymap;
}
function useKeymapStateVersion(keymapInput: SignalOrValue<OpenTuiKeymap>): Signal<number> {
  const versionSignal = signal(0);

  effect((onCleanup) => {
    const keymap = toValue(keymapInput);
    untracked(() => {
      const dispose = keymap.on('state', () => {
        versionSignal.update((v) => v + 1);
      });
      onCleanup(dispose);
    });
  });

  return versionSignal.asReadonly();
}

export function useActiveKeys(options?: SignalOrValue<ActiveKeyOptions>) {
  const keymap = useKeymap();
  const version = useKeymapStateVersion(keymap);

  return computed(() => {
    void version();
    return keymap().getActiveKeys(toValue(options));
  });
}

export function usePendingSequence() {
  const keymap = useKeymap();
  const version = useKeymapStateVersion(keymap);

  return computed(() => {
    void version();
    return keymap().getPendingSequence();
  });
}

export function reactiveMatcherFromStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  predicate?: (value: T) => boolean,
): ReactiveMatcher {
  return {
    get() {
      return predicate ? predicate(getSnapshot()) : Boolean(getSnapshot());
    },
    subscribe(onChange) {
      return subscribe(onChange);
    },
  };
}
