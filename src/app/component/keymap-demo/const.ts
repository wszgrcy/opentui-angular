import { CliRenderer, Renderable, KeyEvent } from '@opentui/core';
import { ActiveKey, Command } from '@opentui/keymap';
import { ExCommandPayload } from '@opentui/keymap/addons';
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui';

export const palette = {
  bg: '#1a1b26',
  surface: '#16161e',
  surfaceFocus: '#292e42',
  panel: '#1f2335',
  border: '#2f334d',
  borderStrong: '#3b4261',
  text: '#c0caf5',
  textDim: '#a9b1d6',
  textMuted: '#565f89',
  title: '#c0caf5',
  alpha: '#7dcfff',
  beta: '#9ece6a',
  accent: '#bb9af7',
  leader: '#e0af68',
  key: '#7dcfff',
  command: '#9ece6a',
  separator: '#3b4261',
} as const;

export const LEADER_TOKEN = '<leader>';
export const COUNT_PATTERN = 'count';
export const KEY_FORMAT_OPTIONS = {
  tokenDisplay: {
    [LEADER_TOKEN]: 'ctrl+x',
  },
} as const;
export const LEADER_TRIGGER_LABEL = KEY_FORMAT_OPTIONS.tokenDisplay[LEADER_TOKEN];

export function createDemoKeymap(
  renderer: CliRenderer,
): ReturnType<typeof createDefaultOpenTuiKeymap> {
  return createDefaultOpenTuiKeymap(renderer);
}
export type PanelId = 'alpha' | 'beta';
export type EditorId = 'notes' | 'draft' | 'scratch';

export interface EditorSpec {
  id: EditorId;
  label: string;
  color: string;
  initialValue?: string;
  placeholder?: string;
}

export const editorSpecs: readonly EditorSpec[] = [
  {
    id: 'notes',
    label: 'Notes',
    color: palette.alpha,
    initialValue: 'Notes editor\nTab/Shift+Tab switches focus.',
  },
  {
    id: 'draft',
    label: 'Draft',
    color: palette.beta,
    initialValue: 'Draft editor\nPress dd here to delete the current line.',
  },
  {
    id: 'scratch',
    label: 'Scratch',
    color: palette.accent,
    placeholder: 'Scratch editor. Unmapped text still inserts directly.',
  },
] as const;

export type ExArgCount = '0' | '1' | '?' | '*' | '+';

export interface DemoExCommand extends Command<Renderable, KeyEvent, ExCommandPayload> {
  name: string;
  aliases?: string[];
  nargs?: ExArgCount;
  title: string;
  desc: string;
  category: string;
  usage: string;
}

export interface ExPromptSuggestion {
  label: string;
  insert: string;
  usage: string;
  desc: string;
  expectsArgs: boolean;
}

export const EX_PROMPT_WIDTH = 54;
export const EX_PROMPT_MAX_VISIBLE_SUGGESTIONS = 4;
export const EX_PROMPT_CHROME_ROWS = 5;
export const EX_PROMPT_MAX_HEIGHT = EX_PROMPT_CHROME_ROWS + EX_PROMPT_MAX_VISIBLE_SUGGESTIONS;

export function normalizeExPromptName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return ':';
  }

  return trimmed.startsWith(':') ? trimmed : `:${trimmed}`;
}

export function parseExPromptInput(
  input: string,
): { raw: string; name: string; args: string[] } | null {
  const normalized = normalizeExPromptName(input);
  if (normalized === ':') {
    return null;
  }

  const parts = normalized.split(/\s+/);
  const [name, ...args] = parts;
  if (!name) {
    return null;
  }

  return {
    raw: normalized,
    name,
    args,
  };
}

export function getExPromptCommandFieldText(
  command: Command<Renderable, KeyEvent>,
  fieldName: string,
): string | undefined {
  return getMetadataText(command[fieldName]);
}

export function getExPromptCommandNargs(
  command: Command<Renderable, KeyEvent>,
): ExArgCount | undefined {
  const value = command['nargs'];
  if (value === '0' || value === '1' || value === '?' || value === '*' || value === '+') {
    return value;
  }

  return undefined;
}

