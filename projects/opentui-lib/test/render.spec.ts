import {
  Component,
  input,
  NO_ERRORS_SCHEMA,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { testRender } from './util/test-render';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { initTestEnv } from './util/init-env';
describe('Renderer', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('hello', async () => {
    @Component({
      template: `<text>hello</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {}
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).eq('hello');
  });
  it('appendChild2', async () => {
    @Component({
      template: `<text>hello</text><text>world</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {}
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(
      frame
        .trim()
        .split('\n')
        .map((a) => a.trim()),
    ).deep.eq(['hello', 'world']);
  });
  it('removeChild', async () => {
    @Component({
      template: `@if (open()) {
        <text>hello</text>
      } `,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).eq('hello');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).eq('');
  });
  it('insertBefore', async () => {
    @Component({
      template: `@if (open()) {
          <text>hello</text>
        }
        <text>world</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(
      frame
        .trim()
        .split('\n')
        .map((a) => a.trim()),
    ).deep.eq(['hello', 'world']);
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).eq('world');
  });
  it('move', async () => {
    @Component({
      template: `<ng-template #ref1>
          <text>hello</text>
        </ng-template>
        @if (open()) {
          <ng-container *ngTemplateOutlet="ref1"></ng-container>
        }
        <text>world</text>
        @if (!open()) {
          <ng-container *ngTemplateOutlet="ref1"></ng-container>
        }`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgTemplateOutlet],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(
      frame
        .trim()
        .split('\n')
        .map((a) => a.trim()),
    ).deep.eq(['hello', 'world']);
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(
      frame
        .trim()
        .split('\n')
        .map((a) => a.trim()),
    ).deep.eq(['world', 'hello']);
  });
  it('component', async () => {
    @Component({
      selector: 'test-child',
      template: `<span>child</span>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class WithNgContent {}
    @Component({
      template: `<text><span>first</span><test-child></test-child><span>last</span></text>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [WithNgContent],
    })
    class TestComponent {}
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstchildlast');
  });
  it('ng-content', async () => {
    @Component({
      selector: 'test-with-ng-content',
      template: `<text><ng-content></ng-content></text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class WithNgContent {}
    @Component({
      template: `<test-with-ng-content>hello</test-with-ng-content>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [WithNgContent],
    })
    class TestComponent {}
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('hello');
  });
  it('ng-content-switch', async () => {
    @Component({
      selector: 'test-with-ng-content',
      template: `<text><ng-content></ng-content></text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class WithNgContent {}
    @Component({
      template: `<test-with-ng-content>
        @if (open()) {
          hello
        } @else {
          world
        }
      </test-with-ng-content>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [WithNgContent],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('hello');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('world');
  });
  it('component-text-switch', async () => {
    @Component({
      selector: 'test-child',
      template: `<span>hello</span>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child {}
    @Component({
      template: `
        <text
          ><span>first</span>
          @if (open()) {
            <test-child></test-child>
          } @else {
            <span>world</span>
          }
          <span>last</span></text
        >
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Child],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
  });
  it('text-component-switch', async () => {
    @Component({
      selector: 'test-child',
      template: `<i>hello</i>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child {}
    @Component({
      template: `
        <text
          ><span>first</span>
          @if (open()) {
            <u>world</u>
          } @else {
            <test-child></test-child>
          }
          <span>last</span></text
        >
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Child],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
  });
  it('ng-template-text-switch', async () => {
    @Component({
      template: `
        <ng-template #child><span>hello</span></ng-template>
        <text
          ><span>first</span>
          @if (open()) {
            <ng-container *ngTemplateOutlet="child"></ng-container>
          } @else {
            <span>world</span>
          }
          <span>last</span></text
        >
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgTemplateOutlet],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
  });
  it('text-ng-template-switch', async () => {
    @Component({
      template: `
        <ng-template #child><span>hello</span></ng-template>
        <text
          ><span>first</span>
          @if (open()) {
            <span>world</span>
          } @else {
            <ng-container *ngTemplateOutlet="child"></ng-container>
          }
          <span>last</span></text
        >
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgTemplateOutlet],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
  });
  it('scrollbox', async () => {
    @Component({
      template: `<scrollbox>
        @for (item of list(); track $index) {
          <text>{{ item }}</text>
        }
      </scrollbox> `,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      list = signal(['1']);
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('1');
    fixture.componentInstance.list.set([]);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('');
  });

  it('insertBefore-refChildProxy', async () => {
    @Component({
      selector: 'test-child',
      template: `<i>last</i>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child {}
    @Component({
      template: `
        <text
          ><span>first</span>
          @if (open()) {
            <u>world</u>
          } @else {
            <span>hello</span>
          }
          <test-child></test-child>
        </text>
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Child],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
  });
  it('insertBefore-refChild-comment', async () => {
    @Component({
      template: `
        <ng-template #ref><i>last</i></ng-template>
        <text
          ><span>first</span>
          @if (open()) {
            <u>world</u>
          } @else {
            <span>hello</span>
          }
          <test-child></test-child>
          <ng-container *ngTemplateOutlet="ref"></ng-container>
        </text>
      `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgTemplateOutlet],
    })
    class TestComponent {
      open = signal(true);
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    let frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firstworldlast');
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await new Promise((res) => setTimeout(res));
    await fixture.whenStable();
    frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('firsthellolast');
  });
  it('nextSibling-createEmbeddedView', async () => {
    @Component({
      template: `
        <ng-template #ref><text>hello</text></ng-template>
        <box #vc></box>
      `,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      vc = viewChild.required('vc', { read: ViewContainerRef });
      ref = viewChild.required<TemplateRef<any>>('ref');
      open = signal(true);
      ngOnInit(): void {
        this.vc().createEmbeddedView(this.ref());
      }
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('hello');
  });
  it('@for', async () => {
    @Component({
      template: `<text>
        @for (item of list(); track $index) {
          <span>{{ item }}</span>
        }
      </text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      list = signal(['1', '2', '3']);
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('123');
  });
  it('@for-empty', async () => {
    @Component({
      template: `<text>
        @for (item of list(); track $index) {
          <span>{{ item }}</span>
        } @empty {
          <span>[empty]</span>
        }
      </text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      list = signal([]);
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('[empty]');
  });
  it('@for-ng-template', async () => {
    @Component({
      template: `<ng-template let-item="item" #ref>
          <span>{{ item }}</span>
        </ng-template>

        <text>
          @for (item of list(); track $index) {
            <ng-container *ngTemplateOutlet="ref; context: { item: item }"></ng-container>
          }
        </text>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgTemplateOutlet],
    })
    class TestComponent {
      list = signal(['1', '2', '3']);
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('123');
  });
  it('@for-ng-component', async () => {
    @Component({
      selector: 'test-child',
      template: `<span>{{ item() }}</span>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child {
      item = input.required();
    }
    @Component({
      template: `<text>
        @for (item of list(); track $index) {
          <test-child [item]="item"></test-child>
        }
      </text>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Child],
    })
    class TestComponent {
      list = signal(['1', '2', '3']);
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('123');
  });
  it('ngComponentOutlet', async () => {
    @Component({
      selector: 'test-child',
      template: `<text>hello</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child {}
    @Component({
      template: ` <ng-container *ngComponentOutlet="Child"></ng-container> `,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [NgComponentOutlet],
    })
    class TestComponent {
      Child = Child;
      constructor() {}
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('hello');
  });
  it('ng-content->component', async () => {
    @Component({
      selector: 'test-child2',
      template: `<text><ng-content></ng-content></text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child2 {}
    @Component({
      selector: 'test-child1',
      template: `<span><ng-content></ng-content></span>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class Child1 {}
    @Component({
      template: `<test-child2><test-child1>hello</test-child1></test-child2>`,
      schemas: [NO_ERRORS_SCHEMA],
      imports: [Child2, Child1],
    })
    class TestComponent {}
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame.trim()).deep.eq('hello');
  });
});
