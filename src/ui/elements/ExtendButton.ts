import {
  ChevronDownIcon,
  ChevronUpIcon,
  createIconElement,
} from './utils/get-icon';

export function ExtendButton(
  direction: 'Expand' | 'Collapse',
  nRows: number,
  onClick: () => void,
): HTMLElement {
  const button = document.createElement('button');
  const text = `${direction === 'Expand' ? 'Show' : 'Hide'} (${nRows} Row${nRows > 1 ? 's' : ''})`;

  button.className = [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'hover:bg-accent',
    'rounded-md px-3 mt-1 h-7',
    'text-xs text-muted-foreground hover:text-foreground',
  ].join(' ');

  button.innerHTML = text;
  const icon = createIconElement(
    direction === 'Expand' ? ChevronDownIcon : ChevronUpIcon,
    { size: 12, className: 'ml-1 h-3 w-3' },
  );
  button.appendChild(icon);
  button.addEventListener('click', onClick);
  return button;
}
