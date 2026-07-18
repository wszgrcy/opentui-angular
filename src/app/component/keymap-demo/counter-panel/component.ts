import {
  Component,
  NO_ERRORS_SCHEMA,
  viewChild,
  ElementRef,
  input,
  model,
  output,
  computed,
  effect,
} from '@angular/core';
import { useKeymap, useBindings } from '@cyia/opentui-angular/keymap';
import { BoxRenderable, TextAttributes } from '@opentui/core';
import { getCountPayload, palette, PanelId } from '../const';
import { Binding } from '@opentui/keymap';
import { KeyLabel } from '../key-label/component';

@Component({
  selector: 'app-counter-panel',
  imports: [KeyLabel],
  schemas: [NO_ERRORS_SCHEMA],
  standalone: true,
  templateUrl: './component.html',
})
export class CounterPanel {
  manager = useKeymap();
  targetRef = viewChild.required<ElementRef<BoxRenderable>>('targetRef');
  protected readonly palette = palette;
  protected readonly TextAttributes = TextAttributes;

  id = input.required<PanelId>();
  label = input.required<string>();
  saveTarget = input.required<string>();
  step = input.required<number>();
  color = input.required<string>();
  count = model.required<number>();
  readonly announce = output<string>();
  readonly refChange = output<ElementRef<BoxRenderable>>();

  incrementCommand = computed(() => `${this.id()}-up`);
  decrementCommand = computed(() => `${this.id()}-down`);
  incrementCountCommand = computed(() => `${this.id()}-up-count`);
  decrementCountCommand = computed(() => `${this.id()}-down-count`);

  protected commands = computed(() => {
    const id = this.id();
    const label = this.label();
    const step = this.step();
    return [
      {
        name: this.incrementCommand(),
        title: `${label} +${step}`,
        desc: `${label} +${step}`,
        category: label,
        run: () => {
          this.count.update((value) => {
            const next = value + step;
            this.announce.emit(`${label} increased to ${next}`);
            return next;
          });
        },
      },
      {
        name: this.incrementCountCommand(),
        title: `${label} +count`,
        desc: `${label} +count`,
        category: label,
        run: ({ payload }: { payload?: unknown }) => {
          this.count.update((value) => {
            const amount = getCountPayload(payload) * step;
            const next = value + amount;
            this.announce.emit(`${label} increased by ${amount} to ${next}`);
            return next;
          });
        },
      },
      {
        name: this.decrementCommand(),
        title: `${label} -${step}`,
        desc: `${label} -${step}`,
        category: label,
        run: () => {
          this.count.update((value) => {
            const next = value - step;
            this.announce.emit(`${label} decreased to ${next}`);
            return next;
          });
        },
      },
      {
        name: this.decrementCountCommand(),
        title: `${label} -count`,
        desc: `${label} -count`,
        category: label,
        run: ({ payload }: { payload?: unknown }) => {
          this.count.update((value) => {
            const amount = getCountPayload(payload) * step;
            const next = value - amount;
            this.announce.emit(`${label} decreased by ${amount} to ${next}`);
            return next;
          });
        },
      },
    ];
  });

  // Keymap layer registration (migrated from useEffect)
  constructor() {
    useBindings(() => ({
      targetRef: this.targetRef().nativeElement,
      bindings: [
        { key: 'j', cmd: this.decrementCommand(), desc: `${this.label()} -${this.step()}` },
        { key: 'k', cmd: this.incrementCommand(), desc: `${this.label()} +${this.step()}` },
        { key: '{count}j', cmd: this.decrementCountCommand(), desc: `${this.label()} -count` },
        { key: '{count}k', cmd: this.incrementCountCommand(), desc: `${this.label()} +count` },
        {
          key: 'return',
          cmd: `:w ${this.saveTarget}`,
          desc: `Write ${this.label().toLowerCase()} panel`,
        },
      ] satisfies Binding[],
    }));
    effect((onCleanup) => {
      const dispose = this.manager().registerLayer({ commands: this.commands() });
      onCleanup(dispose);
    });

    effect(() => {
      this.refChange.emit(this.targetRef());
    });
  }
}
