import type { LayerToggleOptions } from '../types/LayerToggleOptions';
import { Label } from './Label';
import { CheckboxIcon, createIconElement } from './utils/Icons';

export function Checkbox(
  options: LayerToggleOptions,
  attributeName: string,
  attributeValue: string = 'true',
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.setAttribute(attributeName, attributeValue);

  const buttonElementId = `regions-toggle-${options.id}`;
  const icon = buildCheckBoxIcon();
  const button = buildButtonElement(buttonElementId);
  const label = Label(buttonElementId, options.label);
  button.appendChild(icon);

  const syncState = () => {
    const visible = options.isVisible();
    button.setAttribute('aria-checked', String(visible));
    button.dataset.state = visible ? 'checked' : 'unchecked';

    console.log(`[Regions] Syncing checkbox state for ${options.id}, visible: ${visible}`);

    if (visible && !button.contains(icon)) {
      button.appendChild(icon);
    } else if (!visible && button.contains(icon)) {
      icon.remove();
    }

    icon.dataset.state = visible ? 'checked' : 'unchecked';
  };

  // Initial state
  syncState();

  // Click handler
  button.addEventListener('click', () => {
    options.toggle();
    syncState();
  });

  row.appendChild(button);
  row.appendChild(label);

  return row;
}

export function buildCheckBoxIcon(): HTMLSpanElement {
  const iconWrapper = document.createElement('span');
  iconWrapper.className = 'flex items-center justify-center text-current';
  iconWrapper.style.pointerEvents = 'none';

  const iconElement = createIconElement(CheckboxIcon, {
    size: 24,
    className: 'h-4 w-4',
  });
  iconWrapper.appendChild(iconElement);
  return iconWrapper;
}

function buildButtonElement(elementId: string): HTMLButtonElement {
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
