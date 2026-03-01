import { afterEach, beforeEach } from 'node:test';

import { cleanup } from '@testing-library/react';

import { installDomEnvironment } from './dom-environment';

export function setupDomTestLifecycle(): void {
  let restoreDom: (() => void) | null = null;

  beforeEach(() => {
    restoreDom = installDomEnvironment();
  });

  afterEach(() => {
    cleanup();
    restoreDom?.();
    restoreDom = null;
  });
}
