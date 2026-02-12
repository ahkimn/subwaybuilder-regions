export function Divider(width: number = 1): HTMLDivElement {
  const d = document.createElement('div');
  d.className = `border-t border-border/40 my-${width}`;
  return d;
}
