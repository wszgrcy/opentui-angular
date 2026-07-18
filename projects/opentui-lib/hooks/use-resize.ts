import { effect, Signal } from '@angular/core';
import { useRenderer } from './use-renderer';
import { SignalOrValue, toValue } from '../utils/to-value';

export function useOnResize(callback: SignalOrValue<(width: number, height: number) => void>) {
  const renderer$ = useRenderer();

  effect((onCleanup) => {
    const renderer = renderer$();
    const fn = toValue(callback);
    renderer.on('resize', fn);

    onCleanup(() => {
      renderer.off('resize', fn);
    });
  });

  return renderer$;
}
