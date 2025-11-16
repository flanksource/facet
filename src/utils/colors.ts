const AVATAR_COLORS = [
  'blue',
  'green',
  'yellow',
  'red',
  'purple',
  'pink',
  'indigo',
  'teal',
  'orange',
  'cyan',
  'lime',
  'amber',
  'rose',
  'violet',
  'sky',
];

export function getColorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
