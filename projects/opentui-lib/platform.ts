import {
  EnvironmentProviders,
  Provider,
  RendererFactory2,
  Sanitizer,
  DOCUMENT,
  providePlatformInitializer,
  PLATFORM_ID,
  ɵINJECTOR_SCOPE,
  ErrorHandler,
  ɵsetDocument,
} from '@angular/core';
import {
  LocationChangeListener,
  PlatformLocation,
  ɵsetRootDomAdapter,
  ɵDomAdapter,
} from '@angular/common';
import { EventManager } from '@angular/platform-browser';
import { TerminalSanitizer } from './service/sanitizer';
import { TerminalRendererFactory } from './service/renderer-factory';
const doc: Document = {} as any;

class TDomAdapter extends ɵDomAdapter {
  dispatchEvent(el: any, evt: any): any {
    return null;
  }
  readonly supportsDOMEvents: boolean = false;
  remove(el: any): void {}
  createElement(tagName: any, doc?: any): HTMLElement {
    throw new Error('createElement not found');
  }
  createHtmlDocument(): Document {
    return doc;
  }
  getDefaultDocument(): Document {
    return doc;
  }
  isElementNode(node: any): boolean {
    return false;
  }
  isShadowRoot(node: any): boolean {
    return false;
  }
  onAndCancel(el: any, evt: any, listener: any, options?: any): Function {
    return () => {};
  }
  getGlobalEventTarget(doc: Document, target: string): any {
    return null;
  }
  getBaseHref(doc: Document): string | null {
    return null;
  }
  resetBaseElement(): void {}
  getUserAgent(): string {
    return '';
  }
  getCookie(name: string): string | null {
    return null;
  }
}
export function getDocument() {
  return doc;
}
class TPlatformLocation implements PlatformLocation {
  getBaseHrefFromDOM(): string {
    return '';
  }
  getState(): unknown {
    return null;
  }
  onPopState(fn: LocationChangeListener): VoidFunction {
    return () => {};
  }
  onHashChange(fn: LocationChangeListener): VoidFunction {
    return () => {};
  }
  get href(): string {
    return '';
  }
  get protocol(): string {
    return '';
  }
  get hostname(): string {
    return '';
  }
  get port(): string {
    return '';
  }
  get pathname(): string {
    return '';
  }
  get search(): string {
    return '';
  }
  get hash(): string {
    return '';
  }
  replaceState(state: any, title: string, url: string): void {
    // noop
  }
  pushState(state: any, title: string, url: string): void {
    // noop
  }
  forward(): void {
    // noop
  }
  back(): void {
    // noop
  }
  historyGo?(relativePosition: number): void {
    // noop
  }
}

export function provideOpentuiPlatformProviders() {
  return [
    { provide: PLATFORM_ID, useValue: 'opentui' },
    { provide: DOCUMENT, useFactory: getDocument },
    providePlatformInitializer(() => {
      ɵsetDocument(doc as any);
      ɵsetRootDomAdapter(new TDomAdapter());
      // temp fix
      const oldRaf = global.requestAnimationFrame;
      let index = 0;
      const animationRequest = new Map<number, NodeJS.Timeout>();
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        const timeout = setTimeout(() => {
          oldRaf(callback);
        });
        animationRequest.set(index++, timeout);
        return index;
      };
      global.cancelAnimationFrame = (input: number) => {
        clearTimeout(animationRequest.get(input));
      };
    }),
  ];
}

export function provideAppProviders(): (Provider | EnvironmentProviders)[] {
  return [
    { provide: ɵINJECTOR_SCOPE, useValue: 'root' },
    { provide: ErrorHandler, useFactory: () => new ErrorHandler() },
    EventManager,
    { provide: Sanitizer, useClass: TerminalSanitizer },
    {
      provide: RendererFactory2,
      useClass: TerminalRendererFactory,
    },
    {
      provide: PlatformLocation,
      useClass: TPlatformLocation,
    },
  ];
}
