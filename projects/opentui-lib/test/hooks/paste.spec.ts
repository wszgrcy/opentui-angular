import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { testRender } from '../util/test-render';
import { usePaste } from '@cyia/opentui-angular';
import { initTestEnv } from '../util/init-env';

describe('hooks-paste', () => {
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
        usePaste((event) => {
          this.value1(event.bytes.length === 1024);
        });
      }
      ngOnDestroy(): void {}
    }
    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 20,
      height: 5,
    });
    const payloadSize = 1 * 1024;

    const chunk = Buffer.alloc(payloadSize, 'x');
    const stream = Buffer.concat([Buffer.from('\x1b[200~'), chunk, Buffer.from('\x1b[201~')]);
    testSetup.renderer.stdin.emit('data', stream);
    await fixture.whenStable();
    expect(fixture.componentInstance.value1).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.value1).toHaveBeenLastCalledWith(true);
  });
});
