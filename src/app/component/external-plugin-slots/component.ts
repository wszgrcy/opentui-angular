import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { SlotMode } from '@opentui/core';
import { Component, computed, effect, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import {
  AngularPlugin,
  createAngularSlotRegistry,
  Slot,
  useKeyboard,
  useRenderer,
} from '@cyia/opentui-angular';

const STATUSBAR_LABEL = 'host-status';
const SIDEBAR_SECTION = 'external-plugins';
const DEFAULT_PLUGIN_ENTRY = '.plugin/index.ts';
const EXTERNAL_PLUGIN_PATH_ENV = 'OPENTUI_ANGULAR_EXTERNAL_PLUGIN_PATH';

const moduleDir = dirname(fileURLToPath(import.meta.url));

type ExternalPluginSlots = {
  statusbar: { label: string };
  sidebar: { section: string };
};

type ExternalPluginContext = {
  appName: string;
  version: string;
};

type ExternalPluginModule = {
  loadExternalPlugin(): AngularPlugin<ExternalPluginSlots, ExternalPluginContext>;
};

function normalizePath(input: string): string {
  if (input.startsWith('file://')) {
    return fileURLToPath(input);
  }

  if (isAbsolute(input)) {
    return input;
  }

  return resolve(process.cwd(), input);
}

function resolveExternalPluginCandidates(): string[] {
  const paths = new Set<string>();
  const envPath = process.env[EXTERNAL_PLUGIN_PATH_ENV];

  if (envPath && envPath.trim().length > 0) {
    paths.add(normalizePath(envPath.trim()));
  }

  paths.add(resolve(process.cwd(), 'packages', 'angular', 'examples', DEFAULT_PLUGIN_ENTRY));
  paths.add(resolve(dirname(process.execPath), '..', '..', DEFAULT_PLUGIN_ENTRY));
  paths.add(resolve(moduleDir, DEFAULT_PLUGIN_ENTRY));
  paths.add(join(dirname(process.execPath), DEFAULT_PLUGIN_ENTRY));
  paths.add(resolve(dirname(process.execPath), '..', DEFAULT_PLUGIN_ENTRY));
  paths.add(resolve(process.cwd(), DEFAULT_PLUGIN_ENTRY));

  return [...paths];
}

function resolveExternalPluginPath(): string {
  const candidates = resolveExternalPluginCandidates();

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate external plugin. Checked: ${candidates.join(', ')}`);
}

async function loadExternalPluginFromDisk(
  nonce: number,
): Promise<{ path: string; plugin: AngularPlugin<ExternalPluginSlots, ExternalPluginContext> }> {
  // const path = resolveExternalPluginPath();
  // const url = pathToFileURL(path);
  // url.searchParams.set('reload', `${nonce}`);
  // url.searchParams.set('ts', `${Date.now()}`);

  const externalModule = await import('../.plugin/index');

  if (typeof externalModule.loadExternalPlugin !== 'function') {
    throw new Error('External plugin module does not export loadExternalPlugin()');
  }

  return {
    path: '../.plugin/index',
    plugin: externalModule.loadExternalPlugin(),
  };
}

const hostContext: ExternalPluginContext = {
  appName: 'angular-external-plugin-demo',
  version: '1.0.0',
};

function nextStatusbarMode(mode: SlotMode): SlotMode {
  if (mode === 'append') {
    return 'replace';
  }

  if (mode === 'replace') {
    return 'single_winner';
  }

  return 'append';
}

@Component({
  selector: 'app-external-plugin-slots-demo',
  imports: [Slot],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class ExternalPluginSlotsDemoComponent {
  protected readonly renderer = useRenderer();
  protected registry = computed(() =>
    createAngularSlotRegistry<ExternalPluginSlots, ExternalPluginContext>(
      this.renderer(),
      hostContext,
    ),
  );

  protected statusbarMode = signal<SlotMode>('append');
  protected pluginEnabled = signal(true);
  protected reloadNonce = signal(0);
  protected loadedPluginPath = signal('(not loaded yet)');
  protected lastPluginId = signal('(none)');
  protected lastLoadError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.renderer().setBackgroundColor('#000000');
    });

    effect((onCleanup) => {
      const dispose = this.registry().onPluginError((event) => {
        this.lastLoadError.set(`${event.phase}: ${event.error.message}`);
      });
      onCleanup(dispose);
    });

    effect((onCleanup) => {
      let cleanedUp = false;
      let unregisterPlugin: (() => void) | null = null;

      if (!this.pluginEnabled()) {
        this.lastPluginId.set('(disabled)');
        this.lastLoadError.set(null);
        onCleanup(() => {
          cleanedUp = true;
        });
        return;
      }
      this.lastLoadError.set(null);
      const nonce = this.reloadNonce();

      void (async () => {
        try {
          const { path, plugin } = await loadExternalPluginFromDisk(nonce);
          if (cleanedUp) {
            return;
          }

          const unregister = this.registry().register(plugin);
          unregisterPlugin = () => {
            unregister();
          };

          this.loadedPluginPath.set(path);
          this.lastPluginId.set(plugin.id);
          this.lastLoadError.set(null);
        } catch (error) {
          const message =
            error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          this.lastPluginId.set('(load failed)');
          this.lastLoadError.set(message);
        }
      })();
      onCleanup(() => {
        cleanedUp = true;
        if (unregisterPlugin) {
          unregisterPlugin();
          unregisterPlugin = null;
        }
      });
    });

    // Keyboard shortcuts
    useKeyboard((key) => {
      switch (key.name) {
        case 'm':
          this.statusbarMode.update((current) => nextStatusbarMode(current));
          break;
        case 'p':
          this.pluginEnabled.update((current) => !current);
          break;
        case 'r':
          this.reloadNonce.update((current) => current + 1);
          break;
        case 'c':
          if (key.ctrl) {
            key.preventDefault();
            this.renderer().destroy();
          }
          break;
      }
    });
  }

  protected readonly STATUSBAR_LABEL = STATUSBAR_LABEL;
  protected readonly SIDEBAR_SECTION = SIDEBAR_SECTION;

  protected get info(): string {
    return [
      'Angular External Plugin Slot Demo',
      '',
      `External plugin env override: ${EXTERNAL_PLUGIN_PATH_ENV}`,
      `External plugin resolved path: ${this.loadedPluginPath()}`,
      `Last loaded plugin id: ${this.lastPluginId()}`,
      `Last plugin load error: ${this.lastLoadError() ?? '(none)'}`,
      '',
      `Plugin enabled: ${this.pluginEnabled() ? 'ON' : 'OFF'} (press p)`,
      `Statusbar mode: ${this.statusbarMode().toUpperCase()} (press m to cycle)`,
      'Press r to reload external plugin from disk and re-register.',
      '',
      `Statusbar slot label: ${STATUSBAR_LABEL}`,
      `Sidebar slot section: ${SIDEBAR_SECTION}`,
      '',
      'The plugin renders external components for both slots.',
    ].join('\n');
  }
}
