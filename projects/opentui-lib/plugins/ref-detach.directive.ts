import { Directive, input, SimpleChanges } from '@angular/core';
import { ComponentRefDirective } from './container-ref.directive';

@Directive({
  selector: '[refDetach]',
})
export class RefDetachDirective {
  list = input.required<readonly ComponentRefDirective[]>();
  refDetach = input.required<number>();
  ngOnChanges(changes: SimpleChanges): void {
    const typeChanage = changes['refDetach'];
    if (typeChanage && !typeChanage.firstChange) {
      for (const item of this.list()) {
        let length = item.viewContainerRef.length;
        while (length) {
          item.viewContainerRef.detach(0);
          length--;
        }
      }
    }
  }
}
