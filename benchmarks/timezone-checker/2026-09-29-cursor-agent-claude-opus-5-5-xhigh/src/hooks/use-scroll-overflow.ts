import { type RefObject, useEffect, useState } from 'react';

interface ScrollOverflow {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

/** Tracks whether a horizontally scrollable element has hidden content on either side. */
export function useScrollOverflow(ref: RefObject<HTMLElement | null>): ScrollOverflow {
  const [overflow, setOverflow] = useState<ScrollOverflow>({ canScrollLeft: false, canScrollRight: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const maxScroll = element.scrollWidth - element.clientWidth;
      const canScrollLeft = element.scrollLeft > 1;
      const canScrollRight = element.scrollLeft < maxScroll - 1;
      setOverflow((previous) =>
        previous.canScrollLeft === canScrollLeft && previous.canScrollRight === canScrollRight
          ? previous
          : { canScrollLeft, canScrollRight },
      );
    };

    // ResizeObserver fires once on observe, which covers the initial measurement.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener('scroll', update, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [ref]);

  return overflow;
}
