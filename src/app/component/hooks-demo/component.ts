import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';

import {
  useBlur,
  useFocus,
  useKeyboard,
  useOnResize,
  usePaste,
  useRenderer,
  useSelectionHandler,
  useTerminalDimensions,
} from '@cyia/opentui-angular';
import { decodePasteBytes } from '@opentui/core';
function eventColor(event: string): string {
  if (event.startsWith('[keyboard]')) return '#ffffff';
  if (event.startsWith('[paste]')) return '#51cf66';
  if (event.startsWith('[focus]')) return '#74c0fc';
  if (event.startsWith('[blur]')) return '#ff922b';
  if (event.startsWith('[selection]')) return '#da77f2';
  if (event.startsWith('[resize]')) return '#ffd43b';
  return '#aaaaaa';
}
@Component({
  selector: 'app-hooks-demo',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class HooksDemoComponent {
  protected readonly renderer = useRenderer();
  protected events = signal<string[]>([]);
  protected focused = signal(true);
  protected readonly dimensions = useTerminalDimensions();

  protected eventColor(event: string): string {
    return eventColor(event);
  }

  constructor() {
    // useKeyboard
    useKeyboard((key) => {
      if (key.name === 'escape') {
        this.renderer()?.destroy();
        return;
      }
      if (key.ctrl && key.name === 'c') {
        this.events.set([]);
        return;
      }
      if (key.eventType !== 'release') {
        this.log(`[keyboard] ${key.ctrl ? 'ctrl+' : ''}${key.option ? 'alt+' : ''}${key.name}`);
      }
    });

    // usePaste
    usePaste((event) => {
      const text = decodePasteBytes(event.bytes);
      this.log(`[paste] "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`);
    });

    // useFocus
    useFocus(() => {
      this.focused.set(true);
      this.log('[focus] terminal gained focus');
    });

    // useBlur
    useBlur(() => {
      this.focused.set(false);
      this.log('[blur] terminal lost focus');
    });

    // useSelectionHandler
    useSelectionHandler((selection) => {
      const text = selection.getSelectedText();
      if (text) {
        this.log(`[selection] "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`);
      }
    });

    // useOnResize
    useOnResize((w, h) => {
      this.log(`[resize] ${w}x${h}`);
    });
  }
  log = (msg: string) => {
    const current = this.events();
    this.events.set([...current.slice(-14), msg]);
  };
}
