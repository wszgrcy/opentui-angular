import { Component, NO_ERRORS_SCHEMA } from '@angular/core';

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Proin dictum rutrum mi, ac egestas elit dictum ac.',
  'Aliquam erat volutpat. Nullam in nisi vitae turpis consequat ultrices.',
  'Sed posuere pretium metus, a posuere est consequat nec.',
  'Curabitur nec quam sed augue congue vestibulum.',
  'Suspendisse tincidunt, augue at rhoncus cursus, urna felis malesuada leo.',
  'Nam molestie euismod faucibus. Quisque id odio in pede ornare luctus.',
  'Integer consequat, quam at congue cursus, magna eros pretium enim.',
  'Vivamus cursus, ex eu tincidunt cursus, libero massa dictum arcu.',
  'Morbi auctor magna a ultricies consequat.',
];

const boxColors = [
  '#2e3440',
  '#bf616a',
  '#a3be8c',
  '#ebcb8b',
  '#81a1c1',
  '#b48ead',
  '#88c0d0',
  '#5e81ac',
  '#d08770',
  '#e5e9f0',
  '#414868',
  '#7aa2f7',
  '#292e42',
  '#373d52',
  '#24283b',
  '#cdd6f4',
];

// Helper function that creates a random selection of `num` lines from LOREM
const getRandomLoremLines = (num: number) => {
  const lines: string[] = [];
  for (let i = 0; i < num; i++) {
    const idx = Math.floor(Math.random() * LOREM.length);
    lines.push(LOREM[idx]);
  }
  return lines;
};

@Component({
  selector: 'app-scroll',
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './component.html',
})
export class ScrollComponent {
  protected readonly boxItems = Array.from({ length: 16 }, (_, i) => ({
    bg: boxColors[i % boxColors.length],
    lines: getRandomLoremLines(2 + Math.floor(Math.random() * 4)),
  }));
}
