export { provideOpentuiPlatformProviders } from './platform';

export { APP_CONTEXT_TOKEN, useAppContext, type AppContextValue } from './contexts/app.context';
export {
  baseComponents,
  componentCatalogue,
  extend,
  getComponentCatalogue,
  SpanRenderable,
  BoldSpanRenderable,
  ItalicSpanRenderable,
  UnderlineSpanRenderable,
  LineBreakRenderable,
  LinkRenderable,
} from './components';

export {
  useRenderer,
  useKeyboard,
  useFocus,
  useBlur,
  usePaste,
  useOnResize,
  useSelectionHandler,
  useTerminalDimensions,
  useTimeline,
} from './hooks';

export { createAngularSlotRegistry } from './plugins/slot';

export { getNextId } from './utils/id';

export * from './platform';
export * from './application';
export * from './token/cli-render.token';
export type {
  Type,
  Props,
  Instance,
  TextInstance,
  Container,
  PublicInstance,
  HostContext,
} from './types/host';
export * from './plugins/slot';
export * from './utils';
