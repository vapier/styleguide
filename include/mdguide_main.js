/**
 * @license
 * Copyright Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Main entry point for HTML files to support CSP.
 */

import {styleAlerts} from './mdguide.js';

/**
 * Callback to initialize the page.
 */
function DOMContentLoaded() {
  const document = window.document;
  styleAlerts(document);
}

window.addEventListener("DOMContentLoaded", DOMContentLoaded);
