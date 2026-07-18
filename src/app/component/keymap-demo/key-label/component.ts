import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TextAttributes } from '@opentui/core';
import { palette } from '../const';

@Component({
  selector: 'app-key-label',
  imports: [],
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class KeyLabel {
  TextAttributes = TextAttributes;
  readonly palette = palette;
}
