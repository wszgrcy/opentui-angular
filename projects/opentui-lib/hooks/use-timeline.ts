import { getTimelineEngine, Timeline, type TimelineOptions } from '@opentui/core';
import { effect } from '@angular/core';
import { useRenderer } from './use-renderer';

export function useTimeline(options: TimelineOptions = {}) {
  const renderer$ = useRenderer();
  const timeline = new Timeline(options);

  effect((onCleanup) => {
    // Per-renderer engine, so several renderers in one process keep their own timelines.
    const engine = getTimelineEngine(renderer$());

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
