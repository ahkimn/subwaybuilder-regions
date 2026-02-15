export function Label(
  parentElementId: string,
  labelText: string,
): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = parentElementId;
  label.className =
    'text-sm select-none cursor-pointer hover:text-foreground transition-colors';
  label.textContent = labelText;
  return label;
}
