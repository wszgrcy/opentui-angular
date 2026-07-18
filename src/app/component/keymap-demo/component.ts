import {
  Component,
  NO_ERRORS_SCHEMA,
  signal,
  computed,
  effect,
  DestroyRef,
  inject,
  viewChild,
  ElementRef,
  viewChildren,
} from '@angular/core';
import {
  BoxRenderable,
  CliRenderEvents,
  KeyEvent,
  TextAttributes,
  type InputRenderable,
  type Renderable,
  type TextareaRenderable,
} from '@opentui/core';
import { type Binding, type Command } from '@opentui/keymap';
import * as addons from '@opentui/keymap/addons/opentui';
import type { ExCommandPayload } from '@opentui/keymap/addons/opentui';
import { formatKeySequence } from '@opentui/keymap/extras';
import { useRenderer } from '@cyia/opentui-angular';
import {
  useKeymap,
  useBindings,
  useActiveKeys,
  usePendingSequence,
  KEYMAP_TOKEN,
} from '@cyia/opentui-angular/keymap';
import {
  palette,
  LEADER_TRIGGER_LABEL,
  KEY_FORMAT_OPTIONS,
  editorSpecs,
  EX_PROMPT_WIDTH,
  EX_PROMPT_MAX_HEIGHT,
  EX_PROMPT_CHROME_ROWS,
  DemoExCommand,
  getExPromptSuggestions,
  getSelectedExPromptSuggestion,
  getActiveKeyLabel,
  composeDisposers,
  COUNT_PATTERN,
  moveExPromptSelection,
  applyExPromptSuggestion,
  parseExPromptInput,
  getExPromptCommandFieldText,
  createDemoKeymap,
} from './const';
import { CounterPanel } from './counter-panel/component';

