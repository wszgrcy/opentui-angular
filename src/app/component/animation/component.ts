import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TextAttributes } from '@opentui/core';
import { useTimeline } from '@cyia/opentui-angular';

interface StatEntry {
  name: string;
  key: keyof Stats;
  color: string;
}

interface Stats {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

@Component({
  selector: 'app-animation',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class AnimationComponent {
  protected readonly TextAttributes = TextAttributes;

  protected animatedSystem = signal<Stats>({
    cpu: 0,
    memory: 0,
    network: 0,
    disk: 0,
  });

  protected round(value: number): number {
    return Math.round(value);
  }

  protected readonly statsMap: StatEntry[] = [
    { name: 'CPU', key: 'cpu', color: '#6a5acd' },
    { name: 'Memory', key: 'memory', color: '#4682b4' },
    { name: 'Network', key: 'network', color: '#20b2aa' },
    { name: 'Disk', key: 'disk', color: '#daa520' },
  ];

  timeline = useTimeline({
    duration: 3000,
    loop: false,
  });
  constructor() {
    this.timeline.add(
      this.animatedSystem(),
      {
        cpu: 85,
        memory: 70,
        network: 95,
        disk: 60,
        duration: 3000,
        ease: 'linear',
        onUpdate: (values) => {
          this.animatedSystem.set({ ...values.targets[0] });
        },
      },
      0,
    );
  }
}
