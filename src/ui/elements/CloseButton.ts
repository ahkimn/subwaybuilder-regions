import { CloseIcon, createIconElement } from './utils/get-icon';

export function CloseButton(onClick: () => void) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center h-full w-fit';

  const button = document.createElement('button');
  button.className =
    'inline-flex items-center justify-center h-6 w-6 p-0.5 ml-auto ' +
    'rounded-md hover:bg-accent hover:text-accent-foreground';

  button.setAttribute('aria-label', 'Close');
  const iconElement = createIconElement(CloseIcon, { size: 16 });
  button.appendChild(iconElement);
  button.addEventListener('click', onClick);
  wrapper.appendChild(button);
  return wrapper;
}
