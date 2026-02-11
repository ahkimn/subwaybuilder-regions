type CreateElement = (...args: unknown[]) => unknown;

export type ReactSelectRowOption = {
  id: string;
  label: string;
  onSelect: () => void;
};

type ReactSelectRowProps = {
  h: CreateElement;
  options: ReactSelectRowOption[];
  activeId: string | null;
  id?: string;
  fullWidth?: boolean;
};

const BASE_BUTTON_CLASS = [
  "inline-flex items-center justify-center gap-2",
  "whitespace-nowrap rounded-md font-medium",
  "transition-colors",
  "focus-visible:outline-none",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  "border border-input",
  "h-8 text-xs px-4 py-2",
].join(" ");

const ACTIVE_CLASS = "hover:bg-secondary-foreground/90 hover:text-secondary bg-secondary-foreground text-secondary";
const INACTIVE_CLASS = "hover:bg-accent hover:text-accent-foreground bg-primary-foreground";

export function ReactSelectRow(props: ReactSelectRowProps): unknown {
  const { h, options, activeId, id, fullWidth } = props;

  return h(
    "div",
    { id, className: "flex items-center gap-1 h-8" },
    ...options.map((option) => {
      const isActive = option.id === activeId;
      return h(
        "button",
        {
          key: option.id,
          type: "button",
          className: [
            BASE_BUTTON_CLASS,
            fullWidth ? "w-full" : "",
            isActive ? ACTIVE_CLASS : INACTIVE_CLASS,
          ].join(" "),
          onClick: option.onSelect,
        },
        option.label
      );
    })
  );
}
