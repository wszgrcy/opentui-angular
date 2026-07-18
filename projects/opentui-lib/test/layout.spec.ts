import { Component, ElementRef, NO_ERRORS_SCHEMA, signal, viewChild } from '@angular/core';
import { testRender } from './util/test-render';
import { BoxRenderable } from '@opentui/core';
import { initTestEnv } from './util/init-env';

describe('Angular Renderer | Layout Tests', () => {
  describe('Basic Text Rendering', () => {
    beforeEach(async () => {
      initTestEnv();
    });
    it('should render simple text correctly', async () => {
      @Component({
        template: `<text>Hello World</text>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}
      const { testSetup, fixture } = await testRender(TestComponent, { width: 20, height: 5 });
      expect(fixture.elementRef).ok;
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });
    it('should render multiline text correctly', async () => {
      @Component({
        template: `<text>
          Line 1
          <br />
          Line 2
          <br />
          Line 3
        </text>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}
      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 15,
        height: 5,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });
    // todo angular not exist errorboundary
    it.skip('should catch and display error when rendering text without parent <text> element', async () => {
      @Component({
        template: `<box>This text is not wrapped in a text element</box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}
      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 60,
        height: 15,
      });
      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toContain('Error:');
      expect(frame).toContain('Text must be created inside of a text node');
      expect(frame).not.toContain('This text is not wrapped in a text element');
    });
    it('should render text with dynamic content', async () => {
      @Component({
        template: `<text>Counter: {{ counter() }}</text>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        counter = signal(42);
      }

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 20,
        height: 3,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });
  });
  describe('Duplicate IDs', () => {
    beforeEach(async () => {
      initTestEnv();
    });
    it('removes the exact duplicate-id child during keyed list reconciliation', async () => {
      const items = signal([0, 1, 2]);
      @Component({
        template: `<box id="container">
          @for (item of items(); track item; let idx = $index, e = $even) {
            <box id="duplicate" [height]="0" [flexShrink]="0" />
          }
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        items = items;
      }

      const { testSetup, fixture } = await testRender(TestComponent, { width: 20, height: 5 });
      await testSetup.renderOnce();

      const container = testSetup.renderer.root.findDescendantById('container')!;
      const initialChildren = container.getChildren();
      const removedChild = initialChildren[1]!;

      items.set([0, 2]);
      fixture.detectChanges();
      await testSetup.renderOnce();

      const children = container.getChildren();
      expect(children).toHaveLength(2);
      expect(children[0]).toBe(initialChildren[0]);
      expect(children[1]).toBe(initialChildren[2]);
      expect(removedChild.parent).toBeNull();
      expect(
        children.every((child) => child.id === 'duplicate' && child.parent === container),
      ).toBe(true);
    });
  });

  describe('Select Rendering', () => {
    beforeEach(async () => {
      initTestEnv();
    });
    it('should restore the selection indicator when the prop resets', async () => {
      const showSelectionIndicator = signal<boolean | undefined>(false);
      @Component({
        template: `<select
          [width]="20"
          [height]="2"
          [showDescription]="false"
          [showSelectionIndicator]="showSelectionIndicator()"
          [options]="[{ name: 'Option', description: '' }]"
        ></select>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        showSelectionIndicator = showSelectionIndicator;
      }

      const { testSetup, fixture } = await testRender(TestComponent, { width: 20, height: 2 });
      await testSetup.renderOnce();
      expect(testSetup.captureCharFrame().split('\n')[0].startsWith(' Option')).true;
      showSelectionIndicator.set(undefined);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await testSetup.renderOnce();
      expect(testSetup.captureCharFrame().split('\n')[0].startsWith(' ▶ Option')).true;
    });
  });

  describe('Box Layout Rendering', () => {
    beforeEach(async () => {
      initTestEnv();
    });

    it('should render basic box layout correctly', async () => {
      @Component({
        template: `<box [style]="{ width: 20, height: 5, border: true }">
          <text>Inside Box</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 25,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should render nested boxes correctly', async () => {
      @Component({
        template: `<box [style]="{ width: 30, height: 10, border: true }" title="Parent Box">
          <box [style]="{ left: 2, top: 2, width: 10, height: 3, border: true }">
            <text>Nested</text>
          </box>
          <text [style]="{ left: 15, top: 2 }">Sibling</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 35,
        height: 12,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should render absolute positioned boxes', async () => {
      @Component({
        template: `<box
            [style]="{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 10,
              height: 3,
              border: true,
              backgroundColor: 'red',
            }"
          >
            <text>Box 1</text>
          </box>
          <box
            [style]="{
              position: 'absolute',
              left: 12,
              top: 2,
              width: 10,
              height: 3,
              border: true,
              backgroundColor: 'blue',
            }"
          >
            <text>Box 2</text>
          </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 25,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should auto-enable border when borderStyle is set', async () => {
      @Component({
        template: `<box [style]="{ width: 20, height: 5 }" borderStyle="single">
          <text>With Border</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 25,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should auto-enable border when borderColor is set', async () => {
      @Component({
        template: `<box [style]="{ width: 20, height: 5 }" borderColor="cyan">
          <text>Colored Border</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 25,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should auto-enable border when focusedBorderColor is set', async () => {
      @Component({
        template: `<box [style]="{ width: 20, height: 5 }" focusedBorderColor="yellow">
          <text>Focused Border</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 25,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should support focusable prop and controlled focus state', async () => {
      @Component({
        selector: 'test-focus-component',
        template: `<box
          [focusable]="true"
          [focused]="focused()"
          [style]="{ width: 10, height: 5, border: true }"
          #ref
        ></box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        focused = signal(false);
        ref = viewChild.required<ElementRef<BoxRenderable>>('ref');
      }

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 15,
        height: 8,
      });

      await testSetup.renderOnce();

      const boxRef = fixture.componentInstance.ref().nativeElement;
      expect(boxRef.focusable).toBe(true);
      expect(boxRef.focused).toBe(false);

      fixture.componentInstance.focused.set(true);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await testSetup.renderOnce();

      expect(boxRef.focused).toBe(true);

      fixture.componentInstance.focused.set(false);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await testSetup.renderOnce();

      expect(boxRef.focused).toBe(false);
    });
  });

  describe('Complex Layouts', () => {
    beforeEach(async () => {
      initTestEnv();
    });

    it('should render complex nested layout correctly', async () => {
      @Component({
        template: `<box [style]="{ width: 40, border: true }" title="Complex Layout">
          <box [style]="{ left: 2, width: 15, height: 5, border: true, backgroundColor: '#333' }">
            <text [wrapMode]="'none'" [style]="{ fg: 'cyan' }">Header Section</text>
            <text [wrapMode]="'none'" [style]="{ fg: 'yellow' }">Menu Item 1</text>
            <text [wrapMode]="'none'" [style]="{ fg: 'yellow' }">Menu Item 2</text>
          </box>
          <box [style]="{ left: 18, width: 18, height: 8, border: true, backgroundColor: '#222' }">
            <text [wrapMode]="'none'" [style]="{ fg: 'green' }">Content Area</text>
            <text [wrapMode]="'none'" [style]="{ fg: 'white' }">Some content here</text>
            <text [wrapMode]="'none'" [style]="{ fg: 'white' }">More content</text>
            <text [wrapMode]="'none'" [style]="{ fg: 'magenta' }">Footer text</text>
          </box>
          <text [style]="{ left: 2, fg: 'gray' }">Status: Ready</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 45,
        height: 18,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should render text with mixed styling and layout', async () => {
      @Component({
        template: `<box [style]="{ width: 35, height: 8, border: true }">
          <text>
            <span [style]="{ fg: 'red', bold: true }">ERROR:</span> Something went wrong
          </text>
          <text> <span [style]="{ fg: 'yellow' }">WARNING:</span> Check your settings </text>
          <text> <span [style]="{ fg: 'green' }">SUCCESS:</span> All systems operational </text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 40,
        height: 10,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should render scrollbox with sticky scroll and spacer', async () => {
      @Component({
        template: `<box [style]="{ maxHeight: '100%', maxWidth: '100%' }">
          <scrollbox
            [scrollbarOptions]="{ visible: false }"
            [stickyScroll]="true"
            stickyStart="bottom"
            [paddingTop]="1"
            [paddingBottom]="1"
            title="scroll area"
            [rootOptions]="{ flexGrow: 0 }"
            [border]="true"
          >
            <box [border]="true" [height]="10" title="hi"></box>
          </scrollbox>
          <box [border]="true" [height]="10" title="spacer" [flexShrink]="0">
            <text>spacer</text>
          </box>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 30,
        height: 25,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should clip nested scrollbox content (Angular) [issue #388]', async () => {
      const innerLines = Array.from({ length: 12 }, (_, i) => `LEAK-${i}`);

      @Component({
        template: `<box
          [style]="{ width: 50, height: 18, flexDirection: 'column', border: true, gap: 0 }"
        >
          <text>HEADER</text>
          <scrollbox
            id="outer-scroll"
            [style]="{
              width: 48,
              height: 12,
              border: true,
              overflow: 'hidden',
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            }"
            [scrollY]="true"
          >
            <scrollbox
              id="inner-scroll"
              [style]="{
                width: 44,
                height: 6,
                border: true,
                overflow: 'hidden',
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
              }"
              [scrollY]="true"
            >
              @for (line of innerLines; track line) {
                <text>{{ line }}</text>
              }
            </scrollbox>
          </scrollbox>
          <text>FOOTER</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        innerLines = innerLines;
      }

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 52,
        height: 20,
      });

      await testSetup.renderOnce();

      const outer = testSetup.renderer.root.findDescendantById?.('outer-scroll') as any;
      const inner = testSetup.renderer.root.findDescendantById?.('inner-scroll') as any;
      // Force both scrollboxes to scroll to exercise translation + clipping
      if (inner && typeof inner.scrollTo === 'function') {
        inner.scrollTo({ x: 0, y: 100 });
      }
      if (outer && typeof outer.scrollTo === 'function') {
        outer.scrollTo({ x: 0, y: 50 });
      }
      await testSetup.renderOnce();

      const frame = testSetup.captureCharFrame();
      const visibleLeakLines = frame.split('\n').filter((line) => line.includes('LEAK-'));

      // The inner viewport height is 4 (6 minus 2 for borders). Currently, the renderer leaks and shows more.
      expect(visibleLeakLines.length).toBeLessThanOrEqual(4);

      // Ensure header/footer are still present for context
      expect(frame).toContain('HEADER');
      expect(frame).toContain('FOOTER');
    });
  });

  describe('Empty and Edge Cases', () => {
    beforeEach(async () => {
      initTestEnv();
    });

    it('should handle empty component', async () => {
      @Component({
        template: ``,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 10,
        height: 5,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should handle component with no children', async () => {
      @Component({
        template: `<box [style]="{ width: 10, height: 5 }"></box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 15,
        height: 8,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });

    it('should handle very small dimensions', async () => {
      @Component({
        template: `<text>Hi</text>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 5,
        height: 3,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      expect(frame).toMatchSnapshot();
    });
  });

  describe('Layout Property Reset on Component Change (Issue #391)', () => {
    beforeEach(async () => {
      initTestEnv();
    });

    it('should reset alignItems when conditionally switching components', async () => {
      const toggle = signal(false);

      @Component({
        template: `
          @if (!toggle()) {
            <box [alignItems]="'center'" [width]="40" [height]="3">
              <text>Centered</text>
            </box>
          } @else {
            <box [width]="40" [height]="3">
              <text>Default</text>
            </box>
          }
        `,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        toggle = toggle;
      }

      const { testSetup, fixture } = await testRender(TestComponent, { width: 40, height: 5 });

      await testSetup.renderOnce();
      const centeredFrame = testSetup.captureCharFrame();
      const centeredLines = centeredFrame.split('\n');
      const centeredTextLine = centeredLines.find((line) => line.includes('Centered'));
      expect(centeredTextLine).toBeDefined();
      expect(centeredTextLine!.trimStart()).not.toBe(centeredTextLine);

      toggle.set(true);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await testSetup.renderOnce();
      const defaultFrame = testSetup.captureCharFrame();
      const defaultLines = defaultFrame.split('\n');
      const defaultTextLine = defaultLines.find((line) => line.includes('Default'));
      expect(defaultTextLine).toBeDefined();
      expect(defaultTextLine!.indexOf('Default')).toBe(0);
    });

    it('should use default alignment when alignItems is not specified', async () => {
      @Component({
        template: `<box [width]="40" [height]="3">
          <text>Left aligned</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {}

      const { testSetup, fixture } = await testRender(TestComponent, {
        width: 40,
        height: 5,
      });

      await testSetup.renderOnce();
      const frame = testSetup.captureCharFrame();
      const lines = frame.split('\n');
      const textLine = lines.find((line) => line.includes('Left aligned'));
      expect(textLine).toBeDefined();
      expect(textLine!.indexOf('Left aligned')).toBe(0);
    });

    it('should reset alignItems when removed from style prop', async () => {
      const style = signal<Record<string, string>>({ alignItems: 'center' });

      @Component({
        template: `<box [style]="style()" [width]="40" [height]="3">
          <text>Test</text>
        </box>`,
        schemas: [NO_ERRORS_SCHEMA],
      })
      class TestComponent {
        style = style;
      }

      const { testSetup, fixture } = await testRender(TestComponent, { width: 40, height: 5 });

      await testSetup.renderOnce();
      const centeredFrame = testSetup.captureCharFrame();
      const centeredLines = centeredFrame.split('\n');
      const centeredTextLine = centeredLines.find((line) => line.includes('Test'));
      expect(centeredTextLine).toBeDefined();
      expect(centeredTextLine!.trimStart()).not.toBe(centeredTextLine);

      style.set({});
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      await testSetup.renderOnce();
      const defaultFrame = testSetup.captureCharFrame();
      const defaultLines = defaultFrame.split('\n');
      const defaultTextLine = defaultLines.find((line) => line.includes('Test'));
      expect(defaultTextLine).toBeDefined();
      expect(defaultTextLine!.indexOf('Test')).toBe(0);
    });
  });
});
