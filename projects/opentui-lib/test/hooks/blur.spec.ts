import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { testRender } from '../util/test-render';
import { useBlur } from '@cyia/opentui-angular';
import { initTestEnv } from '../util/init-env';

describe('hooks-blur', () => {
  beforeEach(async () => {
    initTestEnv();
  });
  it('hello', async () => {
    @Component({
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      value1 = vi.fn();
      constructor() {
        useBlur(() => {
          this.value1();
        });
      }
      ngOnDestroy(): void {}
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 20,
      height: 5,
    });
    testSetup.renderer.stdin.emit('data', Buffer.from('\x1b[O'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value1).toHaveBeenCalledTimes(1);
  });
});
