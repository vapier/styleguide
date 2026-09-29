/**
 * @fileoverview Support for Zippies in external style guides.
 * See go/g3doc-zippies for original source.
 */

/**
 * Class of the element to search for zippies
 * @const {string}
 */
const CONTENT_CLASS = 'markdown-body';

/**
 * Class on the section tag marking an open zippy
 * @const {string}
 */
const OPEN_CLASS = 'open';

/** @const {string} */
const EXPAND_ALL_CLASS = 'expand-zippies';

/** @const {string} */
const TOGGLE_EXPAND_ICON_CLASS = 'toggle-expand-all-icon';

/** @const {string} */
const EXPAND_ALL_STRING = 'Expand all content';

/** @const {string} */
const CLOSE_ALL_CLASS = 'close-zippies';

/** @const {string} */
const COLLAPSE_ALL_STRING = 'Collapse all content';

/** @const {string} */
const EXPAND_ALL_URL_PARAMETER = 'expand-zippies';

/** @const {string} */
const IGNORE_TOGGLE_ALL_CLASS = 'ignore-toggle-all';

/** @const {string} */
const TOGGLE_ZIPPY_MESSAGE_ID = 'zippy-toggle-message';

/**
 * Zippies module.
 * Upon installation, searches for Zippies, i.e., sections with class="zippy".
 * Transforms these zippies into <details>/<summary> tags.
 *
 * @final
 * @struct
 */
export class Zippies {
  /**
   * @param {!Window=} win The window object or a fake for tests.
   */
  constructor(win = window) {
    /**
     * @private @const {!Window}
     */
    this.window_ = win;
    /**
     * All <details> tags (pre-existing or newly-created) in the content.
     * @private @const {!Array<!Element>}
     */
    this.zippies_ = [];

    /**
     * Element for announcing that all zippies have been expanded/collapsed on
     * the page
     * @private {?Element}
     */
    this.toggleAnnounceEl_ = null;
  }

  /**
   * Installs the Zippies module on the page.
   */
  install() {
    // Identify the main content element
    const contentEl =
        document.querySelector('.' + CONTENT_CLASS) || document.body;
    if (!contentEl || !contentEl.hasChildNodes()) {
      return;
    }

    this.collectExistingDetailsTags_(contentEl);
    this.createAllSectionZippies_(contentEl);

    // If there aren't any zippies on the page, we can stop here.
    if (this.zippies_.length === 0) {
      return;
    }

    // Add a11y improvements
    this.addSummaryExpanderEls_();
    this.createRegionsFromDetails_();
    // Use 'assertive' because the toggle element may switch focus and we want
    // to read this change first.
    this.toggleAnnounceEl_ = document.createElement('p');
    this.toggleAnnounceEl_.id = TOGGLE_ZIPPY_MESSAGE_ID;
    this.toggleAnnounceEl_.setAttribute('aria-live', 'assertive');
    document.body.appendChild(this.toggleAnnounceEl_);

    // Add event listeners
    this.createPrintHandler_();
    this.createExpandCollapseListeners_();
    this.createHashListeners_();

    // Expand all zippies if the requested URL parameter is set
    const url = new URL(this.window_.location.href, 'http://localhost');
    if (url.searchParams.has(EXPAND_ALL_URL_PARAMETER)) {
      this.setAllZippies_(true);
    }
  }

  // Private helpers

