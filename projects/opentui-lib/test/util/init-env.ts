import { platformCore } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideOpentuiPlatformProviders } from '../../platform';
import { TerminalTestingModule } from './test-module';

export function initTestEnv() {
  TestBed.platform.destroy();
  TestBed.resetTestEnvironment();
  TestBed.initTestEnvironment(
    [TerminalTestingModule],
    platformCore(provideOpentuiPlatformProviders()),
    {
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    },
  );
}
