import { effect } from '@angular/core';
import type { Selection } from '@opentui/core';
import { useRenderer } from './use-renderer';
import { SignalOrValue, toValue } from '../utils/to-value';

export function useSelectionHandler(handler: SignalOrValue<(selection: Selection) => void>): void {
  const renderer$ = useRenderer();

  effect((onCleanup) => {
    const renderer = renderer$();
    const fn = toValue(handler);
    renderer.on('selection', fn);

    onCleanup(() => {
      renderer.off('selection', fn);
    });
  });
}
