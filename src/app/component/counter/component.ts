import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-counter',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class CounterComponent {
  protected counter = signal(0);

  constructor() {
    interval(50)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.counter.update((a) => a + 1);
      });
  }
}
