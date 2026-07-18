import { effect } from '@angular/core';
import type { PasteEvent } from '@opentui/core';
import { useAppContext } from '../contexts/app.context';
import { SignalOrValue, toValue } from '../utils/to-value';

export function usePaste(handler: SignalOrValue<(event: PasteEvent) => void>): void {
  const appCtx = useAppContext();

  effect((onCleanup) => {
    const ctx = appCtx;
    const keyHandler = ctx.keyHandler;
    const fn = toValue(handler);

    keyHandler?.on('paste', fn);

    onCleanup(() => {
      keyHandler?.off('paste', fn);
    });
  });
}
