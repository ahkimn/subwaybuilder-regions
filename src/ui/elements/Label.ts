export function Label(
  parentElementId: string,
  labelText: string,
): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = parentElementId;
  label.className = 'text-sm select-none cursor-pointer';
  label.textContent = labelText;
  return label;
}
