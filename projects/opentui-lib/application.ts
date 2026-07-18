import {
  ɵinternalCreateApplication,
  provideBrowserGlobalErrorListeners,
  Type,
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { BootstrapContext } from '@angular/platform-browser';
import { provideAppProviders, provideOpentuiPlatformProviders } from './platform';
import { APP_CONTEXT_TOKEN, AppContextValue } from './contexts/app.context';
import { CliRendererToken } from './token/cli-render.token';
import { engine } from '@opentui/core';

export const AppProviders = [provideAppProviders(), provideBrowserGlobalErrorListeners()];
export async function bootstrapApplication(
  rootComponent: Type<unknown>,
  options?: ApplicationConfig,
  context?: BootstrapContext,
) {
  return ɵinternalCreateApplication({
    rootComponent: rootComponent,
    appProviders: [
      ...AppProviders,
      ...(options?.providers ?? []),
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
      provideAppInitializer(() => {
        const cliRenderer = inject(CliRendererToken);
        engine.attach(cliRenderer);
      }),
    ],
    platformProviders: provideOpentuiPlatformProviders(),
    platformRef: context?.platformRef,
  }).catch((err) => console.error(err));
}
