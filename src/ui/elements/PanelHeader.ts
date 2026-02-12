import { CloseButton } from './CloseButton';

export function PanelHeader(
  title: string,
  onClose: () => void,
): {
  el: HTMLElement;
  setTitle: (newTitle: string) => void;
} {
  const header = document.createElement('div');
  header.className = [
    'flex h-9 min-h-9 w-full p-1',
    'border-b border-primary/15',
    'items-center justify-between bg-primary-foreground',
  ].join(' ');

  const left = document.createElement('div');
  left.className = 'flex items-center h-full w-full';

  const center = document.createElement('div');
  center.className = 'flex items-center h-full w-full';

  const h1 = document.createElement('h1');
  h1.className = 'font-semibold whitespace-nowrap';

  function setTitle(newTitle: string) {
    h1.textContent = newTitle;
  }

  center.appendChild(h1);

  const right = document.createElement('div');
  right.className = 'flex items-center h-full w-full gap-1 justify-end';
  right.appendChild(CloseButton(onClose));

  header.append(left, center, right);

  setTitle(title);
  return {
    el: header,
    setTitle,
  };
}
