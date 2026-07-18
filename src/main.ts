import { App } from './app/app';
import { bootstrapApplication, CliRendererToken } from '@cyia/opentui-angular';
import { createCliRenderer } from '@opentui/core';
const renderer = createCliRenderer();
renderer.then((cliRenderer) =>
  bootstrapApplication(App, {
    providers: [{ provide: CliRendererToken, useValue: cliRenderer }],
  }).catch((err) => console.error(err)),
);
