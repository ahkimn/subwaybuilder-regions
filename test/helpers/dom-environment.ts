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
  // Use defineProperty so we can overwrite getter-only globals like
  // `navigator` (Node 21+) without TypeError.
  const assign = (key: string, value: unknown) => {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  };

  assign('window', dom.window);
  assign('document', dom.window.document);
  assign('navigator', dom.window.navigator);
  assign('HTMLElement', dom.window.HTMLElement);
  assign('Event', dom.window.Event);
  assign('Node', dom.window.Node);
  assign('CustomEvent', dom.window.CustomEvent);
  assign('DocumentFragment', dom.window.DocumentFragment);
  assign('MutationObserver', dom.window.MutationObserver);
  assign('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
  assign(
    'requestAnimationFrame',
    (cb: FrameRequestCallback): number =>
      setTimeout(() => cb(Date.now()), 0) as unknown as number,
  );
  assign('cancelAnimationFrame', (id: number) => {
    clearTimeout(id);
  });

  return () => {
    for (const key of GLOBAL_KEYS) {
      const previousValue = previousValues.get(key);
      if (previousValue === undefined) {
        delete target[key];
      } else {
        assign(key, previousValue);
      }
    }
    dom.window.close();
  };
}
