import {
  ASCIIFontRenderable,
  BoxRenderable,
  CodeRenderable,
  DiffRenderable,
  InputRenderable,
  LineNumberRenderable,
  MarkdownRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  TabSelectRenderable,
  TextareaRenderable,
  TextRenderable,
  TimeToFirstDrawRenderable,
} from '@opentui/core';
import {
  BoldSpanRenderable,
  ItalicSpanRenderable,
  LineBreakRenderable,
  LinkRenderable,
  SpanRenderable,
  UnderlineSpanRenderable,
} from './text.js';

// Re-export text renderables for public API
export {
  SpanRenderable,
  BoldSpanRenderable,
  ItalicSpanRenderable,
  UnderlineSpanRenderable,
  LineBreakRenderable,
  LinkRenderable,
} from './text.js';

export const baseComponents = {
  box: BoxRenderable,
  text: TextRenderable,
  code: CodeRenderable,
  diff: DiffRenderable,
  markdown: MarkdownRenderable,
  input: InputRenderable,
  select: SelectRenderable,
  textarea: TextareaRenderable,
  scrollbox: ScrollBoxRenderable,
  'ascii-font': ASCIIFontRenderable,
  'tab-select': TabSelectRenderable,
  'line-number': LineNumberRenderable,

  // Text modifiers
  span: SpanRenderable,
  br: LineBreakRenderable,
  b: BoldSpanRenderable,
  strong: BoldSpanRenderable,
  i: ItalicSpanRenderable,
  em: ItalicSpanRenderable,
  u: UnderlineSpanRenderable,
  a: LinkRenderable,
  'time-to-first-draw': TimeToFirstDrawRenderable,
};

export type ComponentCatalogue = Record<string, new (ctx: any, options: any) => any>;

export const componentCatalogue: ComponentCatalogue = { ...baseComponents };

export function extend<T extends ComponentCatalogue>(objects: T): void {
  Object.assign(componentCatalogue, objects);
}

export function getComponentCatalogue(): ComponentCatalogue {
  return componentCatalogue;
}
