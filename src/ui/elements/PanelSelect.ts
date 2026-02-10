
export function PanelSelect(
  label: string,
  id: string,
  onClick: () => void,
  iconSVG?: SVGElement
): {
  el: HTMLElement,
  setActive: (active: boolean) => void
} {

  const baseClass = [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-md font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'border border-input',
    'px-4 w-full pl-3 pr-2 py-2 h-8',
    'text-xs'
  ].join(' ');

  // Style classes for active/inactive states.
  const activeClass = 'hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary'
  const inactiveClass = 'hover:bg-accent hover:text-accent-foreground bg-primary-foreground';

  const button = document.createElement('button');
  button.id = id;
  button.textContent = label;

  function setActive(active: boolean) {
    button.className = `${baseClass} ${active ? activeClass : inactiveClass}`;
  }

  if (iconSVG) {
    const span = document.createElement('span');
    span.className = 'mr-2';
    span.appendChild(iconSVG);
    button.appendChild(span);
  }

  button.addEventListener('click', onClick);

  setActive(false);
  return {
    el: button,
    setActive
  };
}
