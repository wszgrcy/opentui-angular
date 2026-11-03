import { effect } from '@angular/core';
import type { AnimationTickCallback, AnimationTickOptions } from '@opentui/core';
import { useRenderer } from './use-renderer';
import { SignalOrValue, toValue } from '../utils/to-value';

/**
 * Runs `callback` `fps` times a second on the renderer's shared animation clock; an undefined rate pauses it.
 * Pass a signal to change the rate without re-subscribing.
 */
export function useAnimationTick(
  fps: SignalOrValue<number | undefined>,
  callback: SignalOrValue<AnimationTickCallback>,
  options?: SignalOrValue<AnimationTickOptions>,
): void {
  const renderer$ = useRenderer();

  effect((onCleanup) => {
    const rate = toValue(fps);
    if (rate === undefined) {
      return;
    }

    const unsubscribe = renderer$().onAnimationTick(
      rate,
      (...args) => toValue(callback)(...args),
      toValue(options),
    );

    onCleanup(unsubscribe);
  });
}
