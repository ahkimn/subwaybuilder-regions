// Component-agnostic pointer-drag helper. Makes any element movable via an
// inline `transform: translate(x, y)`, exactly in the same manner as thethe game's native draggable
// panels.

export type Point = { x: number; y: number };

export type DraggableOptions = {
  // Only begin a drag when the pointerdown target is within this selector. The whole element is draggable if this parameter is omitted.
  handleSelector?: string;
  // Never begin a drag from targets matching this selector (interactive controls).
  ignoreSelector?: string;
  // Initial translate position (applied immediately). Defaults to {0, 0}.
  initialPosition?: Point;
  // Keep at least this many px of the element on-screen horizontally.
  minVisiblePx?: number;
  // Keep at least this many px of the element's top edge on-screen vertically.
  edgeGutterPx?: number;
  // Called after each drag-driven position change (e.g. to persist it). 
  onChange?: (position: Point) => void;
};

export type DraggableHandle = {
  // Programmatically move the element without clamping.
  setPosition(position: Point): void;
  getPosition(): Point;
  // Detach all listeners; idempotent.
  destroy(): void;
};

const DEFAULT_MIN_VISIBLE_PX = 80;
const DEFAULT_EDGE_GUTTER_PX = 36;
const DEFAULT_IGNORE_SELECTOR =
  'button, a, input, select, textarea, [role="button"]';

export function makeDraggable(
  element: HTMLElement,
  options: DraggableOptions = {},
): DraggableHandle {
  const {
    handleSelector,
    ignoreSelector = DEFAULT_IGNORE_SELECTOR,
    minVisiblePx = DEFAULT_MIN_VISIBLE_PX,
    edgeGutterPx = DEFAULT_EDGE_GUTTER_PX,
    onChange,
  } = options;

  let position: Point = { ...(options.initialPosition ?? { x: 0, y: 0 }) };
  let pointerId: number | null = null;
  let origin = { pointerX: 0, pointerY: 0, startX: 0, startY: 0 };

  const apply = (): void => {
    element.style.transform = `translate(${position.x}px, ${position.y}px)`;
  };

  const clamp = (x: number, y: number): Point => {
    const width = element.offsetWidth;
    const minX = minVisiblePx - width;
    const maxX = window.innerWidth - minVisiblePx;
    const maxY = window.innerHeight - edgeGutterPx;
    return {
      x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(y, 0), Math.max(0, maxY)),
    };
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === null) return;
    position = clamp(
      origin.startX + (event.clientX - origin.pointerX),
      origin.startY + (event.clientY - origin.pointerY),
    );
    apply();
    onChange?.(position);
  };

  const onPointerUp = (): void => {
    if (pointerId === null) return;
    pointerId = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (handleSelector && !target?.closest(handleSelector)) return;
    if (ignoreSelector && target?.closest(ignoreSelector)) return;

    pointerId = event.pointerId;
    origin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    event.preventDefault();
  };

  element.addEventListener('pointerdown', onPointerDown);
  apply();

  return {
    setPosition(next: Point): void {
      position = { ...next };
      apply();
    },
    getPosition(): Point {
      return { ...position };
    },
    destroy(): void {
      onPointerUp();
      element.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
