import {
  ComponentRef,
  Directive,
  inject,
  input,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';

@Directive({
  selector: '[componentRef]',
  exportAs: 'componentRef',
})
export class ComponentRefDirective {
  componentRef = input.required<ComponentRef<any>>();
  viewContainerRef = inject(ViewContainerRef);
  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewContainerRef.length) {
      this.viewContainerRef.detach(0);
    }
    this.viewContainerRef.insert(this.componentRef()!.hostView);
  }
  ngOnDestroy(): void {}
}
