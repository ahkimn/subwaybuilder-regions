export function ExtendButton(direction: 'Expand' | 'Collapse', nRows: number, onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'text-xs text-primary underline self-start';
  button.innerHTML = `${direction} (${nRows} ${direction === 'Expand' ? 'additional' : ''} rows)`;
  button.addEventListener('click', onClick);
  return button;
}
