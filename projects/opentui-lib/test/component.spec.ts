import { Component, ElementRef, inject, NO_ERRORS_SCHEMA, viewChild } from '@angular/core';
import { testRender } from './util/test-render';
import { initTestEnv } from './util/init-env';
import { ProxyNode } from '../class/proxy-node';

describe('component', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('set properties', async () => {
    @Component({
      selector: 'app-text',
      template: `<text>Hello World</text>`,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      el = inject<ElementRef<ProxyNode>>(ElementRef);
    }
    @Component({
      template: `<app-text fg="#FFFF00" #at>Hello World</app-text>`,
      imports: [TestComponent],
    })
    class C1Component {
      at = viewChild.required<TestComponent>('at');
    }
    const { testSetup, fixture } = await testRender(C1Component, { width: 20, height: 5 });
    expect(fixture.elementRef).ok;

    const comp = fixture.componentInstance.at();
    expect(comp.el.nativeElement.properties).deep.eq({ fg: '#FFFF00' });
  });
});
