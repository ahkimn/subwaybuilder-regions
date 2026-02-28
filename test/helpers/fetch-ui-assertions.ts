import assert from 'node:assert/strict';

import {
  modRegionsIdSelector,
  REGIONS_SETTINGS_FETCH_CITY_WARNING_ID,
  REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID,
  REGIONS_SETTINGS_FETCH_COUNTRY_WARNING_ID,
  REGIONS_SETTINGS_FETCH_DATASETS_WARNING_ID,
} from '../../src/core/constants';

type FetchWarningField = 'city' | 'country' | 'datasets' | 'command';

const WARNING_ID_BY_FIELD: Record<FetchWarningField, string> = {
  city: REGIONS_SETTINGS_FETCH_CITY_WARNING_ID,
  country: REGIONS_SETTINGS_FETCH_COUNTRY_WARNING_ID,
  datasets: REGIONS_SETTINGS_FETCH_DATASETS_WARNING_ID,
  command: REGIONS_SETTINGS_FETCH_COMMAND_WARNING_ID,
};

export function queryByRegionsId(
  regionsId: string,
  root: ParentNode = document,
): HTMLElement | null {
  return root.querySelector(modRegionsIdSelector(regionsId));
}

export function byRegionsId(
  regionsId: string,
  root: ParentNode = document,
): HTMLElement {
  const element = queryByRegionsId(regionsId, root);
  assert.ok(element, `Expected element with data-regions-id="${regionsId}"`);
  return element;
}

export function existsWarning(
  field: FetchWarningField,
  root: ParentNode = document,
): boolean {
  return queryByRegionsId(WARNING_ID_BY_FIELD[field], root) !== null;
}

export function assertText(
  regionsId: string,
  expectedText: string | RegExp,
  root: ParentNode = document,
): void {
  const element = byRegionsId(regionsId, root);
  const value = element.textContent ?? '';

  if (typeof expectedText === 'string') {
    assert.ok(
      value.includes(expectedText),
      `Expected "${expectedText}" in element text for regionsId="${regionsId}", got "${value}"`,
    );
    return;
  }

  assert.ok(
    expectedText.test(value),
    `Expected ${String(expectedText)} in element text for regionsId="${regionsId}", got "${value}"`,
  );
}

function getButtonFromRegionsId(
  regionsId: string,
  root: ParentNode = document,
): HTMLButtonElement {
  const element = byRegionsId(regionsId, root);
  if (element.tagName.toLowerCase() === 'button') {
    return element as HTMLButtonElement;
  }
  const button = element.querySelector('button');
  assert.ok(button, `Expected button under regionsId="${regionsId}"`);
  return button as HTMLButtonElement;
}

export function assertButtonEnabled(
  regionsId: string,
  root: ParentNode = document,
): void {
  assert.equal(getButtonFromRegionsId(regionsId, root).disabled, false);
}

export function assertButtonDisabled(
  regionsId: string,
  root: ParentNode = document,
): void {
  assert.equal(getButtonFromRegionsId(regionsId, root).disabled, true);
}
