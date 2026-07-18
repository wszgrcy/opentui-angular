import { effect } from '@angular/core';

import { useRenderer } from './use-renderer';
import { SignalOrValue, toValue } from '../utils/to-value';

export function useBlur(handler: SignalOrValue<() => void>): void {
  const renderer$ = useRenderer();

  effect((onCleanup) => {
    const renderer = renderer$();
    const fn = toValue(handler);
    renderer.on('blur', fn);

    onCleanup(() => {
      renderer.off('blur', fn);
    });
  });
}