export function buildExPromptSuggestions(
  commands: readonly Command<Renderable, KeyEvent>[],
): ExPromptSuggestion[] {
  const suggestions: ExPromptSuggestion[] = [];

  for (const command of commands) {
    const label = normalizeExPromptName(command.name);
    suggestions.push({
      label,
      insert: label,
      usage: getExPromptCommandFieldText(command, 'usage') ?? label,
      desc: getExPromptCommandFieldText(command, 'desc') ?? '',
      expectsArgs: getExPromptCommandNargs(command) !== '0',
    });
  }

  return suggestions;
}

export function getExPromptSuggestions(
  commands: readonly Command<Renderable, KeyEvent>[],
  value: string,
): ExPromptSuggestion[] {
  const normalized = normalizeExPromptName(value);
  const spaceIndex = normalized.indexOf(' ');
  const query = spaceIndex === -1 ? normalized : normalized.slice(0, spaceIndex);
  const suggestions = buildExPromptSuggestions(commands);

  if (query === ':') {
    return suggestions.slice(0, EX_PROMPT_MAX_VISIBLE_SUGGESTIONS);
  }

  return suggestions
    .filter((suggestion) => suggestion.label.startsWith(query))
    .slice(0, EX_PROMPT_MAX_VISIBLE_SUGGESTIONS);
}

export function getSelectedExPromptSuggestion(
  commands: readonly Command<Renderable, KeyEvent>[],
  value: string,
  selection: number,
): ExPromptSuggestion | null {
  const suggestions = getExPromptSuggestions(commands, value);
  if (suggestions.length === 0) {
    return null;
  }

  return suggestions[Math.min(selection, suggestions.length - 1)] ?? null;
}

export function moveExPromptSelection(
  commands: readonly Command<Renderable, KeyEvent>[],
  value: string,
  selection: number,
  direction: 1 | -1,
): number {
  const suggestions = getExPromptSuggestions(commands, value);
  if (suggestions.length === 0) {
    return 0;
  }

  const current = Math.min(selection, suggestions.length - 1);
  return (current + direction + suggestions.length) % suggestions.length;
}

export function applyExPromptSuggestion(
  commands: readonly Command<Renderable, KeyEvent>[],
  value: string,
  selection: number,
  direction?: 1 | -1,
): { value: string; selection: number } | null {
  const suggestions = getExPromptSuggestions(commands, value);
  if (suggestions.length === 0) {
    return null;
  }

  const nextSelection = direction
    ? moveExPromptSelection(commands, value, selection, direction)
    : Math.min(selection, suggestions.length - 1);
  const suggestion = suggestions[nextSelection];
  if (!suggestion) {
    return null;
  }

  const normalized = normalizeExPromptName(value);
  const spaceIndex = normalized.indexOf(' ');
  const rest = spaceIndex === -1 ? '' : normalized.slice(spaceIndex + 1).trimStart();
  const nextValue = rest
    ? `${suggestion.insert} ${rest}`
    : suggestion.expectsArgs
      ? `${suggestion.insert} `
      : suggestion.insert;

  return {
    value: nextValue,
    selection: nextSelection,
  };
}

export function getMetadataText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function getCountPayload(payload: unknown): number {
  if (!payload || typeof payload !== 'object') {
    return 1;
  }

  const count = (payload as { count?: unknown }).count;
  return typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 1;
}

export function getActiveKeyLabel(activeKey: ActiveKey): string {
  if (activeKey.continues) {
    const group = getMetadataText((activeKey.bindingAttrs as any)?.['group']);
    if (group) {
      return `+${group}`;
    }
  }

  return (
    getMetadataText((activeKey.bindingAttrs as any)?.['desc']) ??
    getMetadataText((activeKey.commandAttrs as any)?.['desc']) ??
    getMetadataText((activeKey.commandAttrs as any)?.['title']) ??
    (typeof activeKey.command === 'string' ? activeKey.command : undefined) ??
    ''
  );
}

export function composeDisposers(disposers: Array<() => void>): () => void {
  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]?.();
    }
  };
}
