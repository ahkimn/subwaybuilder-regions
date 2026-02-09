import { Primitive, AllPrimitives } from "@shared/types";

export type InlineToggleOption<T> = {
  value: Primitive;
  field: keyof T;
  label: string;
}

export function InlineToggle<T extends AllPrimitives<T>>(
  state: T,
  options: InlineToggleOption<T>[][],
  onClick: (state: T) => void,
) {

  const el = document.createElement('span');
  el.className = 'text-[0.65rem] text-muted-foreground ml-1 whitespace-nowrap';
  el.appendChild(document.createTextNode('['));

  for (const toggleOptionBlock of options) {
    for (const toggleOption of toggleOptionBlock) {
      const toggleSpan = document.createElement('span');

      const isActive = toggleOption.value === state[toggleOption.field];
      toggleSpan.className = isActive ? 'text-foreground font-medium' : 'cursor-pointer hover:text-foreground';
      toggleSpan.textContent = toggleOption.label;

      toggleSpan.onclick = () => {
        // Present an updated state to the callback with the toggled value
        const updatedState = { ...state };
        updatedState[toggleOption.field] = toggleOption.value as T[typeof toggleOption.field];
        onClick(updatedState);
      }

      el.appendChild(toggleSpan);
      if (toggleOption !== toggleOptionBlock[toggleOptionBlock.length - 1]) {
        el.appendChild(document.createTextNode('/'));
      }

    }
    if (toggleOptionBlock !== options[options.length - 1]) {
      el.appendChild(document.createTextNode(' | '));
    }
  }
  el.appendChild(document.createTextNode(']'));
  return el;
}