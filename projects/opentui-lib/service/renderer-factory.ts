import { Injectable, RendererFactory2, inject, Renderer2 } from '@angular/core';
import { TerminalRenderer } from './renderer';
import { CliRendererToken } from '../token/cli-render.token';

@Injectable()
export class TerminalRendererFactory implements RendererFactory2 {
  private readonly appRenderer = inject(CliRendererToken);
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
