import * as NProgress from "nprogress";
import * as React from "react";
import { create } from "zustand";

type NextTopLoaderProps = {
  /**
   * Color for the TopLoader.
   * @default "#29d"
   */
  color?: string;
  /**
   * The initial position for the TopLoader in percentage, 0.08 is 8%.
   * @default 0.08
   */
  initialPosition?: number;
  /**
   * The increment delay speed in milliseconds.
   * @default 200
   */
  crawlSpeed?: number;
  /**
   * The height for the TopLoader in pixels (px).
   * @default 3
   */
  height?: number;
  /**
   * Auto increamenting behaviour for the TopLoader.
   * @default true
   */
  crawl?: boolean;
  /**
   * To show spinner or not.
   * @default true
   */
  showSpinner?: boolean;
  /**
   * Animation settings using easing (a CSS easing string).
   * @default "ease"
   */
  easing?: string;
  /**
   * Animation speed in ms for the TopLoader.
   * @default 200
   */
  speed?: number;
  /**
   * Defines a shadow for the TopLoader.
   * @default "0 0 10px ${color},0 0 5px ${color}"
   *
   * @ you can disable it by setting it to `false`
   */
  shadow?: string | false;
  /**
   * Timeout in ms before the TopLoader will appear.
   *
   * @default 0
   */
  delay?: number;
};

const isAnchorOfCurrentUrl = (currentUrl: string, newUrl: string) => {
  const currentUrlObj = new URL(currentUrl);
  const newUrlObj = new URL(newUrl);
  const currentHash = currentUrlObj.hash;
  const newHash = newUrlObj.hash;

  return (
    currentUrlObj.hostname === newUrlObj.hostname &&
    currentUrlObj.pathname === newUrlObj.pathname &&
    currentUrlObj.search === newUrlObj.search &&
    currentHash !== newHash &&
    currentUrlObj.href.replace(currentHash, "") ===
      newUrlObj.href.replace(newHash, "")
  );
};

export const useNextTopLoaderStore = create<{
  isEnable: boolean;
  disable: () => void;
  enable: () => void;
}>((set) => ({
  isEnable: true,
  disable: () => set({ isEnable: false }),
  enable: () => set({ isEnable: true }),
}));

export const NextTopLoader = ({
  color = "#29d",
  height = 3,
  showSpinner = true,
  crawl = true,
  crawlSpeed = 200,
  initialPosition = 0.08,
  easing = "ease",
  speed = 200,
  shadow,
  delay = 0,
}: NextTopLoaderProps) => {
  // Any falsy (except undefined) will disable the shadow
  const getBoxShadow = (shadow: string | false | undefined, color: string) => {
    if (!shadow && shadow !== undefined) {
      return "";
    }
    if (shadow) {
      return `box-shadow:${shadow}`;
    }
    return `box-shadow:0 0 10px ${color},0 0 5px ${color}`;
  };

  const boxShadow = getBoxShadow(shadow, color);

  const styles = (
    <style>
      {`
        #nprogress {
          pointer-events: none;
        }
        #nprogress .bar {
          background: ${color};
          position: fixed;
          z-index: 1031;
          top: 0;
          left: 0;
          width: 100%;
          height: ${height}px;
        }
        #nprogress .peg {
          display: block;
          position: absolute;
          right: 0;
          width: 100px;
          height: 100%;
          ${boxShadow};
          opacity: 1;
          -webkit-transform: rotate(3deg) translate(0px, -4px);
          -ms-transform: rotate(3deg) translate(0px, -4px);
          transform: rotate(3deg) translate(0px, -4px);
        }
      `}
    </style>
  );

  React.useEffect(() => {
    NProgress.configure({
      showSpinner,
      trickle: crawl,
      trickleSpeed: crawlSpeed,
      minimum: initialPosition,
      easing,
      speed,
    });

    const handleNProgressStart = () => {
      let isDone = false;
      setTimeout(() => {
        if (!isDone) {
          NProgress.start();
        }
      }, 100);

      const originalPushState = window.history.pushState;
      window.history.pushState = function (...args) {
        isDone = true;
        NProgress.done();
        for (const el of document.querySelectorAll("html")) {
          el.classList.remove("nprogress-busy");
        }
        return originalPushState.apply(window.history, args);
      };
    };

    const handleQuickProgress = () => {
      if (delay === 0) {
        NProgress.start();
        NProgress.done();
        for (const el of document.querySelectorAll("html")) {
          el.classList.remove("nprogress-busy");
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (useNextTopLoaderStore.getState().isEnable === false) return;

      // if ctrl or cmd key is pressed, don't intercept
      if (event.ctrlKey || event.metaKey) return;

      try {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const currentUrl = window.location.href;
        const newUrl = anchor.href;
        const isExternalLink = anchor.target === "_blank";
        const isAnchor = isAnchorOfCurrentUrl(currentUrl, newUrl);
        const isDisabled = anchor.getAttribute("data-toploader-disabled");

        if (isDisabled === "true") return;

        if (newUrl === currentUrl || isAnchor || isExternalLink) {
          handleQuickProgress();
        } else {
          handleNProgressStart();
        }
      } catch {
        handleQuickProgress();
      }
    };

    // Add the global click event listener
    document.addEventListener("click", handleClick);

    // Clean up the global click event listener when the component is unmounted
    return () => {
      document.removeEventListener("click", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return styles;
};

/**
 * Stop loading of the current top loader bar
 */
export const stopLoading = () => {
  setTimeout(() => {
    NProgress.start();
    NProgress.done();
    for (const el of document.querySelectorAll("html")) {
      el.classList.remove("nprogress-busy");
    }
  }, 100);
};
