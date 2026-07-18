import { engine, Timeline, type TimelineOptions } from '@opentui/core';
import { effect } from '@angular/core';

export function useTimeline(options: TimelineOptions = {}) {
  const timeline = new Timeline(options);

  effect((onCleanup) => {
    if (options.autoplay !== false) {
      timeline.play();
    }
    engine.register(timeline);

    onCleanup(() => {
      timeline.pause();
      engine.unregister(timeline);
    });
  });

  return timeline;
}
