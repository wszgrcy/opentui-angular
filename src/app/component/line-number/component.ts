import { Component, ElementRef, NO_ERRORS_SCHEMA, effect, signal, viewChild } from '@angular/core';
import { useKeyboard } from '@cyia/opentui-angular';
import { LineNumberRenderable, RGBA, SyntaxStyle } from '@opentui/core';

const codeContent = `function fibonacci(n: number): number {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

const results = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  .map(fibonacci)

console.log('Fibonacci sequence:', results)

// Calculate the sum
const sum = results.reduce((acc, val) => acc + val, 0)
console.log('Sum:', sum)

// Find even numbers
const evens = results.filter(n => n % 2 === 0)
console.log('Even numbers:', evens)`;

const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: RGBA.fromHex('#C792EA') },
  function: { fg: RGBA.fromHex('#82AAFF') },
  string: { fg: RGBA.fromHex('#C3E88D') },
  number: { fg: RGBA.fromHex('#F78C6C') },
  comment: { fg: RGBA.fromHex('#546E7A') },
  type: { fg: RGBA.fromHex('#FFCB6B') },
  operator: { fg: RGBA.fromHex('#89DDFF') },
  variable: { fg: RGBA.fromHex('#EEFFFF') },
  default: { fg: RGBA.fromHex('#A6ACCD') },
});

@Component({
  selector: 'app-line-number',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class LineNumberComponent {
  protected showLineNumbers = signal(true);
  protected showDiffHighlights = signal(false);
  protected showDiagnostics = signal(false);

  protected readonly codeContent = codeContent;
  protected readonly syntaxStyle = syntaxStyle;
  lineNumberRef = viewChild.required<ElementRef<LineNumberRenderable>>('lineNumberRef');
  constructor() {
    effect(() => {
      const ref = this.lineNumberRef().nativeElement;
      // Set up diff highlights
      if (this.showDiffHighlights()) {
        ref?.setLineColor(1, '#1a4d1a'); // Line 2: added
        ref?.setLineSign(1, { after: ' +', afterColor: '#22c55e' });

        ref?.setLineColor(5, '#4d1a1a'); // Line 6: removed
        ref?.setLineSign(5, { after: ' -', afterColor: '#ef4444' });

        ref?.setLineColor(10, '#1a4d1a'); // Line 11: added
        ref?.setLineSign(10, { after: ' +', afterColor: '#22c55e' });
      }

      // Set up diagnostics
      if (this.showDiagnostics()) {
        ref?.setLineSign(0, {
          before: '⚠️',
          beforeColor: '#f59e0b',
        });
        ref?.setLineSign(7, {
          before: '💡',
          beforeColor: '#3b82f6',
        });
        ref?.setLineSign(13, {
          before: '❌',
          beforeColor: '#ef4444',
        });
      }
    });
    useKeyboard((key) => {
      if (key.name === 'l' && !key.ctrl && !key.meta) {
        this.showLineNumbers.update((v) => !v);
      } else if (key.name === 'h' && !key.ctrl && !key.meta) {
        this.toggleDiffHighlights();
      } else if (key.name === 'd' && !key.ctrl && !key.meta) {
        this.toggleDiagnostics();
      }
    });
  }

  protected toggleDiffHighlights(): void {
    this.showDiffHighlights.update((a) => !a);
    const ref = this.lineNumberRef().nativeElement;
    if (this.showDiffHighlights()) {
      ref?.setLineColor(1, '#1a4d1a');
      ref?.setLineSign(1, { after: ' +', afterColor: '#22c55e' });
      ref?.setLineColor(5, '#4d1a1a');
      ref?.setLineSign(5, { after: ' -', afterColor: '#ef4444' });
      ref?.setLineColor(10, '#1a4d1a');
      ref?.setLineSign(10, { after: ' +', afterColor: '#22c55e' });
    } else {
      ref?.clearAllLineColors();
      // Clear only after signs
      if (!this.showDiagnostics()) {
        ref?.clearAllLineSigns();
      } else {
        ref?.setLineSign(1, {});
        ref?.setLineSign(5, {});
        ref?.setLineSign(10, {});
      }
    }
  }

  protected toggleDiagnostics(): void {
    this.showDiagnostics.update((a) => !a);
    const ref = this.lineNumberRef().nativeElement;

    if (this.showDiagnostics()) {
      ref?.setLineSign(0, { before: '⚠️', beforeColor: '#f59e0b' });
      ref?.setLineSign(7, { before: '💡', beforeColor: '#3b82f6' });
      ref?.setLineSign(13, { before: '❌', beforeColor: '#ef4444' });
    } else {
      // Clear only before signs
      if (!this.showDiffHighlights()) {
        ref?.clearAllLineSigns();
      } else {
        ref?.setLineSign(0, {});
        ref?.setLineSign(7, {});
        ref?.setLineSign(13, {});
      }
    }
  }
}
