import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Component } from '@angular/core';
import { testRender } from './util/test-render';
import { initTestEnv } from './util/init-env';
@Component({
  selector: 'app-hello',
  template: `<text>hello</text> `,
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
})
class TestComponent {}

describe('startup', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('should create', async () => {
    const { testSetup, fixture } = await testRender(TestComponent, { width: 20, height: 5 });
    expect(fixture.elementRef).ok;
    const str = testSetup.captureCharFrame();
    expect(str.trim()).eq('hello');
  });
});
