import { Component, ElementRef, NO_ERRORS_SCHEMA, signal, viewChild } from '@angular/core';
import { ImageRenderable, VideoRenderable } from '@opentui/core';
import { testRender } from './util/test-render';
import { initTestEnv } from './util/init-env';

describe('media components', () => {
  beforeEach(async () => {
    initTestEnv();
  });

  it('creates image and video renderables and keeps their inputs in sync', async () => {
    @Component({
      template: `
        <image #img [fit]="fit()" [width]="4" [height]="2"></image>
        <video #vid [fit]="fit()" [width]="4" [height]="2" [autoplay]="false"></video>
      `,
      schemas: [NO_ERRORS_SCHEMA],
    })
    class TestComponent {
      fit = signal<'fit' | 'cover'>('fit');
      img = viewChild.required<ElementRef<ImageRenderable>>('img');
      vid = viewChild.required<ElementRef<VideoRenderable>>('vid');
    }

    const { testSetup, fixture } = await testRender(TestComponent, {
      width: 20,
      height: 6,
    });
    await testSetup.renderOnce();

    const image = fixture.componentInstance.img().nativeElement;
    const video = fixture.componentInstance.vid().nativeElement;
    expect(image).toBeInstanceOf(ImageRenderable);
    expect(video).toBeInstanceOf(VideoRenderable);
    expect(image.fit).toBe('fit');
    expect(video.fit).toBe('fit');
    expect(video.autoplay).toBe(false);

    fixture.componentInstance.fit.set('cover');
    fixture.detectChanges();
    await fixture.whenStable();
    await testSetup.renderOnce();

    expect(image.fit).toBe('cover');
    expect(video.fit).toBe('cover');
  });
});
