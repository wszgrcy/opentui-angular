import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import type { ASCIIFontName } from '@opentui/core';

@Component({
  selector: 'app-ascii',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class AsciiComponent {
  protected font = signal<ASCIIFontName>('tiny');

  protected readonly options = [
    { name: 'Tiny', description: 'Tiny font', value: 'tiny' as ASCIIFontName },
    { name: 'Block', description: 'Block font', value: 'block' as ASCIIFontName },
    { name: 'Slick', description: 'Slick font', value: 'slick' as ASCIIFontName },
    { name: 'Shade', description: 'Shade font', value: 'shade' as ASCIIFontName },
  ];

  onFontChange(event: any): void {
    this.font.set(this.options[event].value);
  }
}
