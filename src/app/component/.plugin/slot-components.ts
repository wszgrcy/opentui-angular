import { Component, computed, input, NO_ERRORS_SCHEMA } from '@angular/core';

@Component({
  selector: 'external-status-card',
  standalone: true,
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <box
      [border]="true"
      borderStyle="single"
      borderColor="#16a34a"
      [marginLeft]="1"
      [paddingLeft]="1"
      [paddingRight]="1"
      [height]="3"
    >
      <text fg="#bbf7d0">{{ hostLabel() }}</text>
    </box>
  `,
})
export class ExternalStatusCardComponent {
  host = input.required<string>();
  label = input.required<string>();
  version = input.required<string>();

  hostLabel = computed(() => `${this.host()} -> ${this.label()} (${this.version()})`);
}

@Component({
  selector: 'external-sidebar-panel',
  standalone: true,
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <box
      [border]="true"
      borderStyle="single"
      borderColor="#06b6d4"
      flexDirection="column"
      [paddingLeft]="1"
      [paddingRight]="1"
    >
      <text fg="#67e8f9">External plugin section: {{ section() }}</text>
      @for (capability of capabilities(); track capability) {
        <text fg="#bae6fd">- {{ capability }}</text>
      }
    </box>
  `,
})
export class ExternalSidebarPanelComponent {
  section = input.required<string>();
  capabilities = input.required<string[]>();
}
