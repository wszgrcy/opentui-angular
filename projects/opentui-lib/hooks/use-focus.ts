import { effect } from '@angular/core';
import { useRenderer } from './use-renderer';
import { SignalOrValue, toValue } from '../utils/to-value';

export function useFocus(handler: SignalOrValue<() => void>): void {
  const renderer$ = useRenderer();

  effect((onCleanup) => {
    const renderer = renderer$();
    const fn = toValue(handler);
    renderer.on('focus', fn);

    onCleanup(() => {
      renderer.off('focus', fn);
    });
  });
}
