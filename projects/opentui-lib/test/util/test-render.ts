import { inject, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createTestRenderer, TestRendererOptions } from '@opentui/core/testing';
import { CliRendererToken } from '../../token/cli-render.token';
import { APP_CONTEXT_TOKEN, AppContextValue } from '../../contexts/app.context';

export async function testRender<T>(Component: Type<T>, testRendererOptions: TestRendererOptions) {
  const testSetup = await createTestRenderer({
    ...testRendererOptions,
    onDestroy() {
      fixture.destroy();
      testRendererOptions.onDestroy?.();
    },
  });
  const oldRaf = global.requestAnimationFrame;
  let index = 0;
  const animationRequest = new Map<number, NodeJS.Timeout>();
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const timeout = setTimeout(() => {
      oldRaf(callback);
    });
    animationRequest.set(index++, timeout);
    return index;
  };
  global.cancelAnimationFrame = (input: number) => {
    clearTimeout(animationRequest.get(input));
  };
  TestBed.configureTestingModule({
    imports: [Component],
    providers: [
      {
        provide: CliRendererToken,
        useValue: testSetup.renderer,
      },
      {
        provide: APP_CONTEXT_TOKEN,
        useFactory: () => {
          const cliRenderer = inject(CliRendererToken);
          return {
            keyHandler: cliRenderer.keyInput,
            renderer: cliRenderer,
          } satisfies AppContextValue;
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Component);
  await fixture.whenStable();
  fixture.detectChanges();
  fixture.componentRef.onDestroy(() => {
    testSetup.renderer.destroy();
  });
  return { testSetup, fixture };
}
