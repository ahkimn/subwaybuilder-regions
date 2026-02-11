import { createIconElement, RefreshIcon } from "./utils/get-icon";

type CreateElement = (...args: unknown[]) => unknown;

// Unused for now
export function RefreshButton(onClick: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md h-7 px-2';
  const iconElement = createIconElement(RefreshIcon, { size: 16 });
  button.appendChild(iconElement);
  button.addEventListener('click', onClick);
  return button;
}

export function ReactRefreshButton(
  h: CreateElement,
  Icon: unknown,
  onClick: () => void,
  title?: string
): unknown {
  console.log("Rendering ReactRefreshButton with icon:", Icon, typeof Icon);
  return h(
    "button",
    {
      type: "button",
      title: title ?? "Refresh",
      "aria-label": title ?? "Refresh",
      onClick,
      className: [
        "inline-flex items-center justify-center",
        "h-7 w-7 rounded-md border border-input",
        "bg-background text-muted-foreground",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
      ].join(" "),
    },
    Icon && (typeof Icon === "function" || typeof Icon === "object")
      ? h(Icon, { className: "size-4" })
      : h("span", { className: "text-xs font-medium" }, "R")
  );
}
