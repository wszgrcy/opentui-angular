import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { testRender } from './util/test-render';
import { initTestEnv } from './util/init-env';

describe('Link Rendering Tests', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('should render link with href correctly', async () => {
    @Component({
      template: `<text> Visit <a href="https://opentui.com">opentui.com</a> for more info </text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {}

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('Visit opentui.com for more info');
  });

  it('should render styled link with underline', async () => {
    @Component({
      template: `<text>
        <u>
          <a href="https://opentui.com" fg="blue">opentui.com</a>
        </u>
      </text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {}

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 50,
      height: 5,
    });

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('opentui.com');
  });

  it('should render link inside text with other elements', async () => {
    @Component({
      template: `<text>
        Check out <a href="https://github.com/anomalyco/opentui">GitHub</a> and
        <a href="https://opentui.com">our website</a>
      </text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {}

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 60,
      height: 5,
    });

    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain('GitHub');
    expect(frame).toContain('our website');
  });
});
