import { RootTextNodeRenderable, ScrollBoxRenderable, TextRenderable } from '@opentui/core';
import { Container, Instance } from '../types/host';

export type CommonNode = Instance;
export type ContainerNode = Container;
export type ChildNode = Instance | ProxyNode | CommentNode;

export function insertChildToContainer(
  container: Container | undefined,
  newChild: CommonNode,
  anchor?: ChildNode | null,
) {
  if (!container) return;
  if (!anchor) {
    return container.add(newChild);
  } else {
    return container.insertBefore(newChild, anchor);
  }
}

function countBefore(list: ChildNode[], node?: ChildNode): number {
  let count = 0;
  let checkNoCommentNode = false;
  for (const item of list) {
    if (checkNoCommentNode) {
      if (isCommentNode(item)) {
        continue;
      } else {
        break;
      }
    }
    if (isCommentNode(item)) {
      if (node && node === item) {
        checkNoCommentNode = true;
      }
      continue;
    } else if (node && node === item) {
      break;
    } else if (isProxyNode(item)) {
      count += countBefore(item.children);
    } else {
      if (isCommentNode(item)) {
        continue;
      }
      count++;
    }
  }
  return count;
}

export class CommentNode {
  content;
  parent?: Container | ProxyNode;
  constructor(content: string) {
    this.content = content;
  }
}
export function isCommentNode(node: any): node is CommentNode {
  return node instanceof CommentNode;
}
export class ProxyNode {
  #parentContainer?: ContainerNode;
  parentProxy: ProxyNode | undefined = undefined;
  context;
  children: ChildNode[] = [];
  get parent(): ProxyNode | ContainerNode | null {
    return this.parentProxy ?? this.#parentContainer ?? null;
  }
  constructor(context: ProxyNodeContext) {
    this.context = context;
  }
  linkProxy(parent: ProxyNode, refChild?: ChildNode | null) {
    this.parentProxy?.remove(this);
    this.parentProxy = parent;
    if (refChild) {
      const index = parent.children.indexOf(refChild);
      if (ngDevMode && index === -1) {
        throw new Error('linkProxy Query Error');
      }
      parent.children.splice(index, 0, this);
    } else {
      parent.children.push(this);
    }
    this.#insertAll();
  }
  linkContainer(parent: ContainerNode, refChild?: ChildNode) {
    this.parentProxy?.remove(this);
    this.parentProxy = undefined;
    this.#parentContainer = parent;
    this.#insertAll(refChild);
  }
  unlinkProxy() {
    this.#removeAllOnly();
    this.parentProxy = undefined;
  }
  unlinkContainer() {
    this.#removeAllOnly();
    this.#parentContainer = undefined;
  }

  getContainer(): Container | undefined {
    if (this.parentProxy) {
      return this.parentProxy.getContainer();
    }
    return this.#parentContainer;
  }
  getInsertPosition(node?: ChildNode) {
    return countBefore(this.children, node);
  }
  #getStartIndex(refChild?: ChildNode): number {
    if (this.parentProxy) {
      return this.parentProxy.getInsertPosition(this) + this.parentProxy.#getStartIndex();
    }
    const instance = this.context.boxMap.get(this.getContainer()!);

    return instance ? (countBefore(instance?.realList, refChild ?? this) ?? 0) : 0;
  }

  getAnchor(offset?: number, refChild?: ChildNode) {
    const base = this.#getStartIndex(refChild);
    const count = base + (typeof offset === 'number' ? offset : this.getInsertPosition(undefined));
    const container = this.getContainer();
    if (!container) {
      return undefined;
    }
    if (container instanceof TextRenderable) {
      return container.getTextChildren()[count];
    }
    return container.getChildren()[count];
  }
  #removeContainerChild(child: CommonNode | CommentNode) {
    if (!isCommentNode(child)) {
      child.parent?.remove(child);
    }
  }
  #removeAllOnly() {
    this.children.forEach((child) => {
      if (isProxyNode(child)) {
        child.#removeAllOnly();
      } else {
        this.#removeContainerChild(child);
      }
    });
  }
  remove(child: ChildNode) {
    const index = this.children.indexOf(child);
    if (ngDevMode && index === -1) {
      throw new Error('remove Query Error');
    }
    if (isProxyNode(child)) {
      child.unlinkProxy();
    } else {
      this.#removeContainerChild(child);
    }
    this.children.splice(index, 1);
  }

  appendChild(newChild: CommonNode | CommentNode, refChild?: ChildNode | null) {
    this.context.removeBeforeAdd(newChild);

    let index;
    if (refChild) {
      index = this.children.indexOf(refChild);
      if (ngDevMode && index === -1) {
        throw new Error('insertBefore Query Error');
      }
    }
    if (!isCommentNode(newChild)) {
      const insertAnchor = refChild
        ? this.getAnchor(this.getInsertPosition(refChild))
        : this.getAnchor();
      insertChildToContainer(this.getContainer(), newChild, insertAnchor);
    }
    if (refChild) {
      this.children.splice(index!, 0, newChild);
    } else {
      this.children.push(newChild);
    }
  }

  #insertAll(refChild?: ChildNode) {
    for (const item of this.children) {
      if (isProxyNode(item)) {
        item.#insertAll(refChild);
      } else {
        if (!isCommentNode(item)) {
          const anchor = this.getAnchor(this.getInsertPosition(item), refChild);
          const result = insertChildToContainer(this.getContainer(), item, anchor);
          if (ngDevMode && (result as any) === -1) {
            throw new Error('#insertAll Insert Error');
          }
        }
      }
    }
  }
}
export function isProxyNode(node: any): node is ProxyNode {
  return node instanceof ProxyNode;
}
class NodeInfo {
  realList: ChildNode[] = [];

