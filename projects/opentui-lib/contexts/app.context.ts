import { InjectionToken, inject } from '@angular/core';
import { CliRenderer, KeyHandler } from '@opentui/core';

export interface AppContextValue {
  keyHandler: KeyHandler | null;
  renderer: CliRenderer | null;
}

export const APP_CONTEXT_TOKEN = new InjectionToken<AppContextValue>('AppContext');

export function useAppContext() {
  return inject(APP_CONTEXT_TOKEN);
}
