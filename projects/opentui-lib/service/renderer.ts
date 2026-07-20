import { Renderer2 } from '@angular/core';
import {
  CliRenderer,
  isRenderable,
  TextNodeRenderable,
  InputRenderable,
  InputRenderableEvents,
  SelectRenderable,
  SelectRenderableEvents,
  TabSelectRenderable,
  TabSelectRenderableEvents,
  TextareaRenderable,
} from '@opentui/core';
import { Instance, Type } from '../types/host';
import { getComponentCatalogue, LinkRenderable } from '../components';
import { getNextId } from '../utils/id';
import {
  ChildNode,
  CommentNode,
  ContainerNode,
  insertChildToContainer,
  isCommentNode,
  isProxyNode,
  ProxyNode,
  ProxyNodeContext,
} from '../class/proxy-node';

function initEventListener(instance: Instance, event: string, listener: any) {
  instance.on(event, listener);
  return () => {
    instance.off(event, listener);
  };
}
export class TerminalRenderer implements Renderer2 {
  public data: { [key: string]: any } = {};

  nodeContext = new ProxyNodeContext();
  appRenderer;
  constructor(appRenderer: CliRenderer) {
    this.appRenderer = appRenderer;
  }
  createProxy() {
    return new ProxyNode(this.nodeContext);
  }
  createElement(type: Type, namespace?: string): any {
    const id = getNextId(type);
    const components = getComponentCatalogue();

    if (!components[type]) {
      return this.createProxy();
    }
    return new components[type](this.appRenderer, {
      id,
    });
  }
  createText(value: string): any {
    return TextNodeRenderable.fromString(value);
  }
  appendChild(parent: ContainerNode | ProxyNode, child: ChildNode): void {
    if (isProxyNode(parent)) {
      if (isProxyNode(child)) {
        child.linkProxy(parent);
      } else {
        parent.appendChild(child);
      }
    } else {
      if (isProxyNode(child)) {
        child.linkContainer(parent);
      } else {
        this.nodeContext.removeBeforeAdd(child);

        if (!isCommentNode(child)) {
          parent.add(child);
        }
      }
    }
    this.nodeContext.appendChild(parent, child);
  }

  removeChild(parent: ContainerNode | ProxyNode | undefined, child: ChildNode): void {
    if (this.appRenderer.root.isDestroyed) {
      return;
    }
    let container;
    if (isProxyNode(child)) {
      container = child.parent!;
    } else {
      if (isCommentNode(child)) {
        this.nodeContext.removeChild(child.parent!, child);
        return;
      } else {
        container = this.parentNode(child)!;
      }
    }
    if (!container) {
      return;
    }
    if (isProxyNode(container)) {
      container.remove(child);
    } else {
      if (isProxyNode(child)) {
        child.unlinkContainer();
      } else {
        child.parent?.remove(child);
      }
    }
    this.nodeContext.removeChild(container as any, child);
  }
  destroyNode(node: Instance): null {
    if (isRenderable(node)) {
      this.nodeContext.boxMap.delete(node);
    }
    return null;
  }
  selectRootElement(selectorOrElement: any, options?: any): any {
    return this.appRenderer.root;
  }