  realRef(node: ChildNode) {
    if (isProxyNode(node)) {
      return node.getAnchor(0);
    } else if (isCommentNode(node)) {
      let index = this.realList.indexOf(node);
      if (ngDevMode && index === -1) {
        throw new Error('realRef Query Error');
      }
      let nextNode;
      do {
        index++;
        nextNode = this.realList[index];
        if (isProxyNode(nextNode)) {
          return nextNode.getAnchor(0);
        }
      } while (nextNode && isCommentNode(nextNode));
      return nextNode;
    } else {
      return node;
    }
  }
}
export class ProxyNodeContext {
  boxMap = new Map<CommonNode, NodeInfo>();
  appendChild(container: ContainerNode | ProxyNode, child: ChildNode) {
    if (isCommentNode(child)) {
      child.parent = container;
    }
    if (isProxyNode(container)) {
      return;
    }
    const instance = this.boxMap.get(container) ?? new NodeInfo();
    instance.realList.push(child);
    this.boxMap.set(container, instance);
  }
  removeChild(container: ContainerNode | ProxyNode, child: ChildNode) {
    if (isCommentNode(child)) {
      child.parent = undefined;
    }
    if (isProxyNode(container)) {
      return;
    }
    const instance = this.boxMap.get(container)!;
    const index = instance.realList.indexOf(child);
    if (ngDevMode && index === -1) {
      throw new Error('removeChild Query Error');
    }
    instance.realList.splice(index, 1);
  }
  insertBefore(parent: ContainerNode | ProxyNode, newChild: ChildNode, refChild: ChildNode | null) {
    if (isCommentNode(newChild)) {
      newChild.parent = parent;
    }
    if (isProxyNode(parent)) {
      return;
    }
    const instance = this.boxMap.get(parent) ?? new NodeInfo();
    if (refChild) {
      const index = instance.realList.indexOf(refChild);
      if (ngDevMode && index === -1) {
        throw new Error('insertBefore Query Error');
      }
      instance.realList.splice(index, 0, newChild);
    } else {
      instance.realList.push(newChild);
    }

    this.boxMap.set(parent, instance);
  }
  parentNode(node: ChildNode) {
    const maybeParent = node.parent;
    if (!maybeParent) {
      return null;
    }
    if (isProxyNode(maybeParent)) {
      return maybeParent;
    }
    let returnParent = maybeParent;
    if (returnParent instanceof RootTextNodeRenderable) {
      returnParent = returnParent.textParent ?? undefined;
    }

    const scrollBoxCandidate = returnParent?.parent?.parent?.parent;
    if (
      scrollBoxCandidate instanceof ScrollBoxRenderable &&
      scrollBoxCandidate.content === returnParent
    ) {
      returnParent = scrollBoxCandidate;
    }
    const ctx = this.boxMap.get(returnParent);
    if (!ctx) {
      return null;
    }

    return this._findInRealList(ctx.realList, node, returnParent);
  }

  private _findInRealList(
    realList: ChildNode[],
    node: ChildNode,
    returnParent: ProxyNode | CommonNode | null,
  ): ProxyNode | CommonNode | null {
    for (const item of realList) {
      if (item === node) {
        return returnParent;
      }
    }
    for (const item of realList) {
      if (isProxyNode(item)) {
        const result = this._findInRealList(item.children, node, item);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }
  removeBeforeAdd(child: CommonNode | CommentNode) {
    const parent = this.parentNode(child);
    if (isProxyNode(parent)) {
      parent.remove(child);
    } else if (!isCommentNode(child)) {
      child.parent?.remove(child);
    }
  }
}
