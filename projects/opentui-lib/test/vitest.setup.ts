import { CommonModule } from '@angular/common';
import { ProxyNode } from '../class/proxy-node';
import { BaseRenderable } from '@opentui/core';

globalThis.Node = {
  [Symbol.hasInstance](a: any) {
    return a instanceof ProxyNode || a instanceof CommonModule || a instanceof BaseRenderable;
  },
} as any;
