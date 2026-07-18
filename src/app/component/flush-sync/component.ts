import { Component, NO_ERRORS_SCHEMA, signal, afterEveryRender } from '@angular/core';
import { useKeyboard, useRenderer } from '@cyia/opentui-angular';

@Component({
  selector: 'app-flush-sync',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class FlushSyncComponent {
  protected readonly renderer = useRenderer();

  protected a = signal(0);
  protected b = signal(0);
  protected c = signal(0);
  protected renderCount = 0;
  protected log = signal<string[]>([]);

  constructor() {
    afterEveryRender(() => {
      this.renderCount += 1;
    });
    useKeyboard((key) => {
      if (key.name === 'q') {
        process.exit(0);
      }

      if (key.name === 'a') {
        const before = this.renderCount;
        // Without flushSync: React batches all 3 into 1 render
        this.a.update((x) => x + 1);
        this.b.update((x) => x + 1);
        this.c.update((x) => x + 1);
        const after = this.renderCount;
        const logEntries = this.log();
        this.log.set([
          ...logEntries.slice(-4),
          `batched: renders ${before} -> ${after} (no change yet)`,
        ]);
      }
      // angular not support flushSync
      if (key.name === 's') {
        const before = this.renderCount;
        // With flushSync: each update triggers a separate render
        this.a.update((x) => x + 1);
        this.b.update((x) => x + 1);
        this.c.update((x) => x + 1);
        const after = this.renderCount;
        const logEntries = this.log();
        this.log.set([
          ...logEntries.slice(-4),
          `flushSync: renders ${before} -> ${after} (+3 renders)`,
        ]);
      }
    });
  }
}