  /**
   * Creates all section-delimited zippies on the page.
   * @param {!Element} contentEl the root element containing the zippies-to-be.
   * @private
   */
  createAllSectionZippies_(contentEl) {
    const sections = contentEl.querySelectorAll('section.zippy');
    for (const section of sections) {
      // Create a new <details> element
      const detailsEl = document.createElement('details');
      for (const attr of section.attributes) {
        detailsEl.setAttribute(attr.name, attr.value);
      }
      const isOpen = detailsEl.classList.contains(OPEN_CLASS);
      detailsEl.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        detailsEl.setAttribute('open', true);
        detailsEl.classList.remove(OPEN_CLASS);
      }
      detailsEl.classList.remove('zippy');
      if (detailsEl.classList.length === 0) {
        detailsEl.removeAttribute('class');
      }
      const id = section.id || 'zippy-' + (this.zippies_.length + 1);
      detailsEl.id = id;
      detailsEl.setAttribute('aria-controls', detailsEl.id + '-region');

      // Change the aria-expanded attribute to reflect the state of the zippy
      detailsEl.addEventListener('toggle', () => {
        detailsEl.setAttribute('aria-expanded', detailsEl.open);
      });

      // Move contents over from the section
      const range = document.createRange();
      range.selectNodeContents(section);
      detailsEl.appendChild(range.extractContents());
      section.parentNode.replaceChild(detailsEl, section);

      // Move the first valid element into a <summary> tag, or create one if
      // there isn't a valid node.
      let createdSummary = false;
      for (const child of detailsEl.childNodes) {
        if (this.isValidSummaryNode_(child)) {
          this.createSummaryElFromNode_(child);
          createdSummary = true;
          break;
        }
      }
      if (!createdSummary) {
        const summaryEl = document.createElement('summary');
        summaryEl.textContent = 'Details';
        detailsEl.insertBefore(summaryEl, detailsEl.firstChild);
      }

      this.zippies_.push(detailsEl);
    }
  }

  /**
   * Collects existing `<details>` tags and ensures we recognize them as
   * zippies.
   * @param {!Element} contentEl the root element containing the zippies-to-be.
   * @private
   */
  collectExistingDetailsTags_(contentEl) {
    const detailsElements = contentEl.getElementsByTagName('details');

    for (const element of detailsElements) {
      const hasBadgeAttribute = element.classList.contains('badge');
      if (!element.id && !hasBadgeAttribute) {
        element.id = 'zippy-' + (this.zippies_.length + 1);
      }
      this.zippies_.push(element);
    }
  }

  /**
   * Tests whether a node is valid as a <summary> tag. A node is valid if it
   * contains some text or is an image.
   * @param {!Node} node
   * @return {boolean} Whether `node` is a valid <summary> tag.
   * @private
   */
  isValidSummaryNode_(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim().length > 0;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      return node.textContent.trim().length > 0 || node.tagName === 'IMG';
    }

    return false;
  }

  /**
   * @param {!Node} node The node to turn into the <summary> tag of a zippy
   * @private
   */
  createSummaryElFromNode_(node) {
    const summary =
        node.parentNode.insertBefore(document.createElement('summary'), node);
    summary.appendChild(node);

    // If the node is a paragraph tag (common after markdown parsing), flatten
    // the node.
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
      while (node.firstChild) {
        summary.insertBefore(node.firstChild, node);
      }
      summary.removeChild(node);
    }
  }

  /**
   * Adds expander button placeholders for all <summary> elements.
   * @private
   */
  addSummaryExpanderEls_() {
    for (const zippy of this.zippies_) {
      const summaryEl = zippy.querySelector('summary');
      if (!summaryEl) {
        continue;
      }

      const expander = document.createElement('span');
      expander.className = 'zippy-expander';
      expander.setAttribute('aria-hidden', 'true');
      summaryEl.insertBefore(expander, summaryEl.firstChild);
    }
  }

  /**
   * Puts all of the non-summary content into a region for aria-controls
   * purposes.
   * @private
   */
  createRegionsFromDetails_() {
    for (const zippy of this.zippies_) {
      const summaryEl = zippy.querySelector('summary');
      if (!summaryEl) {
        continue;
      }

      const regionEl = document.createElement('div');
      regionEl.className = 'zippy-region';

      summaryEl.id = summaryEl.id || zippy.id + '-summary';
      regionEl.setAttribute('role', 'region');
      regionEl.id = zippy.id + '-region';
      regionEl.setAttribute('aria-labelledby', summaryEl.id);

      const range = new Range();
      range.setStartAfter(summaryEl);
      range.setEndAfter(zippy.lastChild);
      range.surroundContents(regionEl);

      zippy.append(regionEl);
    }
  }

  /**
   * Detect 'print' dialog, so that all zippies are expanded before a document
   * is printed.
   * @private
   */
  createPrintHandler_() {
    if (!window.matchMedia) {
      return;
    }
    const mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener((mql) => {
      if (mql.matches) {
        this.setAllZippies_(true);
      }
    });
  }

  /**
   * Adds event listeners for elements that expand/close all zippies when
   * clicked.
   * TODO(b/67096328): Add keyboard shortcuts
   * @private
   */
  createExpandCollapseListeners_() {
    const toggleLinks = document.querySelectorAll(
        '.' + EXPAND_ALL_CLASS + ', .' + CLOSE_ALL_CLASS);
    for (const toggleLink of toggleLinks) {
      const shouldExpand = toggleLink.classList.contains(EXPAND_ALL_CLASS);
      const hasToggleExpandIcon =
          toggleLink.classList.contains(TOGGLE_EXPAND_ICON_CLASS);
      toggleLink.addEventListener('click', (e) => {
        this.setAllZippies_(shouldExpand);
        this.toggleExpandAllIcon_(hasToggleExpandIcon, toggleLink);
        e.preventDefault();
        toggleLink.focus();
      });
      toggleLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          this.setAllZippies_(shouldExpand);
          this.toggleExpandAllIcon_(hasToggleExpandIcon, toggleLink);
          e.preventDefault();
          toggleLink.focus();
        }
      });
    }
  }

  /**
   * Toggles the expand all button icon and sets all zippies to either open or
   * closed
   * @param {boolean} hasToggleIcon
   * @param {?Element} toggleLink
   * @private
   */
  toggleExpandAllIcon_(hasToggleIcon, toggleLink) {
    if (hasToggleIcon && !toggleLink.hasAttribute('open')) {
      toggleLink.setAttribute('open', '');
      toggleLink.textContent = COLLAPSE_ALL_STRING;
      this.setAllZippies_(true);
    } else if (hasToggleIcon) {
      toggleLink.removeAttribute('open');
      toggleLink.textContent = EXPAND_ALL_STRING;
      this.setAllZippies_(false);
    }
  }

  /**
   * Sets all zippies on the page to either open or closed
   * @param {boolean} open True to open all zippies, false to close all.
   * @private
   */
  setAllZippies_(open) {
    for (const zippy of this.zippies_) {
      if (zippy.closest('.' + IGNORE_TOGGLE_ALL_CLASS)) {
        continue;
      }
      zippy.open = open;
      zippy.setAttribute('aria-expanded', open.toString());
    }
    this.toggleAnnounceEl_.textContent =
        (open ? 'Expanded' : 'Collapsed') + ' all zippies.';
  }

  /**
   * Adds event listener for changes to the page's hash and clicks on anchors
   * with only a hash. Then processes the initial hash.
   * @private
   */
  createHashListeners_() {
    this.window_.addEventListener('hashchange', () => {
      this.processPageHash_();
    });

    // Also fire on clicks on in-page links because sometimes a click doesn't
    // trigger a hashchange event (e.g. if the link's hash is already the
    // current hash). However this means the processPageHash_ fires twice when
    // the hash *does* change from a link click. More info in b/24126004.
    const anchors = document.getElementsByTagName('a');
    for (const anchor of anchors) {
      if (anchor.hash.length > 1 &&
          anchor.pathname === this.window_.location.pathname) {
        anchor.addEventListener('click', () => {
          this.processPageHash_();
        });
      }
    }

    // Process initial hash
    this.processPageHash_();
  }

  /**
   * Grabs the hash in the current URL and opens any zippies that contain the
   * associated element.
   * @private
   */
  processPageHash_() {
    // Check that the hash exists and also contains a string, not just "#".
    if (!this.window_.location.hash || this.window_.location.hash.length < 2) {
      return;
    }

    // Confirm the hash corresponds to a valid element after removing the
    // beginning #.
    const hashElement =
        document.getElementById(this.window_.location.hash.substring(1));
    if (!hashElement) {
      return;
    }

    // If the hash refers to a <details> tag, open that.
    if (hashElement.tagName === 'DETAILS') {
      hashElement.open = true;
    }

    // Look for any parent <details> tags and open them.
    let insideZippy = false;
    let currentNode = hashElement;
    while (
        (currentNode =
             currentNode.parentElement?.closest('details') ?? null)) {
      currentNode.open = true;
      insideZippy = true;
    }

    // The browser tries to scroll to the element *before* the hashchange event,
    // while the element is still hidden. Now that the element is visible, we
    // have to scroll to it manually:
    if (insideZippy) {
      document.body.scrollTop = hashElement.offsetTop;
    }
  }
}
