import { calculateHeaderGroupHeight } from "@theme/critical";
import { Component } from "@theme/component";
import { onDocumentLoaded, changeMetaThemeColor } from "@theme/utilities";

/**
 * @typedef {Object} HeaderComponentRefs
 * @property {HTMLDivElement} headerDrawerContainer - The header drawer container element
 * @property {HTMLElement} headerMenu - The header menu element
 * @property {HTMLElement} headerRowTop - The header top row element
 */

/**
 * @typedef {CustomEvent<{ minimumReached: boolean }>} OverflowMinimumEvent
 */

/**
 * A custom element that manages the site header.
 *
 * @extends {Component<HeaderComponentRefs>}
 */

class HeaderComponent extends Component {
  requiredRefs = ["headerDrawerContainer", "headerMenu", "headerRowTop"];

  /**
   * Width of window when header drawer was hidden
   * @type {number | null}
   */
  #menuDrawerHiddenWidth = null;

  /**
   * An intersection observer for monitoring sticky header position
   * @type {IntersectionObserver | null}
   */
  #intersectionObserver = null;

  /**
   * Whether the header has been scrolled offscreen, when sticky behavior is 'scroll-up'
   * @type {boolean}
   */
  #offscreen = false;

  /**
   * The last recorded scrollTop of the document, when sticky behavior is 'scroll-up
   * @type {number}
   */
  #lastScrollTop = 0;

  /**
   * A timeout to allow for hiding animation, when sticky behavior is 'scroll-up'
   * @type {number | null}
   */
  #timeout = null;

  /**
   * The duration to wait for hiding animation, when sticky behavior is 'scroll-up'
   * @constant {number}
   */
  #animationDelay = 150;

  /**
   * Keeps the global `--header-height` custom property up to date,
   * which other theme components can then consume
   */
  #resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return;

    const { height } = entry.target.getBoundingClientRect();
    document.body.style.setProperty("--header-height", `${height}px`);

