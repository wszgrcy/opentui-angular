import { Injectable, RendererFactory2, inject, Renderer2 } from '@angular/core';
import { TerminalRenderer } from './renderer';
import { CliRendererToken } from '../token/cli-render.token';
import { ProxyNode } from '../class/proxy-node';
import { Instance } from '../types/host';

@Injectable()
export class TerminalRendererFactory implements RendererFactory2 {
  private readonly appRenderer = inject(CliRendererToken);
  instanceToProxy = new Map<Instance, ProxyNode>();
  renderer = new TerminalRenderer(this.appRenderer);
  createRenderer(hostElement: any, type: any): Renderer2 {
    return this.renderer;
  }

  end(): void {
    this.flushRender();
  }

  private flushRender(): void {
    this.appRenderer.requestRender();
  }
}
