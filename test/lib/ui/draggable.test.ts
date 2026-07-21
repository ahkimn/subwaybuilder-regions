import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { makeDraggable } from '@lib/ui/draggable';

import { installDomEnvironment } from '../../helpers/dom-environment';

let restore: () => void;

beforeEach(() => {
  restore = installDomEnvironment();
});

afterEach(() => {
  restore();
});

function pointer(type: string, init: MouseEventInit): MouseEvent {
  // jsdom lacks PointerEvent; a MouseEvent with a `pointer*` type triggers the
  // same listeners and carries the clientX/clientY/button we rely on.
  return new window.MouseEvent(type, { bubbles: true, button: 0, ...init });
}

function makeHandleElement(): { el: HTMLElement; header: HTMLElement } {
  const el = document.createElement('div');
  const header = document.createElement('div');
  header.setAttribute('data-drag-handle', '');
  el.appendChild(header);
  document.body.appendChild(el);
  return { el, header };
}

describe('lib/ui/draggable makeDraggable', () => {
  it('applies the initial position as a transform', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    makeDraggable(el, { initialPosition: { x: 8, y: 8 } });
    assert.equal(el.style.transform, 'translate(8px, 8px)');
  });

  it('setPosition / getPosition move the element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = makeDraggable(el);
    handle.setPosition({ x: 100, y: 50 });
    assert.equal(el.style.transform, 'translate(100px, 50px)');
    assert.deepEqual(handle.getPosition(), { x: 100, y: 50 });
  });

  it('drags from the handle and updates the position by the pointer delta', () => {
    const { el, header } = makeHandleElement();
    const handle = makeDraggable(el, {
      handleSelector: '[data-drag-handle]',
      initialPosition: { x: 100, y: 100 },
    });

    header.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    window.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 40 }));
    window.dispatchEvent(pointer('pointerup', {}));

    assert.deepEqual(handle.getPosition(), { x: 150, y: 140 });
  });

  it('does not start a drag from an ignored control (button)', () => {
    const { el, header } = makeHandleElement();
    const button = document.createElement('button');
    header.appendChild(button);
    const handle = makeDraggable(el, {
      handleSelector: '[data-drag-handle]',
      initialPosition: { x: 100, y: 100 },
    });

    button.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    window.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 40 }));

    assert.deepEqual(handle.getPosition(), { x: 100, y: 100 });
  });

  it('does not start a drag outside the handle selector', () => {
    const el = document.createElement('div');
    const body = document.createElement('div'); // not a drag handle
    el.appendChild(body);
    document.body.appendChild(el);
    const handle = makeDraggable(el, {
      handleSelector: '[data-drag-handle]',
      initialPosition: { x: 100, y: 100 },
    });

    body.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    window.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 40 }));

    assert.deepEqual(handle.getPosition(), { x: 100, y: 100 });
  });

  it('destroy() detaches the drag listener', () => {
    const { el, header } = makeHandleElement();
    const handle = makeDraggable(el, {
      handleSelector: '[data-drag-handle]',
      initialPosition: { x: 100, y: 100 },
    });

    handle.destroy();
    header.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    window.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 40 }));

    assert.deepEqual(handle.getPosition(), { x: 100, y: 100 });
  });
});
