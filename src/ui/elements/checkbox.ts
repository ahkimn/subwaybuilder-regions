import { CheckboxIconHTML } from "./utils/get-icon";

export function createCheckBoxIcon(): HTMLSpanElement {
  const iconWrapper = document.createElement('span');
  iconWrapper.className =
    'flex items-center justify-center text-current';
  iconWrapper.style.pointerEvents = 'none';

  iconWrapper.innerHTML = CheckboxIconHTML;
  return iconWrapper;
}

export function createCheckbox(elementId: string): HTMLButtonElement {
  // Checkbox button -- mirrors current SubwayBuilder UI style
  const button = document.createElement('button');
  button.type = 'button';
  button.role = 'checkbox';
  button.id = elementId;

  button.className =
    'peer h-4 w-4 shrink-0 rounded-sm border border-primary ' +
    'ring-offset-background focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-ring ' +
    'focus-visible:ring-offset-2 disabled:cursor-not-allowed ' +
    'disabled:opacity-50 ' +
    'data-[state=checked]:bg-primary ' +
    'data-[state=checked]:text-primary-foreground';
  return button;
}

export function updateCheckboxState(iconWrapper: HTMLSpanElement, button: HTMLButtonElement, visible: boolean): void {

  button.setAttribute('aria-checked', String(visible));
  button.dataset.state = visible ? 'checked' : 'unchecked';

  const hasIcon = iconWrapper.parentElement === button;

  if (visible && !hasIcon) {
    button.appendChild(iconWrapper);
  } else if (!visible && hasIcon) {
    iconWrapper.remove();
  } else {
    console.warn("[Regions] Unexpected state in toggle button with id: ", button.id);
  }

  iconWrapper.dataset.state = visible ? 'checked' : 'unchecked';
}
