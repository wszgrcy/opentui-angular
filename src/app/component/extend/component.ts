import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { extend } from '@cyia/opentui-angular';
import { BoxOptions, BoxRenderable, OptimizedBuffer, RenderContext, RGBA } from '@opentui/core';

// Custom renderable that extends BoxRenderable
class ConsoleButtonRenderable extends BoxRenderable {
  private _label: string = 'Button';

  constructor(ctx: RenderContext, options: BoxOptions & { label?: string }) {
    super(ctx, options);

    if (options.label) {
      this._label = options.label;
    }

    // Set some default styling for buttons
    this.borderStyle = 'single';
    this.padding = 2;
  }

  protected override renderSelf(buffer: OptimizedBuffer): void {
    super.renderSelf(buffer);

    const centerX = this.x + Math.floor(this.width / 2 - this._label.length / 2);
    const centerY = this.y + Math.floor(this.height / 2);

    buffer.drawText(this._label, centerX, centerY, RGBA.fromInts(255, 255, 255, 255));
  }

  get label(): string {
    return this._label;
  }

  set label(value: string) {
    this._label = value;
    this.requestRender();
  }
}

@Component({
  selector: 'app-extend-demo',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class ExtendDemoComponent {
  constructor() {
    extend({ consoleButton: ConsoleButtonRenderable });
  }
}
