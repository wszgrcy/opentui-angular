import { Injectable, Sanitizer, SecurityContext } from '@angular/core';

@Injectable()
export class TerminalSanitizer extends Sanitizer {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  sanitize(_context: SecurityContext, value: {} | string | null): string | null {
    if (value === null) return null;
    return `${value ?? ''}`;
  }
}
