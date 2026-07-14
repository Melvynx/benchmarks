import { buttonVariants } from "@/components/ui/button";
import Link from "@/compat/link";
import { AuthButtonClient } from "../auth/auth-button-client";
import { HeaderBase } from "./header-base";

export function Header() {
  return (
    <HeaderBase>
      <Link
        href="/tools"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Tools
      </Link>
      <Link
        href="/docs"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Docs
      </Link>
      <Link
        href="/posts"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Blog
      </Link>
      <Link
        href="/changelog"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Changelog
      </Link>
      <Link
        href="/about"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        About
      </Link>
      <Link
        href="/contact"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Contact
      </Link>
      <AuthButtonClient />
    </HeaderBase>
  );
}
