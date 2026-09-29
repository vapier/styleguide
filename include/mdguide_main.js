/**
 * @license
 * Copyright Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Main entry point for HTML files to support CSP.
 */

import {styleAlerts, tidyToc} from './mdguide.js';
import {Zippies} from './zippies.js';

/**
 * Initialize the page.
 */
function main() {
  const document = window.document;
  styleAlerts(document);
  tidyToc(document);

  const zippy = new Zippies();
  zippy.install();
}

// We're loaded as a module which defers execution until after the DOM is ready.
// Which means we don't need to register an event, simply execute.
main();
