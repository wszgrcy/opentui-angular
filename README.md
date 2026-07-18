[中文文档](./README.zh-hans.md) | English
# @cyia/opentui-angular


An Angular renderer based on [OpenTUI core](https://github.com/anomalyco/opentui) for building terminal user interfaces. Create rich interactive console applications using familiar Angular patterns and components.

## Quick Start

- GitHub template https://github.com/wszgrcy/ngx-opentui-starter

## Table of Contents

- [Core Concepts](#core-concepts)
  - [Component Configuration](#component-configuration)
  - [Styling](#styling)
- [API Reference](#api-reference)
  - [Hooks](#hooks)
    - [useRenderer()](#userenderer)
    - [useKeyboard(handler, options?)](#usekeyboardhandler-options)
    - [usePaste(handler)](#usepastehandler)
    - [useFocus(handler)](#usefocushandler)
    - [useBlur(handler)](#useblurhandler)
    - [useSelectionHandler(handler)](#useselectionhandlerhandler)
    - [useOnResize(callback)](#useonresizecallback)
    - [useTerminalDimensions()](#useterminaldimensions)
    - [useTimeline(options?)](#usetimelineoptions)
- [Components](#components)
  - [Layout and Display Components](#layout-and-display-components)
    - [Text Component](#text-component)
    - [Box Component](#box-component)
    - [Scrollbox Component](#scrollbox-component)
    - [ASCII Font Component](#ascii-font-component)
  - [Input Components](#input-components)
    - [Input Component](#input-component)
    - [Textarea Component](#textarea-component)
    - [Select Component](#select-component)
  - [Code and Diff Components](#code-and-diff-components)
    - [Code Component](#code-component)
    - [Line Number Component](#line-number-component)
    - [Diff Component](#diff-component)
- [Examples](#examples)
  - [Login Form](#login-form)
  - [Counter with Timer](#counter-with-timer)
  - [System Monitoring Animation](#system-monitoring-animation)
  - [Styled Text Display](#styled-text-display)
- [Component Extension](#component-extension)
- [Using Angular DevTools](#using-angular-devtools)

## Core Concepts

### Component Configuration

When using OpenTUI components, you must add `schemas: [NO_ERRORS_SCHEMA]` in the `@Component` decorator:

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA], // Required! Allows custom elements like <text>, <box>
  template: `
    <box>
      <text>Hello!</text>
    </box>
  `,
})
export class App {}
```

### Styling

Components can be styled using attributes or the `style` property:

```ts
// Using style property binding
<box [style]="{ backgroundColor: 'blue', padding: 2 }">
  <text>Hello, world!</text>
</box>

// Direct attributes (supported by some components)
<text content="Hello" fg="#FFFF00" />
```

## API Reference

### Hooks

#### `useRenderer()`

Access the OpenTUI renderer instance.

```ts
import { Component, NO_ERRORS_SCHEMA, effect } from '@angular/core';
import { useRenderer } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<box />',
})
export class App {
  private readonly renderer = useRenderer();

  constructor() {
    effect(() => {
      const r = this.renderer();
      r?.console?.show();
      console.log('Hello, from the console!');
    });
  }
}
```

#### `useKeyboard(handler, options?)`

Handle keyboard events.

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { useKeyboard } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Press ESC to exit</text>',
})
export class App {
  constructor() {
    useKeyboard((key) => {
      if (key.name === 'escape') {
        process.exit(0);
      }
    });
  }
}
```

**Parameters:**

- `handler`: A callback that receives a `KeyEvent` object
- `options?`: Optional configuration object:
  - `release?`: Whether to include key release events (default: `false`)

By default, only press events (including repeats with `repeated: true`) are received. Set `options.release` to `true` to also receive release events.

**Example with release events:**

```ts
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { useKeyboard } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Currently pressed: {{ keys().join(", ") || "none" }}</text>',
})
export class App {
  protected readonly keys = signal<string[]>([]);

  constructor() {
    useKeyboard(
      (event) => {
        const current = this.keys();
        if (event.eventType === 'release') {
          this.keys.set(current.filter((k) => k !== event.name));
        } else {
          if (!current.includes(event.name)) {
            this.keys.set([...current, event.name]);
          }
        }
      },
      { release: true },
    );
  }
}
```

#### `usePaste(handler)`

Handle terminal paste events (bracketed paste).

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { usePaste } from '@cyia/opentui-angular';
import { decodePasteBytes } from '@opentui/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Paste something into the terminal</text>',
})
export class App {
  constructor() {
    usePaste((event) => {
      const text = decodePasteBytes(event.bytes);
      console.log('Pasted text:', text);
    });
  }
}
```

**Parameters:**

- `handler`: A callback that receives a `PasteEvent` object containing `bytes: Uint8Array` (decode using `decodePasteBytes` from `@opentui/core`)

#### `useFocus(handler)`

Subscribe to terminal window focus events. Fires when the terminal window gains focus.

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { useFocus } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Focus-aware component</text>',
})
export class App {
  constructor() {
    useFocus(() => {
      console.log('Terminal gained focus');
    });
  }
}
```

**Parameters:**

- `handler`: Callback invoked when the terminal gains focus

#### `useBlur(handler)`

Subscribe to terminal window blur events. Fires when the terminal window loses focus.

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { useBlur } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Blur-aware component</text>',
})
export class App {
  constructor() {
    useBlur(() => {
      console.log('Terminal lost focus');
    });
  }
}
```

**Parameters:**

- `handler`: Callback invoked when the terminal loses focus

#### `useSelectionHandler(handler)`

Handle text selection events (e.g., when a user selects text by dragging with the mouse).

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { useSelectionHandler } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text selectable>Select this text with your mouse</text>',
})
export class App {
  constructor() {
    useSelectionHandler((selection) => {
      const text = selection.getSelectedText();
      console.log('Selected:', text);
    });
  }
}
```

**Parameters:**

- `handler`: A callback that receives a `Selection` object with methods like `getSelectedText()`

#### `useOnResize(callback)`

Handle terminal resize events.

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { useRenderer, useOnResize } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Resize-aware component</text>',
})
export class App {
  private readonly renderer = useRenderer();

  constructor() {
    useOnResize((width, height) => {
      console.log(`Terminal resized to ${width}x${height}`);
    });
  }
}
```

#### `useTerminalDimensions()`

Returns the current terminal dimensions and automatically updates when the terminal is resized. Returns a signal.

```ts
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { useTerminalDimensions } from '@cyia/opentui-angular';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: '<text>Terminal: {{ dims().width }}x{{ dims().height }}</text>',
})
export class App {
  protected readonly dims = useTerminalDimensions();
}
```

**Returns:** A signal object with `width` and `height` properties representing the current terminal size.

#### `useTimeline(options?)`

Create and manage animations using OpenTUI's timeline system. This hook automatically registers and unregisters the animation timeline.

```ts
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { useTimeline } from '@cyia/opentui-angular';

interface Stats {
  width: number;
}

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: "<box [style]=\"{ width: width() + '%', backgroundColor: '#6a5acd' }\" />",
})
export class App {
  protected readonly width = signal(0);

  private readonly timeline = useTimeline({
    duration: 2000,
    loop: false,
  });

  constructor() {
    this.timeline.add(
      { width: 0 },
      {
        width: 50,
        duration: 2000,
        ease: 'linear',
        onUpdate: (animation) => {
          this.width.set(animation.targets[0].width);
        },
      },
    );
  }
}
```

**Parameters:**

- `options?`: An optional `TimelineOptions` object with the following properties:
  - `duration?`: Animation duration in milliseconds (default: 1000)
  - `loop?`: Whether the timeline loops (default: false)
  - `autoplay?`: Whether to autoplay the timeline (default: true)
  - `onComplete?`: Callback when the timeline completes
  - `onPause?`: Callback when the timeline is paused

**Returns:** A `Timeline` instance with the following methods:

- `add(target, properties, startTime)`: Add an animation to the timeline
- `play()`: Start the timeline
- `pause()`: Pause the timeline
- `restart()`: Restart the timeline from the beginning

## Components

### Layout and Display Components

#### Text Component

Displays text with rich formatting.

```html
<box>
  <!-- Simple text -->
  <text>Hello World</text>

  <!-- Dynamic content -->
  <text [content]="myText()" />

  <!-- Rich text with child elements -->
  <text>
    <span fg="red">Red Text</span>
  </text>

  <!-- Text modifiers -->
  <text> <strong>Bold</strong>, <em>Italic</em>, and <u>Underlined</u> </text>
</box>
```

#### Box Component

A container with border and layout capabilities.

```html
<box flexDirection="column">
  <!-- Basic box -->
  <box [style]="{ border: true }">
    <text>Simple box</text>
  </box>

  <!-- Box with title and styling -->
  <box
    title="Settings"
    titleColor="yellow"
    [style]="{
      border: true,
      borderStyle: 'double',
      padding: 2,
      backgroundColor: 'blue'
    }"
  >
    <text>Box content</text>
  </box>
</box>
```

#### Scrollbox Component

A scrollable box.

```html
<scrollbox
  [style]="{
    rootOptions: { backgroundColor: '#24283b' },
    wrapperOptions: { backgroundColor: '#1f2335' },
    viewportOptions: { backgroundColor: '#1a1b26' },
    contentOptions: { backgroundColor: '#16161e' },
    scrollbarOptions: {
      showArrows: true,
      trackOptions: {
        foregroundColor: '#7aa2f7',
        backgroundColor: '#414868'
      }
    }
  }"
  focused
>
  @for (item of items; track item) {
  <box [style]="{ width: '100%', padding: 1, marginBottom: 1 }">
    <text>{{ item }}</text>
  </box>
  }
</scrollbox>
```

#### ASCII Font Component

Displays ASCII art text using different font styles.

```html
<box [style]="{ border: true, paddingLeft: 1, paddingRight: 1 }">
  <ascii-font [text]="text()" [font]="font()" />
</box>
```

### Input Components

#### Input Component

A text input with event handling. Use `(onInput)` and `(onSubmit)` bindings.

```html
<box title="Enter your name" [style]="{ border: true, height: 3 }">
  <input
    placeholder="Type here..."
    focused
    (onInput)="value.set($any($event))"
    (onSubmit)="console.log('Submitted:', value())"
  />
</box>
```

#### Textarea Component

A multi-line text input. Use `@ViewChild` reference to get plain text content.

```html
<box title="Interactive Editor" [style]="{ border: true, flexGrow: 1 }">
  <textarea #ta placeholder="Type here..." focused />
</box>
```

```ts
import { Component, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { useKeyboard, useRenderer } from '@cyia/opentui-angular';
import type { TextareaRenderable } from '@opentui/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class App {
  @ViewChild('ta') private readonly textarea!: TextareaRenderable;
  private readonly renderer = useRenderer();

  constructor() {
    useKeyboard((key) => {
      if (key.name === 'return') {
        console.log(this.textarea.plainText);
      }
    });

    this.renderer().console?.show();
  }
}
```

#### Select Component

A dropdown select component. Use `(onChange)` to bind selection change events.

```html
<box [style]="{ border: true, height: 24 }">
  <select [style]="{ height: 22 }" [options]="options" focused (onChange)="onSelect($event)" />
</box>
```

```ts
import type { SelectOption } from '@opentui/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class App {
  protected readonly options: SelectOption[] = [
    { name: 'Option 1', description: 'Option 1 description', value: 'opt1' },
    { name: 'Option 2', description: 'Option 2 description', value: 'opt2' },
    { name: 'Option 3', description: 'Option 3 description', value: 'opt3' },
  ];

  protected onSelect(event: any): void {
    const [index, option] = event;
    console.log('Selected:', option);
  }
}
```

### Code and Diff Components

#### Code Component

```html
<box [style]="{ border: true, flexGrow: 1 }">
  <code [content]="code" filetype="javascript" [syntaxStyle]="syntaxStyle" />
</box>
```

#### Line Number Component

Displays code with line numbers and optionally diff highlights or diagnostic indicators. Use `@ViewChild` to call methods.

```html
<box [style]="{ border: true, flexGrow: 1 }">
  <line-number
    #ln
    fg="#6b7280"
    bg="#161b22"
    minWidth="3"
    paddingRight="1"
    showLineNumbers="true"
    width="100%"
    height="100%"
  >
    <code
      [content]="code"
      filetype="typescript"
      [syntaxStyle]="syntaxStyle"
      width="100%"
      height="100%"
    />
  </line-number>
</box>
```

```ts
import { Component, NO_ERRORS_SCHEMA, AfterViewInit, ViewChild } from '@angular/core';
import type { LineNumberRenderable } from '@opentui/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class App implements AfterViewInit {
  @ViewChild('ln') private readonly lineNumber!: LineNumberRenderable;

  ngAfterViewInit(): void {
    // Add diff highlight - line added
    this.lineNumber.setLineColor(1, '#1a4d1a');
    this.lineNumber.setLineSign(1, { after: ' +', afterColor: '#22c55e' });

    // Add diagnostic indicator
    this.lineNumber.setLineSign(4, { before: '⚠️', beforeColor: '#f59e0b' });
  }
}
```

#### Diff Component

Displays a diff in unified or split view, with syntax highlighting, customizable themes, and line number support. Supports multiple view modes (unified/split), word wrap, and theme customization.

## Examples

### Login Form

Full example in `src/app/component/basic/`.

**Component class:**

```ts
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { useKeyboard, useRenderer } from '@cyia/opentui-angular';
import { bold, fg, italic, t, TextAttributes } from '@opentui/core';

type FocusTarget = 'username' | 'password';
type StatusType = 'idle' | 'invalid' | 'success';

@Component({
  selector: 'app-basic',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class BasicComponent {
  protected readonly renderer = useRenderer();
  protected username = signal('');
  protected password = signal('');
  protected focused = signal<FocusTarget>('username');
  protected status = signal<StatusType>('idle');
  protected styledText = signal(t`${bold(italic(fg('cyan')(`Styled Text!`)))}`);
  readonly textAttr = TextAttributes.BOLD | TextAttributes.ITALIC;

  constructor() {
    useKeyboard((key) => {
      if (key.name === 'tab') {
        this.focused.update((prevFocused) =>
          prevFocused === 'username' ? 'password' : 'username',
        );
      }

      if (key.ctrl && key.name === 'k') {
        this.renderer()?.toggleDebugOverlay();
        this.renderer()?.console?.toggle();
      }
    });
  }

  protected handleUsernameChange(value: string): void {
    this.username.set(value);
  }

  protected handlePasswordChange(value: string): void {
    this.password.set(value);
  }

  protected handleSubmit(): void {
    if (this.username() === 'admin' && this.password() === 'secret') {
      this.status.set('success');
    } else {
      this.status.set('invalid');
    }
  }
}
```

**Template:**

```html
<box [style]="{ padding: 2, flexDirection: 'column' }">
  <text
    content="OpenTUI with Angular!"
    [style]="{
      fg: '#FFFF00',
      attributes: textAttr,
    }"
  />
  <text [content]="styledText()" />

  <box
    title="Username"
    [style]="{
      border: true,
      width: 40,
      height: 3,
      marginTop: 1,
    }"
  >
    <input
      placeholder="Enter your username..."
      (onInput)="handleUsernameChange($any($event))"
      (onSubmit)="handleSubmit()"
      [focused]="focused() === 'username'"
      [style]="{
        focusedBackgroundColor: '#000000',
      }"
    />
  </box>

  <box
    title="Password"
    [style]="{
      border: true,
      width: 40,
      height: 3,
      marginTop: 1,
      marginBottom: 1,
    }"
  >
    <input
      placeholder="Enter password..."
      (onInput)="handlePasswordChange($any($event))"
      (onSubmit)="handleSubmit()"
      [focused]="focused() === 'password'"
      [style]="{
        focusedBackgroundColor: '#000000',
      }"
    />
  </box>

  <text
    [content]="status().toUpperCase()"
    [style]="{
      fg: status() === 'idle' ? '#AAAAAA' : status() === 'success' ? 'green' : 'red',
    }"
  />
</box>
```

### Counter with Timer

Full example in `src/app/component/counter/`.

```ts
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
```

**Template:** `src/app/component/counter/component.html`

```html
<text [content]="`${counter()} tests passed...`" fg="#00FF00" />
```

### System Monitoring Animation

Full example in `src/app/component/animation/`.

```ts
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TextAttributes } from '@opentui/core';
import { useTimeline } from '@cyia/opentui-angular';

interface Stats {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

@Component({
  selector: 'app-animation',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class AnimationComponent {
  protected readonly TextAttributes = TextAttributes;

  protected animatedSystem = signal<Stats>({
    cpu: 0,
    memory: 0,
    network: 0,
    disk: 0,
  });

  protected round(value: number): number {
    return Math.round(value);
  }

  protected readonly statsMap = [
    { name: 'CPU', key: 'cpu' as keyof Stats, color: '#6a5acd' },
    { name: 'Memory', key: 'memory' as keyof Stats, color: '#4682b4' },
    { name: 'Network', key: 'network' as keyof Stats, color: '#20b2aa' },
    { name: 'Disk', key: 'disk' as keyof Stats, color: '#daa520' },
  ];

  timeline = useTimeline({
    duration: 3000,
    loop: false,
  });

  constructor() {
    this.timeline.add(
      this.animatedSystem(),
      {
        cpu: 85,
        memory: 70,
        network: 95,
        disk: 60,
        duration: 3000,
        ease: 'linear',
        onUpdate: (values) => {
          this.animatedSystem.set({ ...values.targets[0] });
        },
      },
      0,
    );
  }
}
```

### Styled Text Display

```html
<text>Simple text</text>
<text><strong>Bold text</strong></text>
<text><u>Underlined text</u></text>
<text><span fg="red">Red text</span></text>
<text><span fg="blue">Blue text</span></text>
<text><strong fg="red">Bold red text</strong></text>
<text><strong>Bold</strong> and <span fg="blue">blue</span> combined</text>
```

## Component Extension

You can create custom components by extending OpenTUI's base renderable elements.

Full example in `src/app/component/extend/`.

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { extend } from '@cyia/opentui-angular';
import { BoxRenderable, OptimizedBuffer, RenderContext, RGBA } from '@opentui/core';

// Create a custom component class
class ConsoleButtonRenderable extends BoxRenderable {
  private _label: string = 'Button';

  constructor(ctx: RenderContext, options: any) {
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

  set label(value: string) {
    this._label = value;
    this.requestRender();
  }
}

// Add TypeScript support
declare module '@cyia/opentui-angular' {
  interface OpenTUIComponents {
    consoleButton: typeof ConsoleButtonRenderable;
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
```

**Template:** `src/app/component/extend/component.html`

```html
<consoleButton label="Another Button" [style]="{ border: true, backgroundColor: 'green' }" />
```

## Example Projects

This repository contains several complete examples:

- `src/app/component/basic/` – Login form example
- `src/app/component/counter/` – Counter example
- `src/app/component/animation/` – System monitoring animation
- `src/app/component/hooks-demo/` – Demonstration of all hooks
- `src/app/component/extend/` – Custom component extension
- `src/app/component/scroll/` – Scrollbox example
- `src/app/component/line-number/` – Line number and diff highlight
- `src/app/component/diff/` – Diff viewer

Run the full application:

```bash
npm start
```
