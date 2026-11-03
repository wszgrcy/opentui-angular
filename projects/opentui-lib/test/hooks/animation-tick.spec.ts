import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { testRender } from '../util/test-render';
import { useAnimationTick } from '@cyia/opentui-angular';
import { initTestEnv } from '../util/init-env';

describe('hooks-animation-tick', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('ticks while the rate is set and stops when it turns undefined', async () => {
    @Component({
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      fps = signal<number | undefined>(30);
      ticks = 0;
      lastDelta = 0;

      constructor() {
        useAnimationTick(this.fps, (deltaTime) => {
          this.ticks++;
          this.lastDelta = deltaTime;
        });
      }
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 20,
      height: 5,
    });
    await testSetup.renderOnce();
    await new Promise((res) => setTimeout(res, 200));

    expect(fixture.componentInstance.ticks).toBeGreaterThan(0);
    expect(fixture.componentInstance.lastDelta).toBeGreaterThan(0);

    fixture.componentInstance.fps.set(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const ticksAfterPause = fixture.componentInstance.ticks;
    await new Promise((res) => setTimeout(res, 100));
    expect(fixture.componentInstance.ticks).toBe(ticksAfterPause);
  });

  it('stops ticking when the component is destroyed', async () => {
    @Component({
      template: ``,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TickComponent {
      ticks = 0;

      constructor() {
        useAnimationTick(30, () => {
          this.ticks++;
        });
      }
    }

    const { testSetup, fixture } = await testRender(TickComponent, {
      width: 20,
      height: 5,
    });
    await testSetup.renderOnce();
    await new Promise((res) => setTimeout(res, 100));
    expect(fixture.componentInstance.ticks).toBeGreaterThan(0);

    fixture.destroy();
    const ticksAfterDestroy = fixture.componentInstance.ticks;
    await new Promise((res) => setTimeout(res, 100));
    expect(fixture.componentInstance.ticks).toBe(ticksAfterDestroy);
  });
});
