import { computed, Signal } from '@angular/core';
import { CliRenderer } from '@opentui/core';
import { useAppContext } from '../contexts/app.context';

export function useRenderer() {
  const appCtx = useAppContext();

  return computed(() => {
    const renderer = appCtx.renderer;

    if (!renderer) {
      throw new Error('Renderer not found.');
    }

    return renderer;
  });
}