    // Check if the menu drawer should be hidden in favor of the header menu
    if (
      this.#menuDrawerHiddenWidth &&
      window.innerWidth > this.#menuDrawerHiddenWidth
    ) {
      this.#updateMenuVisibility(false);
    }
  });

  /**
   * Observes the header while scrolling the viewport to track when its actively sticky
   * @param {Boolean} alwaysSticky - Determines if we need to observe when the header is offscreen
   */
  #observeStickyPosition = (alwaysSticky = true) => {
    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
      this.#intersectionObserver = null;
    }

    const config = {
      threshold: alwaysSticky ? 1 : 0,
    };

    this.#intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return;

      const { isIntersecting } = entry;

      if (alwaysSticky) {
        this.dataset.stickyState = isIntersecting ? "inactive" : "active";
        changeMetaThemeColor(this.refs.headerRowTop);
      } else {
        this.#offscreen =
          !isIntersecting || this.dataset.stickyState === "active";
      }
    }, config);

    this.#intersectionObserver.observe(this);
  };

  /**
   * Handles the overflow minimum event from the header menu
   * @param {OverflowMinimumEvent} event
   */
  #handleOverflowMinimum = (event) => {
    this.#updateMenuVisibility(event.detail.minimumReached);
  };

  /**
   * Updates the visibility of the menu and drawer
   * @param {boolean} hideMenu - Whether to hide the menu and show the drawer
   */
  #updateMenuVisibility(hideMenu) {
    if (hideMenu) {
      this.refs.headerDrawerContainer.classList.remove("desktop:hidden");
      this.#menuDrawerHiddenWidth = window.innerWidth;
      this.refs.headerMenu.classList.add("hidden");
    } else {
      this.refs.headerDrawerContainer.classList.add("desktop:hidden");
      this.#menuDrawerHiddenWidth = null;
      this.refs.headerMenu.classList.remove("hidden");
    }
  }

  #handleWindowScroll = () => {
    const stickyMode = this.getAttribute("sticky");
    if (!this.#offscreen && stickyMode !== "always") return;

    const scrollTop = document.scrollingElement?.scrollTop ?? 0;
    const isScrollingUp = scrollTop < this.#lastScrollTop;

    if (stickyMode === "always") {
      const isAtTop = this.getBoundingClientRect().top >= 0;

      if (isAtTop) {
        this.dataset.scrollDirection = "none";
      } else if (isScrollingUp) {
        this.dataset.scrollDirection = "up";
      } else {
        this.dataset.scrollDirection = "down";
      }

      this.#lastScrollTop = scrollTop;
      return;
    }

    if (isScrollingUp) {
      if (this.#timeout) {
        clearTimeout(this.#timeout);
        this.#timeout = null;
      }
      if (this.getBoundingClientRect().top >= 0) {
        this.#offscreen = false;
        this.removeAttribute("data-animating");
        this.dataset.stickyState = "inactive";
        this.dataset.scrollDirection = "none";
      } else {
        const wasIdle = this.dataset.stickyState === "idle";
        this.dataset.stickyState = "active";
        this.dataset.scrollDirection = "up";
        if (wasIdle) {
          this.setAttribute("data-animating", "");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.removeAttribute("data-animating");
            });
          });
        } else {
          this.removeAttribute("data-animating");
        }
      }
    } else if (this.dataset.stickyState === "active") {
      this.dataset.scrollDirection = "none";
      this.setAttribute("data-animating", "");
      if (this.#timeout) clearTimeout(this.#timeout);
      this.#timeout = setTimeout(() => {
        this.dataset.stickyState = "idle";
        this.removeAttribute("data-animating");
        this.#timeout = null;
      }, this.#animationDelay);
    } else {
      this.dataset.scrollDirection = "none";
      this.dataset.stickyState = "idle";
    }

    this.#lastScrollTop = scrollTop;
  };

  #initSticky = () => {
    const stickyMode = this.getAttribute("sticky");
    if (!stickyMode) return;

    const isMobile = window.innerWidth < 750;
    const useAlwaysSticky =
      stickyMode === "always" || (stickyMode === "scroll-up" && isMobile);
    this.#observeStickyPosition(useAlwaysSticky);

    const useScrollListener =
      stickyMode === "always" || (stickyMode === "scroll-up" && !isMobile);
    if (useScrollListener) {
      document.addEventListener("scroll", this.#handleWindowScroll);
    } else {
      document.removeEventListener("scroll", this.#handleWindowScroll);
    }
  };

  #handleResize = () => {
    const stickyMode = this.getAttribute("sticky");
    if (stickyMode !== "scroll-up") return;

    const isMobile = window.innerWidth < 750;
    this.#observeStickyPosition(isMobile);

    if (isMobile) {
      document.removeEventListener("scroll", this.#handleWindowScroll);
    } else {
      document.addEventListener("scroll", this.#handleWindowScroll);
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.#resizeObserver.observe(this);
    this.addEventListener("overflowMinimum", this.#handleOverflowMinimum);

    const stickyMode = this.getAttribute("sticky");
    if (stickyMode) {
      this.#initSticky();
      if (stickyMode === "scroll-up") {
        window.addEventListener("resize", this.#handleResize);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver.disconnect();
    this.#intersectionObserver?.disconnect();
    this.removeEventListener("overflowMinimum", this.#handleOverflowMinimum);
    document.removeEventListener("scroll", this.#handleWindowScroll);
    window.removeEventListener("resize", this.#handleResize);
    document.body.style.setProperty("--header-height", "0px");
  }
}

if (!customElements.get("header-component")) {
  customElements.define("header-component", HeaderComponent);
}

onDocumentLoaded(() => {
  const header = document.querySelector("#header-component");
  const headerGroup = document.querySelector("#header-group");

  // Update header group height on resize of any child
  if (headerGroup) {
    const resizeObserver = new ResizeObserver(() =>
      calculateHeaderGroupHeight(header, headerGroup),
    );

    // Observe all children of the header group
    const children = headerGroup.children;
    for (let i = 0; i < children.length; i++) {
      const element = children[i];
      if (element === header || !(element instanceof HTMLElement)) continue;
      resizeObserver.observe(element);
    }

    // Also observe the header group itself for child changes
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // Re-observe all children when the list changes
          const children = headerGroup.children;
          for (let i = 0; i < children.length; i++) {
            const element = children[i];
            if (element === header || !(element instanceof HTMLElement))
              continue;
            resizeObserver.observe(element);
          }
        }
      }
    });

    mutationObserver.observe(headerGroup, { childList: true });
  }
});
