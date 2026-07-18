import { Component, Type, effect, signal, computed, NO_ERRORS_SCHEMA } from '@angular/core';
import { useRenderer, useKeyboard, useTerminalDimensions } from '@cyia/opentui-angular';
import { BasicComponent } from './component/basic/component';
import { CounterComponent } from './component/counter/component';
import { AnimationComponent } from './component/animation/component';
import { AsciiComponent } from './component/ascii/component';
import { TextComponent } from './component/text/component';
import { BoxComponent } from './component/box/component';
import { BordersComponent } from './component/borders/component';
import { ScrollComponent } from './component/scroll/component';
import { LineNumberComponent } from './component/line-number/component';
import { DiffComponent } from './component/diff/component';
import { OpacityComponent } from './component/opacity/component';
import { ExtendDemoComponent } from './component/extend/component';
import { FlushSyncComponent } from './component/flush-sync/component';
import { HooksDemoComponent } from './component/hooks-demo/component';
import { NgComponentOutlet } from '@angular/common';
import { KeymapDemoComponent } from './component/keymap-demo/component';
import { ExternalPluginSlotsDemoComponent } from './component/external-plugin-slots/component';

interface ExampleDefinition {
  name: string;
  description: string;
  component: Type<any>;
}

export const EXAMPLES: ExampleDefinition[] = [
  {
    name: 'Basic Demo',
    description: 'Input form, focus management, and styled text',
    component: BasicComponent,
  },
  {
    name: 'Counter Demo',
    description: 'State updates and interval-driven re-renders',
    component: CounterComponent,
  },
  {
    name: 'Animation Demo',
    description: 'Timeline-driven system monitor animation',
    component: AnimationComponent,
  },
  {
    name: 'ASCII Font Demo',
    description: 'Switch among multiple ASCII font renderers',
    component: AsciiComponent,
  },
  {
    name: 'Text Demo',
    description: 'Styled text, colors, links, and nested formatting',
    component: TextComponent,
  },
  {
    name: 'Box Demo',
    description: 'Box layout, spacing, nesting, and alignment',
    component: BoxComponent,
  },
  {
    name: 'Borders Demo',
    description: 'Single, double, rounded, and heavy borders',
    component: BordersComponent,
  },
  {
    name: 'Scroll Demo',
    description: 'Scrollable content with custom scrollbar styling',
    component: ScrollComponent,
  },
  {
    name: 'Line Number Demo',
    description: 'Code with line numbers, signs, and diagnostics',
    component: LineNumberComponent,
  },
  {
    name: 'Diff Demo',
    description: 'Unified and split diff view with themes',
    component: DiffComponent,
  },
  {
    name: 'Opacity Demo',
    description: 'Layered opacity blending and animation',
    component: OpacityComponent,
  },
  {
    name: 'Flush Sync Demo',
    description: 'Compare batched updates vs synchronous flushes',
    component: FlushSyncComponent,
  },
  {
    name: 'Hooks Demo',
    description:
      'Validate useKeyboard, usePaste, useFocus, useBlur, useSelectionHandler, useOnResize',
    component: HooksDemoComponent,
  },

  {
    name: 'Keymap Demo',
    description:
      'Panels plus textareas with global, local, managed bindings, and a centered : prompt',
    component: KeymapDemoComponent,
  },
  {
    name: 'Extend Demo',
    description: 'Custom renderable registration through extend',
    component: ExtendDemoComponent,
  },
  {
    name: 'External Plugin Slots Demo',
    description: 'Loads .plugin/index.tsx and renders external React slot components',
    component: ExternalPluginSlotsDemoComponent,
  },
];

@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './app.html',
})
export class App {
  protected readonly renderer = useRenderer();
  protected readonly terminalDimensions = useTerminalDimensions();

  protected selected = signal<number>(-1);

  protected exampleOptions = computed(() =>
    EXAMPLES.map((example, index) => ({
      name: example.name,
      description: example.description,
      value: index,
    })),
  );
  selectedExample = computed(() => EXAMPLES[this.selected()]);
  constructor() {
    // Set console mode on init
    effect(() => {
      this.renderer().consoleMode = 'console-overlay';
    });

    // Keyboard handler
    useKeyboard((key) => {
      switch (key.name) {
        case 'escape':
          this.selected.set(-1);
          break;
        case '`':
          this.renderer().console?.toggle();
          break;
        case 't':
          this.renderer().toggleDebugOverlay();
          break;
        case 'g':
          if (key.ctrl) {
            this.renderer().dumpHitGrid();
          }
          break;
      }

      if (key.ctrl && key.name === 'c') {
        key.preventDefault();
        this.renderer().destroy();
      }
    });
  }

  protected onSelectExample(event: any): void {
    // The event from opentui select is the selected index (number)
    if (typeof event === 'number') {
      this.selected.set(event);
    } else if (event && typeof event === 'object' && 'index' in event) {
      this.selected.set((event as { index: number }).index);
    }
  }
}
