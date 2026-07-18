import { Component, NO_ERRORS_SCHEMA, DestroyRef, effect, inject, signal } from '@angular/core';
import { useKeyboard } from '@cyia/opentui-angular';
import { interval } from 'rxjs';

@Component({
  selector: 'app-opacity',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class OpacityComponent {
  protected readonly destroyRef = inject(DestroyRef);

  protected animating = signal(false);
  protected opacities = signal([1.0, 0.8, 0.5, 0.3]);
  protected phase = signal(0);

  protected readonly colors = ['#e94560', '#0f3460', '#533483', '#16a085'];

  constructor() {
    useKeyboard((key) => {
      if (key.name === 'a' && !key.ctrl && !key.meta) {
        this.animating.set(!this.animating());
      } else if (key.name === '1') {
        this.opacities.update((prev) => [prev[0] === 1.0 ? 0.3 : 1.0, prev[1], prev[2], prev[3]]);
      } else if (key.name === '2') {
        this.opacities.update((prev) => [prev[0], prev[1] === 1.0 ? 0.3 : 1.0, prev[2], prev[3]]);
      } else if (key.name === '3') {
        this.opacities.update((prev) => [prev[0], prev[1], prev[2] === 1.0 ? 0.3 : 1.0, prev[3]]);
      } else if (key.name === '4') {
        this.opacities.update((prev) => [prev[0], prev[1], prev[2], prev[3] === 1.0 ? 0.3 : 1.0]);
      }
    });

    // Animation effect using RxJS interval
    effect((onCleanup) => {
      if (!this.animating()) return;

      const sub = interval(50).subscribe(() => {
        this.phase.update((p) => p + 0.05);
      });
      onCleanup(() => {
        sub.unsubscribe();
      });
    });

    // Update opacities based on phase when animating
    effect(() => {
      if (!this.animating()) return;

      const phaseVal = this.phase();
      this.opacities.set([
        0.3 + 0.7 * Math.abs(Math.sin(phaseVal)),
        0.3 + 0.7 * Math.abs(Math.sin(phaseVal + 0.5)),
        0.3 + 0.7 * Math.abs(Math.sin(phaseVal + 1.0)),
        0.3 + 0.7 * Math.abs(Math.sin(phaseVal + 1.5)),
      ]);
    });
  }
}
