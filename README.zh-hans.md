[English](./README.md) | 中文

# @cyia/opentui-angular

一个基于 [OpenTUI core](https://github.com/anomalyco/opentui) 的 Angular 渲染器，用于构建终端用户界面。使用熟悉的 Angular 模式和组件创建丰富的交互式控制台应用程序。

## 快速启动

- Github模板 https://github.com/wszgrcy/ngx-opentui-starter

## 目录

- [核心概念](#核心概念)
  - [组件配置](#组件配置)
  - [样式](#样式)
- [API 参考](#api-reference)
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
- [组件](#组件)
  - [布局与显示组件](#布局与显示组件)
    - [Text 组件](#text-组件)
    - [Box 组件](#box-组件)
    - [Scrollbox 组件](#scrollbox-组件)
    - [ASCII Font 组件](#ascii-font-组件)
  - [输入组件](#输入组件)
    - [Input 组件](#input-组件)
    - [Textarea 组件](#textarea-组件)
    - [Select 组件](#select-组件)
  - [代码与 Diff 组件](#代码与-diff-组件)
    - [Code 组件](#code-组件)
    - [Line Number 组件](#line-number-组件)
    - [Diff 组件](#diff-组件)
- [示例](#示例)
  - [登录表单](#登录表单)
  - [带定时器的计数器](#带定时器的计数器)
  - [系统监控动画](#系统监控动画)
  - [样式化文本展示](#样式化文本展示)
- [组件扩展](#组件扩展)
- [使用 Angular DevTools](#使用-angular-devtools)

## 核心概念

### 组件配置

使用 OpenTUI 组件时，必须在 `@Component` 装饰器中添加 `schemas: [NO_ERRORS_SCHEMA]`：

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA], // 必需！允许使用 <text>, <box> 等自定义元素
  template: `
    <box>
      <text>Hello!</text>
    </box>
  `,
})
export class App {}
```

### 样式

组件可以使用属性或 `style` 属性进行样式化：

```ts
// 使用 style 属性绑定
<box [style]="{ backgroundColor: 'blue', padding: 2 }">
  <text>Hello, world!</text>
</box>

// 直接属性（某些组件支持）
<text content="Hello" fg="#FFFF00" />
```

## API Reference

### Hooks

#### `useRenderer()`

访问 OpenTUI 渲染器实例。

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

处理键盘事件。

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

**参数：**

- `handler`: 接收 `KeyEvent` 对象的回调函数
- `options?`: 可选配置对象：
  - `release?`: 是否包含键释放事件（默认：`false`）

默认情况下，只接收按下事件（包括带有 `repeated: true` 的键重复）。设置 `options.release` 为 `true` 以也接收释放事件。

**带释放事件的示例：**

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

处理终端粘贴事件（括号粘贴）。

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

**参数：**

- `handler`: 接收 `PasteEvent` 对象的回调函数，包含 `bytes: Uint8Array`（使用 `@opentui/core` 中的 `decodePasteBytes` 解码）

#### `useFocus(handler)`

订阅终端窗口聚焦事件。当终端窗口获得焦点时触发。

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

**参数：**

- `handler`: 当终端获得焦点时调用的回调函数

#### `useBlur(handler)`

订阅终端窗口失焦事件。当终端窗口失去焦点时触发。

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

**参数：**

- `handler`: 当终端失去焦点时调用的回调函数

#### `useSelectionHandler(handler)`

处理文本选择事件（例如，当用户通过鼠标拖拽选择文本时）。

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

**参数：**

- `handler`: 接收带有 `getSelectedText()` 等方法的 `Selection` 对象的回调函数

#### `useOnResize(callback)`

处理终端调整大小事件。

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

获取当前终端尺寸，并在终端调整大小时自动更新。返回一个 signal。

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

**返回：** 包含 `width` 和 `height` 属性的信号对象，表示当前终端尺寸。

#### `useTimeline(options?)`

使用 OpenTUI 的时间线系统创建和管理动画。此 hook 自动注册和注销动画引擎的时间线。

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

**参数：**

- `options?`: 可选的 `TimelineOptions` 对象，包含以下属性：
  - `duration?`: 动画持续时间（毫秒），默认：1000
  - `loop?`: 时间线是否循环（默认：false）
  - `autoplay?`: 是否自动启动时间线（默认：true）
  - `onComplete?`: 时间线完成时的回调
  - `onPause?`: 时间线暂停时的回调

**返回：** 带有以下方法的 `Timeline` 实例：

- `add(target, properties, startTime)`: 添加动画到时间线
- `play()`: 启动时间线
- `pause()`: 暂停时间线
- `restart()`: 从头重新启动时间线

## 组件

### 布局与显示组件

#### Text 组件

显示带丰富格式的文本。

```html
<box>
  <!-- 简单文本 -->
  <text>Hello World</text>

  <!-- 动态内容 -->
  <text [content]="myText()" />

  <!-- 带子元素的富文本 -->
  <text>
    <span fg="red">Red Text</span>
  </text>

  <!-- 文本修饰符 -->
  <text> <strong>Bold</strong>, <em>Italic</em>, and <u>Underlined</u> </text>
</box>
```

#### Box 组件

带边框和布局能力的容器。

```html
<box flexDirection="column">
  <!-- 基本盒子 -->
  <box [style]="{ border: true }">
    <text>Simple box</text>
  </box>

  <!-- 带标题和样式的盒子 -->
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

#### Scrollbox 组件

可滚动的盒子。

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

#### ASCII Font 组件

使用不同字体样式显示 ASCII 艺术文本。

```html
<box [style]="{ border: true, paddingLeft: 1, paddingRight: 1 }">
  <ascii-font [text]="text()" [font]="font()" />
</box>
```

### 输入组件

#### Input 组件

带事件处理的文本输入框。使用 `(onInput)` 和 `(onSubmit)` 绑定事件。

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

#### Textarea 组件

多行文本输入框。可以使用 `@ViewChild` 引用获取纯文本内容。

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

#### Select 组件

下拉选择组件。使用 `(onChange)` 绑定选择变化事件。

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

### 代码与 Diff 组件

#### Code 组件

```html
<box [style]="{ border: true, flexGrow: 1 }">
  <code [content]="code" filetype="javascript" [syntaxStyle]="syntaxStyle" />
</box>
```

#### Line Number 组件

显示带行号的代码，并可选择添加 diff 高亮或诊断指示器。使用 `@ViewChild` 引用调用方法。

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
    // 添加 diff 高亮 - 行被添加
    this.lineNumber.setLineColor(1, '#1a4d1a');
    this.lineNumber.setLineSign(1, { after: ' +', afterColor: '#22c55e' });

    // 添加诊断指示器
    this.lineNumber.setLineSign(4, { before: '⚠️', beforeColor: '#f59e0b' });
  }
}
```

#### Diff 组件

显示统一或分栏视图的 diff，带语法高亮、可自定义的主题和行号支持。支持多种视图模式（统一/分栏）、单词换行和主题自定义。

## 示例

### 登录表单

完整示例见 `src/app/component/basic/`。

**组件类：**

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

**模板：**

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

### 带定时器的计数器

完整示例见 `src/app/component/counter/`。

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

**模板：** `src/app/component/counter/component.html`

```html
<text [content]="`${counter()} tests passed...`" fg="#00FF00" />
```

### 系统监控动画

完整示例见 `src/app/component/animation/`。

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

### 样式化文本展示

```html
<text>Simple text</text>
<text><strong>Bold text</strong></text>
<text><u>Underlined text</u></text>
<text><span fg="red">Red text</span></text>
<text><span fg="blue">Blue text</span></text>
<text><strong fg="red">Bold red text</strong></text>
<text><strong>Bold</strong> and <span fg="blue">blue</span> combined</text>
```

## 组件扩展

你可以创建自定义组件，通过扩展 OpenTUI 的基础渲染元素：

完整示例见 `src/app/component/extend/`。

```ts
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { extend } from '@cyia/opentui-angular';
import { BoxRenderable, OptimizedBuffer, RenderContext, RGBA } from '@opentui/core';

// 创建自定义组件类
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

// 添加 TypeScript 支持
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

**模板：** `src/app/component/extend/component.html`

```html
<consoleButton label="Another Button" [style]="{ border: true, backgroundColor: 'green' }" />
```

## 示例项目

本仓库包含多个完整的示例：

- `src/app/component/basic/` - 登录表单示例
- `src/app/component/counter/` - 计数器示例
- `src/app/component/animation/` - 系统监控动画
- `src/app/component/hooks-demo/` - 所有 hooks 的演示
- `src/app/component/extend/` - 自定义组件扩展
- `src/app/component/scroll/` - 滚动框示例
- `src/app/component/line-number/` - 行号与 diff 高亮
- `src/app/component/diff/` - Diff 查看器

运行完整应用：

```bash
npm start
```
