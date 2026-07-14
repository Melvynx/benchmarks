import {
  forwardRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

function resolveHref(href: NextLinkProps["href"]) {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "/";
  const search = href.query ? new URLSearchParams(href.query).toString() : "";
  return search ? `${pathname}?${search}` : pathname;
}

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(
  (
    {
      href,
      onClick,
      prefetch: _prefetch,
      replace,
      scroll: _scroll,
      target,
      ...props
    },
    ref,
  ) => {
    const resolvedHref = resolveHref(href);

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
      onClick?.(event);
      if (
        event.defaultPrevented ||
        target === "_blank" ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      const url = new URL(resolvedHref, window.location.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      if (replace) {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    return (
      <a
        ref={ref}
        href={resolvedHref}
        onClick={handleClick}
        target={target}
        {...props}
      />
    );
  },
);

Link.displayName = "AppLink";

export default Link;
