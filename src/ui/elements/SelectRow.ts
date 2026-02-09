import { PanelSelect } from "./PanelSelect";

type PanelSelectConfig = {
  label: string;
  onSelect: () => void;
  iconHTML?: string;
};

export const MAX_SELECT_BUTTONS = 4;

export class SelectRow {
  private container: HTMLDivElement;
  private buttons: ReturnType<typeof PanelSelect>[] = [];
  private buttonConfigs: PanelSelectConfig[] = [];
  private activeIndex = -1;

  constructor(
    id: string,
    configs: PanelSelectConfig[],
    initialIndex?: number
  ) {
    this.container = document.createElement('div');
    this.container.className = 'flex gap-1';
    this.container.id = id;

    if (configs.length === 0 || configs.length > MAX_SELECT_BUTTONS) {
      throw new Error(
        `SelectRow must have between 1 and ${MAX_SELECT_BUTTONS} buttons but received ${configs.length}`
      );
    }

    this.buttonConfigs = configs;

    configs.forEach((cfg, index) => {
      const btn = PanelSelect(
        cfg.label,
        `${id}-${index}`,
        () => this.select(index),
        cfg.iconHTML
      );

      this.buttons.push(btn);
      this.container.appendChild(btn.el);
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

    this.buttons[index]!.el.blur();

    // On initialization we want to set the button active but not trigger the callback to avoid side effects on the parent object
    if (!initialSelect) {
      this.buttonConfigs[index]!.onSelect();
    }
  }

  get element(): HTMLElement {
    return this.container;
  }
}
