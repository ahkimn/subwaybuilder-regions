import { RefreshIconHTML } from "./utils/get-icon";

export function RefreshButton(onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md h-7 px-2';
  button.innerHTML = RefreshIconHTML;
  button.addEventListener('click', onClick);
  return button;
}