@Component({
  selector: 'app-app-content',
  imports: [CounterPanel],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class AppContent {
  protected readonly renderer = useRenderer();
  manager = useKeymap();
  private readonly destroyRef = inject(DestroyRef);

  readonly palette = palette;
  readonly TextAttributes = TextAttributes;
  readonly LEADER_TRIGGER_LABEL = LEADER_TRIGGER_LABEL;
  readonly editorSpecs = editorSpecs;
  readonly EX_PROMPT_WIDTH = EX_PROMPT_WIDTH;
  readonly EX_PROMPT_MAX_HEIGHT = EX_PROMPT_MAX_HEIGHT;
  readonly EX_PROMPT_CHROME_ROWS = EX_PROMPT_CHROME_ROWS;

  Math = Math;

  protected alphaPanelRef = signal<ElementRef<BoxRenderable> | null>(null);
  protected betaPanelRef = signal<ElementRef<BoxRenderable> | null>(null);
  protected commandInputRef = viewChild.required<ElementRef<InputRenderable>>('commandInputRef');
  protected commandPromptRestoreTargetRef = signal<Renderable | null>(null);
  protected commandPromptVisibleRef = false;
  protected commandPromptValueRef = ':';
  protected editorRefs = viewChildren<ElementRef<TextareaRenderable>>('editorRef');

  protected alphaCount = signal(0);
  protected betaCount = signal(0);
  protected helpVisible = signal(true);
  protected leaderArmed = signal(false);
  protected commandPromptVisible = signal(false);
  protected commandPromptValue = signal(':');
  protected commandPromptSelection = signal(0);
  protected lastAction = signal('Click a panel or press Tab to start.');
  protected logs = signal<string[]>([]);
  protected statusVersion = signal(0);

  commands = computed<Command<Renderable, KeyEvent>[]>(() => [
    {
      name: 'focus-next',
      title: 'Next target',
      desc: 'Next target',
      category: 'Navigation',
      run: () => {
        this.moveFocus(1);
      },
    },
    {
      name: 'focus-prev',
      title: 'Previous target',
      desc: 'Previous target',
      category: 'Navigation',
      run: () => {
        this.moveFocus(-1);
      },
    },
    {
      name: 'toggle-help',
      title: 'Toggle help',
      desc: 'Toggle help',
      category: 'View',
      run: () => {
        this.helpVisible.update((value) => {
          const next = !value;
          this.announce(next ? 'Help shown' : 'Help hidden');
          return next;
        });
      },
    },
    {
      name: 'open-ex-prompt',
      title: 'Open ex prompt',
      desc: 'Open ex prompt',
      category: 'Ex',
      run: () => {
        this.openCommandPrompt();
      },
    },
  ]);
  exCommands = computed<DemoExCommand[]>(() => [
    {
      name: 'reset',
      aliases: ['r'],
      nargs: '0',
      title: 'Reset counters',
      desc: 'Reset counters',
      category: 'Session',
      usage: ':reset',
      run: () => {
        this.alphaCount.set(0);
        this.betaCount.set(0);
        this.announce('Counters reset through :reset');
      },
    },
    {
      name: 'write',
      aliases: ['w'],
      nargs: '1',
      title: 'Write file',
      desc: 'Write file',
      category: 'File',
      usage: ':write <file>',
      run: ({ payload }) => {
        this.announce(`Wrote ${payload.args[0]}`);
      },
    },
  ]);
  registeredExCommands = computed<Command<Renderable, KeyEvent, ExCommandPayload>[]>(() =>
    this.exCommands().map((command) => ({ ...command, namespace: 'excommands' })),
  );

  discoveredExCommands = computed(() => this.manager().getCommands({ namespace: 'excommands' }));

  commandPromptSuggestions = computed(() =>
    getExPromptSuggestions(this.discoveredExCommands(), this.commandPromptValue()),
  );

  commandPromptSuggestionRows = computed(() => Math.max(this.commandPromptSuggestions().length, 1));

  selectedCommandPromptSuggestion = computed(() =>
    getSelectedExPromptSuggestion(
      this.discoveredExCommands(),
      this.commandPromptValue(),
      this.commandPromptSelection(),
    ),
  );
  protected activeKeys = useActiveKeys({ includeMetadata: true });
  protected pendingSequence = usePendingSequence();
  focusedEditorIndex = computed(() => {
    void this.statusVersion();
    return this.editorRefs().findIndex(
      (editor) => editor.nativeElement === this.renderer().currentFocusedEditor,
    );
  });

  focusedLabel = computed(() => {
    void this.statusVersion();
    const r = this.renderer();

    if (r.currentFocusedRenderable === this.commandInputRef().nativeElement) {
      return 'Ex command prompt';
    }
    if (r.currentFocusedRenderable === this.alphaPanelRef()) {
      return 'Alpha panel';
    }
    if (r.currentFocusedRenderable === this.betaPanelRef()) {
      return 'Beta panel';
    }
    const idx = this.focusedEditorIndex();
    if (idx !== -1) {
      return `${editorSpecs[idx]!.label} editor`;
    }
    return 'None';
  });

  focusedColor = computed(() => {
    void this.statusVersion();
    const r = this.renderer();

    if (r.currentFocusedRenderable === this.commandInputRef().nativeElement) {
      return palette.leader;
    }
    if (r.currentFocusedRenderable === this.alphaPanelRef()) {
      return palette.alpha;
    }
    if (r.currentFocusedRenderable === this.betaPanelRef()) {
      return palette.beta;
    }
    const idx = this.focusedEditorIndex();
    if (idx !== -1) {
      return editorSpecs[idx]!.color;
    }
    return palette.textMuted;
  });

  focusedEditor = computed(() => {
    void this.statusVersion();
    return this.renderer()?.currentFocusedEditor;
  });

  whichKeyEntries = computed(() => {
    const sortedActiveKeys = [...this.activeKeys()].sort((left, right) =>
      formatKeySequence([left], KEY_FORMAT_OPTIONS).localeCompare(
        formatKeySequence([right], KEY_FORMAT_OPTIONS),
      ),
    );

    return sortedActiveKeys.map((activeKey) => ({
      key: formatKeySequence([activeKey as any], KEY_FORMAT_OPTIONS),
      command: getActiveKeyLabel(activeKey as any),
    }));
  });
  whichKeyPrefix = computed(
    () => formatKeySequence(this.pendingSequence(), KEY_FORMAT_OPTIONS) || '<root>',
  );

  pendingSequenceLabel = computed(() => {
    const seq = this.pendingSequence();
    return seq.length === 0 ? 'None' : formatKeySequence(seq, KEY_FORMAT_OPTIONS);
  });

  commandPromptUsage = computed(() => {
    const selected = this.selectedCommandPromptSuggestion();
    if (!selected) {
      return 'No matching ex commands';
    }

    return `Usage: ${selected.usage}  |  ${selected.desc}`;
  });

  constructor() {
    effect((onCleanup) => {
      const dispose = this.manager().registerLayer({ commands: this.commands() });
      onCleanup(dispose);
    });
    effect((onCleanup) => {
      const dispose = composeDisposers([
        addons.registerExCommands(this.manager()),
        this.manager().registerLayer({ commands: this.registeredExCommands() }),
      ]);
      onCleanup(dispose);
    });
    effect((onCleanup) => {
      const dispose = composeDisposers([
        addons.registerTimedLeader(this.manager(), {
          trigger: { name: 'x', ctrl: true },
          onArm: () => {
            this.leaderArmed.set(true);
            this.announce('Leader armed: press s or h');
          },
          onDisarm: () => {
            this.leaderArmed.set(false);
          },
        }),
        addons.registerNeovimDisambiguation(this.manager()),
        addons.registerEscapeClearsPendingSequence(this.manager()),
        addons.registerBackspacePopsPendingSequence(this.manager()),
        this.manager().registerSequencePattern({
          name: COUNT_PATTERN,
          match(event) {
            if (!/^\d$/.test(event.name)) {
              return undefined;
            }

            return { value: event.name, display: event.name };
          },
          finalize(values) {
            return Number(values.join(''));
          },
        }),
        addons.registerManagedTextareaLayer(this.manager(), this.renderer(), {
          enabled: () =>
            !this.commandPromptVisibleRef && this.renderer().currentFocusedEditor !== null,
          bindings: [
            { key: 'left', cmd: 'input.move.left', desc: 'Cursor left' },
            { key: 'right', cmd: 'input.move.right', desc: 'Cursor right' },
            { key: 'up', cmd: 'input.move.up', desc: 'Cursor up' },
            { key: 'down', cmd: 'input.move.down', desc: 'Cursor down' },
            { key: 'backspace', cmd: 'input.backspace', desc: 'Delete backward' },
            { key: 'delete', cmd: 'input.delete', desc: 'Delete forward' },
            { key: 'return', cmd: 'input.newline', desc: 'New line' },
            { key: 'ctrl+a', cmd: 'input.line.home', desc: 'Line start' },
            { key: 'ctrl+e', cmd: 'input.line.end', desc: 'Line end' },
            { key: 'd', group: 'Delete' },
            { key: 'dd', cmd: 'input.delete.line', desc: 'Delete line' },
            { key: 'g', cmd: 'input.line.home', desc: 'Line start', group: 'Go' },
            { key: 'gg', cmd: 'input.buffer.home', desc: 'Buffer start', group: 'Go' },
            { key: 'shift+g', cmd: 'input.buffer.end', desc: 'Buffer end', group: 'Go' },
          ] satisfies Binding[],
        }),
        this.manager().registerLayer({
          enabled: () => !this.commandPromptVisibleRef,
          bindings: [
            { key: 'tab', cmd: 'focus-next', desc: 'Next target' },
            { key: 'shift+tab', cmd: 'focus-prev', desc: 'Previous target' },
            { key: '?', cmd: 'toggle-help', desc: 'Toggle help' },
            { key: 'ctrl+r', cmd: ':reset', desc: 'Reset counters' },
            { key: '<leader>', group: 'Leader' },
            { key: '<leader>s', cmd: ':w session.log', desc: 'Write session log', group: 'Leader' },
            { key: '<leader>h', cmd: 'toggle-help', desc: 'Toggle help', group: 'Leader' },
          ] satisfies Binding[],
        }),
        this.manager().registerLayer({
          enabled: () => !this.commandPromptVisibleRef,
          bindings: [
            { key: ':', cmd: 'open-ex-prompt', desc: 'Open ex prompt' },
          ] satisfies Binding[],
        }),
      ]);
      onCleanup(dispose);
    });

    useBindings<InputRenderable>(() => ({
      targetRef: this.commandInputRef().nativeElement,
      enabled: () => this.commandPromptVisibleRef,
      commands: [
        {
          name: 'ex-prompt-close',
          run: () => {
            this.closeCommandPrompt('Closed ex prompt');
          },
        },
        {
          name: 'ex-prompt-prev',
          run: () => {
            this.moveCommandPromptSelection(-1);
          },
        },
        {
          name: 'ex-prompt-next',
          run: () => {
            this.moveCommandPromptSelection(1);
          },
        },
        {
          name: 'ex-prompt-complete',
          run: () => {
            this.applyCommandPromptSuggestion();
          },
        },
        {
          name: 'ex-prompt-complete-prev',
          run: () => {
            this.applyCommandPromptSuggestion(-1);
          },
        },
        {
          name: 'ex-prompt-submit',
          run: () => {
            this.executeCommandPrompt();
          },
        },
      ],
      bindings: [
        { key: 'escape', cmd: 'ex-prompt-close', desc: 'Close ex prompt' },
        { key: 'up', cmd: 'ex-prompt-prev', desc: 'Previous suggestion' },
        { key: 'down', cmd: 'ex-prompt-next', desc: 'Next suggestion' },
        { key: 'tab', cmd: 'ex-prompt-complete', desc: 'Complete suggestion' },
        { key: 'shift+tab', cmd: 'ex-prompt-complete-prev', desc: 'Previous completion' },
        { key: 'return', cmd: 'ex-prompt-submit', desc: 'Run ex command' },
      ] satisfies Binding[],
    }));

    effect(() => {
      const onFocusedRenderable = (focused: Renderable | null) => {
        this.dismissCommandPromptForFocusChange(focused);
        this.bumpStatus();
      };

      const onFocusedEditor = () => {
        this.bumpStatus();
      };
      const r = this.renderer();

      r.on(CliRenderEvents.FOCUSED_RENDERABLE, onFocusedRenderable);
      r.on(CliRenderEvents.FOCUSED_EDITOR, onFocusedEditor);

      this.destroyRef.onDestroy(() => {
        r.off(CliRenderEvents.FOCUSED_RENDERABLE, onFocusedRenderable);
        r.off(CliRenderEvents.FOCUSED_EDITOR, onFocusedEditor);
      });
    });
    effect(() => {
      if (!this.commandPromptVisible()) {
        return;
      }

      const input = this.commandInputRef().nativeElement;
      if (!input) {
        return;
      }

      this.syncCommandPromptInput(this.commandPromptValueRef);
      input.focus();
    });
    effect(() => {
      const alphaPanelRef = this.alphaPanelRef();
      if (!alphaPanelRef?.nativeElement) {
        return;
      }
      this.renderer().setBackgroundColor(palette.bg);
      this.addLog('Tab switches focus across panels and editors.');
      this.addLog(`${LEADER_TRIGGER_LABEL} arms the leader extension.`);
      this.addLog('Editors use g/gg/shift+g for Vim-style navigation.');
      this.addLog(': opens the centered ex prompt.');
      alphaPanelRef.nativeElement.focus();
      this.announce('Focused Alpha panel');
    });
  }

  protected bumpStatus(): void {
    this.statusVersion.update((v) => v + 1);
  }
  protected addLog(message: string): void {
    this.logs.update((current) => {
      if (current[0] === message) {
        return current;
      }
      return [message, ...current].slice(0, 8);
    });
  }

  protected announce(message: string): void {
    this.lastAction.set(message);
    this.addLog(message);
  }
  syncCommandPromptInput(value: string) {
    const input = this.commandInputRef().nativeElement;
    if (!input) {
      return;
    }
    if (input.value !== value) {
      input.value = value;
    }

    input.cursorOffset = value.length;
  }
  protected hideCommandPrompt(): void {
    this.commandPromptVisibleRef = false;
    this.commandPromptValueRef = ':';
    this.commandPromptVisible.set(false);
    this.commandPromptValue.set(':');
    this.commandPromptSelection.set(0);
  }
  protected setAlphaPanelRef(value: ElementRef<BoxRenderable>): void {
    this.alphaPanelRef.set(value);
  }

  protected setBetaPanelRef(value: ElementRef<BoxRenderable>): void {
    this.betaPanelRef.set(value);
  }

  protected getFocusableTargets(): Renderable[] {
    return [this.alphaPanelRef(), this.betaPanelRef(), ...this.editorRefs()]
      .map((item) => item?.nativeElement)
      .filter(
        (target: Renderable | undefined | null): target is Renderable =>
          target !== null && target !== undefined,
      ) as any;
  }

  protected getFocusableLabel(target: Renderable): string {
    if (target === this.alphaPanelRef()?.nativeElement) {
      return 'Alpha panel';
    }
    if (target === this.betaPanelRef()?.nativeElement) {
      return 'Beta panel';
    }
    const editorIndex = this.editorRefs().findIndex((e) => e.nativeElement === target);
    if (editorIndex !== -1) {
      return `${editorSpecs[editorIndex]!.label} editor`;
    }
    return 'target';
  }
  protected moveFocus(direction: 1 | -1): void {
    const targets = this.getFocusableTargets();
    if (targets.length === 0) {
      return;
    }

    const currentIndex = targets.findIndex((t) => t === this.renderer().currentFocusedRenderable);
    const startIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (startIndex + direction + targets.length) % targets.length;
    const target = targets[nextIndex];
    if (!target) return;

    target.focus();
    this.announce(`Focused ${this.getFocusableLabel(target)}`);
  }
  restoreCommandPromptFocus() {
    const restoreTarget = this.commandPromptRestoreTargetRef();
    this.commandPromptRestoreTargetRef.set(null);

    if (restoreTarget && !restoreTarget.isDestroyed) {
      restoreTarget.focus();
      return;
    }

    this.alphaPanelRef()?.nativeElement?.focus();
  }

  protected closeCommandPrompt(message: string): void {
    this.hideCommandPrompt();
    this.restoreCommandPromptFocus();
    this.announce(message);
  }

  protected dismissCommandPromptForFocusChange(focused: Renderable | null): void {
    if (!this.commandPromptVisible() || focused === this.commandInputRef().nativeElement) {
      return;
    }
    this.hideCommandPrompt();
    this.commandPromptRestoreTargetRef.set(null);
    this.announce('Closed ex prompt');
  }

  protected openCommandPrompt(): void {
    if (this.commandPromptVisible()) {
      return;
    }
    this.commandPromptRestoreTargetRef.set(this.renderer().currentFocusedRenderable ?? null);
    this.commandPromptVisibleRef = true;
    this.commandPromptValueRef = ':';
    this.commandPromptVisible.set(true);
    this.commandPromptValue.set(':');
    this.commandPromptSelection.set(0);
    this.announce('Opened ex prompt');
  }

  protected moveCommandPromptSelection(direction: 1 | -1): void {
    this.commandPromptSelection.update((current) =>
      moveExPromptSelection(
        this.discoveredExCommands(),
        this.commandPromptValueRef,
        current,
        direction,
      ),
    );
  }

  protected applyCommandPromptSuggestion(direction?: 1 | -1): void {
    const result = applyExPromptSuggestion(
      this.discoveredExCommands(),
      this.commandPromptValueRef,
      this.commandPromptSelection(),
      direction,
    );
    if (!result) {
      return;
    }

    this.commandPromptSelection.set(result.selection);
    this.commandPromptValue.set(result.value);
    this.syncCommandPromptInput(result.value);
  }

  protected executeCommandPrompt(): void {
    const parsed = parseExPromptInput(this.commandPromptValue());
    if (!parsed) {
      this.closeCommandPrompt('Closed ex prompt');
      return;
    }

    const restoreTarget = this.commandPromptRestoreTargetRef();
    const focused =
      restoreTarget && !restoreTarget.isDestroyed
        ? restoreTarget
        : this.renderer().currentFocusedRenderable;
    const result = this.manager().dispatchCommand(parsed.raw, {
      focused: focused ?? null,
      includeCommand: true,
    });

    if (!result.ok) {
      if (result.reason === 'not-found') {
        this.announce(`Unknown ex command ${parsed.name}`);
        return;
      }

      if (result.reason === 'invalid-args') {
        this.announce(
          `Usage: ${result.command ? (getExPromptCommandFieldText(result.command, 'usage') ?? parsed.name) : parsed.name}`,
        );
        return;
      }

      if (result.reason === 'error') {
        this.announce(`Error running ${parsed.name}`);
        return;
      }

      this.announce(`Command ${parsed.name} was rejected`);
      return;
    }

    this.hideCommandPrompt();
    this.restoreCommandPromptFocus();
  }
  commandPromptSuggestionsSelect = (index: number) =>
    index === Math.min(this.commandPromptSelection(), this.commandPromptSuggestions().length - 1);
}

@Component({
  selector: 'app-keymap-demo',
  imports: [AppContent],
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  viewProviders: [
    {
      provide: KEYMAP_TOKEN,
      useFactory: () => inject(KeymapDemoComponent, { host: true }).keymap,
    },
  ],
  template: `<app-app-content></app-app-content>`,
})
export class KeymapDemoComponent {
  renderer = useRenderer();
  keymap = computed(() => createDemoKeymap(this.renderer()));
}
