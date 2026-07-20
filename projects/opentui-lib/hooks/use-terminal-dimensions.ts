import { signal } from '@angular/core';
import { useRenderer } from './use-renderer';
import { useOnResize } from './use-resize';

interface TerminalDimensions {
  width: number;
  height: number;
}

export function useTerminalDimensions() {
  const renderer = useRenderer();

  const dimensions$ = signal<TerminalDimensions>({
    width: renderer().width,
    height: renderer().height,
  });

  const cb = (width: number, height: number) => {
    dimensions$.set({ width, height });
  };

  useOnResize(cb);

  return dimensions$;
}
