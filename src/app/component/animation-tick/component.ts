import { Component, NO_ERRORS_SCHEMA, computed, signal } from '@angular/core';
import { useAnimationTick, useKeyboard } from '@cyia/opentui-angular';

const RATES = [1, 5, 15, 30, 60];

@Component({
  selector: 'app-animation-tick',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class AnimationTickComponent {
  protected readonly rates = RATES;
  protected readonly rateIndex = signal(3);
  protected readonly running = signal(true);
  protected readonly ticks = signal(0);
  protected readonly elapsed = signal(0);

  protected readonly fps = computed(() => (this.running() ? RATES[this.rateIndex()] : undefined));
  protected readonly rateLabel = computed(() => `${RATES[this.rateIndex()]} fps`);
  protected readonly bar = computed(() => '█'.repeat((this.ticks() % 40) + 1));

  constructor() {
    useAnimationTick(this.fps, (deltaTime, _ticks, time) => {
      this.ticks.update((value) => value + 1);
      this.elapsed.set(Math.round(time));
      void deltaTime;
    });

    useKeyboard((key) => {
      if (key.name === 'space') {
        this.running.update((value) => !value);
      } else if (key.name === 'up') {
        this.rateIndex.update((value) => Math.min(value + 1, RATES.length - 1));
      } else if (key.name === 'down') {
        this.rateIndex.update((value) => Math.max(value - 1, 0));
      }
    });
  }
}
