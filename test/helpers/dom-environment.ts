import { JSDOM } from 'jsdom';

type GlobalKey =
  | 'window'
  | 'document'
  | 'navigator'
  | 'HTMLElement'
  | 'Event'
  | 'Node'
  | 'CustomEvent'
  | 'DocumentFragment'
  | 'MutationObserver'
  | 'getComputedStyle'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame';

const GLOBAL_KEYS: GlobalKey[] = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Event',
  'Node',
  'CustomEvent',
  'DocumentFragment',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
];

export function installDomEnvironment(): () => void {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost',
  });

  const previousValues = new Map<GlobalKey, unknown>();
  for (const key of GLOBAL_KEYS) {
    previousValues.set(key, (globalThis as Record<string, unknown>)[key]);
  }

  const target = globalThis as Record<string, unknown>;
  target.window = dom.window;
  target.document = dom.window.document;
  target.navigator = dom.window.navigator;
  target.HTMLElement = dom.window.HTMLElement;
  target.Event = dom.window.Event;
  target.Node = dom.window.Node;
  target.CustomEvent = dom.window.CustomEvent;
  target.DocumentFragment = dom.window.DocumentFragment;
  target.MutationObserver = dom.window.MutationObserver;
  target.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  target.requestAnimationFrame = (cb: FrameRequestCallback): number =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number;
  target.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };

  return () => {
    for (const key of GLOBAL_KEYS) {
      const previousValue = previousValues.get(key);
      if (previousValue === undefined) {
        delete target[key];
      } else {
        target[key] = previousValue;
      }
    }
    dom.window.close();
  };
}
