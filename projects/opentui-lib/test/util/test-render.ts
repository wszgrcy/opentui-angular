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
  // The native session paints its first frame asynchronously; capturing before it lands reads an untouched buffer.
  await testSetup.renderOnce();
  fixture.componentRef.onDestroy(() => {
    testSetup.renderer.destroy();
  });
  return { testSetup, fixture };
}
