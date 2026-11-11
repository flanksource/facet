let calls = 0;

export function data() {
  calls += 1;
  return { name: `Campaign-${calls}` };
}
