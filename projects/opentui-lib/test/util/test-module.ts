import { ɵprovideFakePlatformNavigation } from '@angular/common/testing';
import { NgModule, APP_ID, Injectable } from '@angular/core';
import { TestComponentRenderer } from '@angular/core/testing';
import { provideAppProviders } from '../../platform';
@Injectable()
export class DOMTestComponentRenderer extends TestComponentRenderer {
  override insertRootElement(rootElId: string, tagName?: string) {}

  override removeAllRootElements() {}
}

@NgModule({
  providers: [
    { provide: APP_ID, useValue: 'opentui' },
    ɵprovideFakePlatformNavigation(),
    { provide: TestComponentRenderer, useClass: DOMTestComponentRenderer },
    ...provideAppProviders(),
  ],
})
export class TerminalTestingModule {}