  insertBefore(
    parent: ContainerNode | ProxyNode,
    newChild: ChildNode,
    refChild: ChildNode | null,
    isMove: boolean = false,
  ): void {
    if (isProxyNode(parent)) {
      if (isProxyNode(newChild)) {
        newChild.linkProxy(parent, refChild);
      } else {
        parent.appendChild(newChild, refChild);
      }
    } else {
      if (isProxyNode(newChild)) {
        newChild.linkContainer(parent, refChild ?? undefined);
      } else {
        this.nodeContext.removeBeforeAdd(newChild);

        if (isProxyNode(refChild)) {
          if (!isCommentNode(newChild)) {
            insertChildToContainer(parent, newChild, refChild.getAnchor(0));
          }
        } else {
          let inputRefChild = refChild;
          if (!isCommentNode(newChild)) {
            if (isCommentNode(refChild)) {
              const maybeParent = refChild.parent!;
              if (isProxyNode(maybeParent)) {
                inputRefChild = maybeParent.getAnchor(0)!;
              } else {
                inputRefChild = this.nodeContext.boxMap.get(maybeParent!)!.realRef(refChild)!;
              }
            }
            insertChildToContainer(parent, newChild, inputRefChild);
          }
        }
      }
    }
    this.nodeContext.insertBefore(parent, newChild, refChild);
  }
  nextSibling(node: ChildNode) {
    const maybeParent = node.parent!;
    let list;
    if (isProxyNode(maybeParent)) {
      list = maybeParent.children;
    } else {
      list = this.nodeContext.boxMap.get(maybeParent)?.realList;
    }
    if (!list) {
      return null;
    }
    const index = list.findIndex((item) => item === node);
    if (ngDevMode && index === -1) {
      throw new Error('nextSibling Query Error');
    }
    return list[index + 1] ?? null;
  }
  createComment(value: string) {
    return new CommentNode(value);
  }
  parentNode(node: ChildNode) {
    return this.nodeContext.parentNode(node);
  }
  setProperty(target: any, name: string, value: any): void {
    this.setPropertyInternal(target, name, value);
  }

  private setPropertyInternal(target: any, name: string, value: any): void {
    switch (name) {
      case 'focused': {
        if (isRenderable(target)) {
          if (value) {
            target.focus();
          } else {
            target.blur();
          }
        }
        return;
      }
      case 'href': {
        if (target instanceof LinkRenderable) {
          target.link = { url: value };
          return;
        }
        break;
      }
      default:
        break;
    }

    (target as any)[name] = value;
  }

  setStyle(el: any, style: string, value: any, flags?: unknown): void {
    this.setProperty(el, style, value);
  }

  setAttribute(target: any, name: string, value: any): void {
    this.setProperty(target, name, value);
  }

  listen(
    target: 'window' | 'document' | 'body' | any,
    event: string,
    callback: (event: any) => any,
  ): () => void {
    switch (event) {
      case 'onChange':
        if (target instanceof InputRenderable) {
          return initEventListener(target, InputRenderableEvents.CHANGE, callback);
        } else if (target instanceof SelectRenderable) {
          return initEventListener(target, SelectRenderableEvents.SELECTION_CHANGED, callback);
        } else if (target instanceof TabSelectRenderable) {
          return initEventListener(target, TabSelectRenderableEvents.SELECTION_CHANGED, callback);
        }
        break;

      case 'onInput':
        if (target instanceof InputRenderable) {
          return initEventListener(target, InputRenderableEvents.INPUT, callback);
        }
        break;

      case 'onSubmit':
        if (target instanceof InputRenderable) {
          return initEventListener(target, InputRenderableEvents.ENTER, callback);
        } else if (target instanceof TextareaRenderable) {
          target.onSubmit = callback;
          return () => {
            target.onSubmit = undefined;
          };
        }
        break;

      case 'onSelect':
        if (target instanceof SelectRenderable) {
          return initEventListener(target, SelectRenderableEvents.ITEM_SELECTED, callback);
        } else if (target instanceof TabSelectRenderable) {
          return initEventListener(target, TabSelectRenderableEvents.ITEM_SELECTED, callback);
        }
        break;

      default:
        if (!isRenderable(target)) {
          return () => {};
        }
        (target as any)[event] = callback;
        return () => {};
    }
    return () => {};
  }

  removeAttribute(target: any, name: string, namespace?: string): void {
    this.setProperty(target, name, undefined);
  }

  addClass(el: any, name: string): void {}

  removeClass(el: any, name: string): void {}

  removeStyle(el: any, style: string, flags?: unknown): void {
    this.setProperty(el, style, undefined);
  }

  setValue(node: TextNodeRenderable, value: string): void {
    node.children = [];
    node.add(value);
  }

  destroy(): void {}
}
