import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { useKeyboard, useRenderer } from '@cyia/opentui-angular';
import { bold, fg, italic, t, TextAttributes } from '@opentui/core';

type FocusTarget = 'username' | 'password';
type StatusType = 'idle' | 'invalid' | 'success';

@Component({
  selector: 'app-basic',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class BasicComponent {
  protected readonly renderer = useRenderer();
  protected username = signal('');
  protected password = signal('');
  protected focused = signal<FocusTarget>('username');
  protected status = signal<StatusType>('idle');
  protected styledText = signal(t`${bold(italic(fg('cyan')(`Styled Text!`)))}`);
  readonly textAttr = TextAttributes.BOLD | TextAttributes.ITALIC;
  constructor() {
    useKeyboard((key) => {
      if (key.name === 'tab') {
        this.focused.update((prevFocused) =>
          prevFocused === 'username' ? 'password' : 'username',
        );
      }

      if (key.ctrl && key.name === 'k') {
        this.renderer()?.toggleDebugOverlay();
        this.renderer()?.console?.toggle();
      }
    });
  }

  protected handleUsernameChange(value: string): void {
    this.username.set(value);
  }

  protected handlePasswordChange(value: string): void {
    this.password.set(value);
  }

  protected handleSubmit(): void {
    if (this.username() === 'admin' && this.password() === 'secret') {
      this.status.set('success');
    } else {
      this.status.set('invalid');
    }
  }
}
