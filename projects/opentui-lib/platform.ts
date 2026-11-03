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

/** Approximates one display frame; Node has no `requestAnimationFrame` of its own. */
const FRAME_INTERVAL_MS = 16;

export interface FrameScheduler {
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

function createTimerFrameScheduler(): FrameScheduler {
  const handles = new Map<number, ReturnType<typeof setTimeout>>();
  let nextHandle = 1;
  return {
    requestAnimationFrame(callback: FrameRequestCallback): number {
      const handle = nextHandle++;
      handles.set(
        handle,
        setTimeout(() => {
          handles.delete(handle);
          callback(Date.now());
        }, FRAME_INTERVAL_MS),
      );
      return handle;
    },
    cancelAnimationFrame(handle: number): void {
      const timer = handles.get(handle);
      if (timer === undefined) return;
      handles.delete(handle);
      clearTimeout(timer);
    },
  };
}

/**
 * Moves the hand-off to a renderer frame out of the caller's turn, so change detection never runs inside the
 * render loop it is asking to redraw.
 */
function deferFrameScheduler(scheduler: FrameScheduler): FrameScheduler {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextHandle = 1;
  return {
    requestAnimationFrame(callback: FrameRequestCallback): number {
      const handle = nextHandle++;
      timers.set(
        handle,
        setTimeout(() => {
          timers.delete(handle);
          scheduler.requestAnimationFrame(callback);
        }),
      );
      return handle;
    },
    cancelAnimationFrame(handle: number): void {
      const timer = timers.get(handle);
      if (timer === undefined) {
        scheduler.cancelAnimationFrame(handle);
        return;
      }
      timers.delete(handle);
      clearTimeout(timer);
    },
  };
}

let frameScheduler: FrameScheduler = createTimerFrameScheduler();

/**
 * Runs Angular's frame callbacks on the renderer's own frames instead of on a timer. `@opentui/core` used to
 * install a global `requestAnimationFrame` for every consumer; since 0.5 the renderer only exposes the instance
 * methods, so the adapter wires them up itself. Until this runs the timer-backed scheduler stands in.
 */
export function bindFrameScheduler(scheduler: FrameScheduler): void {
  frameScheduler = deferFrameScheduler(scheduler);
}

function installGlobalFrameScheduler(): void {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
    frameScheduler.requestAnimationFrame(callback);
  globalThis.cancelAnimationFrame = (handle: number) => frameScheduler.cancelAnimationFrame(handle);
}

export function provideOpentuiPlatformProviders() {
  return [
    { provide: PLATFORM_ID, useValue: 'opentui' },
    { provide: DOCUMENT, useFactory: getDocument },
    providePlatformInitializer(() => {
      ɵsetDocument(doc as any);
      ɵsetRootDomAdapter(new TDomAdapter());
      installGlobalFrameScheduler();
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
