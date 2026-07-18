import { effect } from '@angular/core';
import type { KeyEvent } from '@opentui/core';
import { useAppContext } from '../contexts/app.context';
import { SignalOrValue, toValue } from '../utils/to-value';

export interface UseKeyboardOptions {
  /** Include release events - callback receives events with eventType: "release" */
  release?: boolean;
}

export function useKeyboard(
  handler: SignalOrValue<(key: KeyEvent) => void>,
  options: SignalOrValue<UseKeyboardOptions> = { release: false },
): void {
  const appCtx = useAppContext();

  effect((onCleanup) => {
    const keyHandler = appCtx.keyHandler;
    const fn = toValue(handler);
    const opts = toValue(options);

    keyHandler?.on('keypress', fn);

    if (opts?.release) {
      keyHandler?.on('keyrelease', fn);
    }

    onCleanup(() => {
      keyHandler?.off('keypress', fn);
      if (opts?.release) {
        keyHandler?.off('keyrelease', fn);
      }
    });
  });
}
