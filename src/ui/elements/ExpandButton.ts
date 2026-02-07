export function ExpandButton(nRows: number, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'text-xs text-primary underline self-start';
  button.innerHTML = `Expand (${nRows} additional rows)`;
  button.addEventListener('click', onClick);
  return button;
}
