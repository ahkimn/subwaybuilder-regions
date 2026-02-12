import { createElement, ReactNode } from "react";

type SelectButton = {
  element: HTMLButtonElement;
  setActive: (active: boolean) => void;
  blur: () => void;
}

interface SelectButtonConfig {
  label: string;
  onSelect: () => void
}

export type DOMSelectButtonConfig = SelectButtonConfig & { icon?: SVGElement };
export type ReactSelectButtonConfig = SelectButtonConfig & { icon?: ReactNode };

export type SelectRowStyle = {
  containerClass: string;
  baseButtonClass: string;
  activeButtonClass: string;
  inactiveButtonClass: string;
  iconWrapperClass: string;
};

export const MAX_SELECT_BUTTONS = 4;
const DEFAULT_SELECT_ROW_STYLE: SelectRowStyle = {
  containerClass: 'flex items-center gap-1 h-8',
  baseButtonClass: [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md font-medium",
    "transition-colors",
    "focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "border border-input",
    "px-4 pl-2 pr-2 py-2 h-8",
    "text-xs",
  ].join(" "),
  activeButtonClass: 'hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary',
  inactiveButtonClass: 'hover:bg-accent hover:text-accent-foreground bg-primary-foreground',
  iconWrapperClass: 'mr-2'
};

export class SelectRow {
  private container: HTMLDivElement;
  private buttons: SelectButton[] = [];
  private buttonConfigs: DOMSelectButtonConfig[] = [];
  private activeIndex = -1;

  constructor(
    id: string,
    configs: DOMSelectButtonConfig[],
    initialIndex?: number,
    style: SelectRowStyle = DEFAULT_SELECT_ROW_STYLE,
    fullWidth: boolean = true
  ) {
    this.container = document.createElement('div');
    this.container.className = style.containerClass;
    this.container.id = id;

    if (configs.length === 0 || configs.length > MAX_SELECT_BUTTONS) {
      throw new Error(
        `SelectRow must have between 1 and ${MAX_SELECT_BUTTONS} buttons but received ${configs.length}`
      );
    }

    this.buttonConfigs = configs;

    configs.forEach((cfg, index) => {
      const rowButton = buildSelectRowButton(
        cfg,
        `${id}-button-${index}`,
        style,
        fullWidth
      );

      rowButton.element.addEventListener('click', () => this.select(index));
      this.buttons.push(rowButton);
      this.container.appendChild(rowButton.element);
    });

    if (configs.length > 0) {
      this.select(initialIndex !== undefined ? initialIndex : 0, true);
    }
  }

  private select(index: number, initialSelect: boolean = false) {
    if (this.activeIndex === index) return;

    // Update button active states. Only one should be active at a time
    this.buttons.forEach((btn, i) =>
      btn.setActive(i === index)
    );

    this.activeIndex = index;

    this.buttons[index]!.blur();

    // On initialization we want to set the button active but not trigger the callback to avoid side effects on the parent object
    if (!initialSelect) {
      this.buttonConfigs[index]!.onSelect();
    }
  }

  get element(): HTMLElement {
    return this.container;
  }
}

export function ReactSelectRow(
  h: typeof createElement,
  configsMap: Map<string, ReactSelectButtonConfig>,
  activeId: string | null,
  id?: string | undefined,
  fullWidth: boolean = true,
  style: SelectRowStyle = DEFAULT_SELECT_ROW_STYLE
): ReactNode {

  if (configsMap.size === 0 || configsMap.size > MAX_SELECT_BUTTONS) {
    throw new Error(
      `SelectRow must have between 1 and ${MAX_SELECT_BUTTONS} buttons but received ${configsMap.size}`
    );
  }

  return h(
    "div",
    { id, className: style.containerClass },
    Array.from(configsMap.entries()).map(([id, cfg]) => {
      return h(
        "button",
        {
          key: id,
          type: "button",
          className: getSelectButtonClassName(style, id === activeId, fullWidth),
          onClick: cfg.onSelect,
        },
        cfg.icon ? h("span", { className: style.iconWrapperClass }, cfg.icon) : null,
        cfg.label
      )
    })
  );
}

function buildSelectRowButton(
  options: DOMSelectButtonConfig,
  buttonId: string,
  style: SelectRowStyle,
  fullWidth: boolean = true
): SelectButton {

  const button = document.createElement('button');
  button.id = buttonId;

  // Icon should be placed after text to match game UI
  button.appendChild(document.createTextNode(options.label));

  function setActive(active: boolean) {
    button.className = getSelectButtonClassName(style, active, fullWidth);
  }

  if (options.icon) {
    const wrap = document.createElement('span');
    wrap.className = style.iconWrapperClass;
    wrap.appendChild(options.icon);
    button.appendChild(wrap);
  }

  setActive(false);

  return {
    element: button,
    setActive,
    blur: () => button.blur()
  }
}

function getSelectButtonClassName(
  style: SelectRowStyle,
  isActive: boolean,
  fullWidth?: boolean
): string {
  return [
    style.baseButtonClass,
    isActive ? style.activeButtonClass : style.inactiveButtonClass,
    fullWidth ? 'w-full' : ''
  ].filter(Boolean).join(' ');
}
