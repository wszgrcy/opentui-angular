import {
  ComponentRef,
  EnvironmentInjector,
  Component,
  createComponent,
  inject,
  input,
  computed,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { AngularPlugin } from '@cyia/opentui-angular';
import { ExternalSidebarPanelComponent } from './slot-components.js';

export type ExternalPluginSlots = {
  statusbar: { label: string };
  sidebar: { section: string };
};

export type ExternalPluginContext = {
  appName: string;
  version: string;
};

const CAPABILITIES = ['statusbar extension', 'sidebar extension', 'external jsx components'];

export function loadExternalPlugin(): AngularPlugin<ExternalPluginSlots, ExternalPluginContext> {
  return {
    id: 'external-angular-plugin',
    order: 20,
    slots: {
      statusbar: ((_ctx, props) => {
        @Component({
          template: `<box
            [border]="true"
            borderStyle="single"
            borderColor="#16a34a"
            [marginLeft]="1"
            [paddingLeft]="1"
            [paddingRight]="1"
            [height]="3"
          >
            <text fg="#bbf7d0">{{ hostLabel() }}</text>
          </box>`,
          standalone: true,
          schemas: [NO_ERRORS_SCHEMA],
        })
        class StatusCardComponent {
          host = input.required<string>();
          label = input.required<string>();
          version = input.required<string>();

          hostLabel = computed(() => `${this.host()} -> ${this.label()} (${this.version()})`);
        }

        let componentRef: ComponentRef<StatusCardComponent>;
        return (ctx, props) => {
          if (!componentRef) {
            componentRef = createComponent(StatusCardComponent, {
              environmentInjector: inject(EnvironmentInjector),
            });
          }
          componentRef.setInput('host', ctx.appName);
          componentRef.setInput('label', props.label);
          componentRef.setInput('version', ctx.version);
          return componentRef;
        };
      })(),
      sidebar: (() => {
        let componentRef: ComponentRef<any>;
        return (_ctx, props) => {
          if (!componentRef) {
            @Component({
              selector: 'external-sidebar-wrapper',
              standalone: true,
              imports: [ExternalSidebarPanelComponent],
              schemas: [NO_ERRORS_SCHEMA],
              template: `
                <box flexDirection="column">
                  <external-sidebar-panel [section]="section()" [capabilities]="capabilities()" />
                  <box
                    [marginTop]="1"
                    [border]="true"
                    borderStyle="single"
                    borderColor="#334155"
                    flexDirection="column"
                    [padding]="1"
                  >
                    <text fg="#cbd5e1">External plugin UI loaded from disk</text>
                    <text fg="#93c5fd">No in-bundle React plugin code required.</text>
                  </box>
                </box>
              `,
            })
            class SidebarWrapperComponent {
              section = input.required<string>();
              capabilities = input.required<string[]>();
            }

            componentRef = createComponent(SidebarWrapperComponent, {
              environmentInjector: inject(EnvironmentInjector),
            });
          }
          componentRef.setInput('section', props.section);
          componentRef.setInput('capabilities', CAPABILITIES);
          return componentRef;
        };
      })(),
    },
  };
}
