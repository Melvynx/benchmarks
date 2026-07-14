import Image from "@/compat/image";
import Link from "@/compat/link";
import { Button } from "@/components/ui/button";
import { SiteConfig } from "@/site-config";

export function DocsHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 max-w-screen-2xl items-center px-6">
        <div className="flex items-center gap-4">
          <Link href="/docs" className="flex items-center gap-2">
            <Image
              src={SiteConfig.appIcon}
              alt={SiteConfig.title}
              width={32}
              height={32}
              className="size-8"
            />
            <span className="text-lg font-bold">{SiteConfig.title}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/posts">Blog</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orgs">Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
