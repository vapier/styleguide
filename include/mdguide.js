/**
 * @license
 * Copyright Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Various helper functions.
 */

export function styleAlerts(document) {
  // If a paragraph starts with (e.g.) "Note:" or "Tip:" then add
  // that "callout class" to its element.
  document.querySelectorAll('div.markdown-body > p', (ele) => {
    const match = /^([a-z]+):/i.exec(paragraph.textContent);
    if (match) {
      ele.classList.add(match[1].toLowerCase());
    }
  });
}
