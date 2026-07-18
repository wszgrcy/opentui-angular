import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { testRender } from '../util/test-render';
import { useKeyboard } from '@cyia/opentui-angular';
import { initTestEnv } from '../util/init-env';

describe('hooks-keyboard', () => {
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
        useKeyboard((key) => {
          this.value1(key.raw === 'a');
        });
      }
      ngOnDestroy(): void {}
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 20,
      height: 5,
    });
    testSetup.mockInput.pressKey('a');
    await fixture.whenStable();
    expect(fixture.componentInstance.value1).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.value1).toHaveBeenLastCalledWith(true);
  });
});
