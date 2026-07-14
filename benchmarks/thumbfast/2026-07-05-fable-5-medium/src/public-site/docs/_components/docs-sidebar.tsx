import Link from "@/compat/link";
import { usePathname } from "@/compat/navigation";
import { cn } from "@/lib/utils";
import type { DocTree } from "../doc-manager";

const TOP_LEVEL_SECTIONS = [
  { name: "Introduction", href: "/docs" },
  { name: "Guides", href: "/docs/guides" },
  { name: "Changelog", href: "/changelog" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600 dark:text-blue-400",
  POST: "text-green-600 dark:text-green-400",
  PUT: "text-purple-600 dark:text-purple-400",
  PATCH: "text-yellow-600 dark:text-yellow-400",
  DELETE: "text-red-600 dark:text-red-400",
};

export function DocsSidebar({ tree }: { tree: DocTree }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r lg:block">
      <nav className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
            Getting Started
          </h4>
          <ul className="flex flex-col">
            {TOP_LEVEL_SECTIONS.map(({ name, href }) => {
              const isActive =
                href === "/docs"
                  ? pathname === href
                  : pathname.startsWith(href);
              return (
                <li key={name}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded px-2 py-1 text-[13px] transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {tree.folders.map((folder) => (
          <div key={folder.slug} className="flex flex-col gap-2">
            <h4 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
              {folder.name}
            </h4>
            <ul className="flex flex-col">
              {folder.docs
                .filter((doc) => doc.slug !== folder.slug)
                .map((doc) => {
                  const isActive = doc.url === pathname;
                  const method = doc.attributes.method;
                  return (
                    <li key={doc.slug}>
                      <Link
                        href={doc.url}
                        className={cn(
                          "flex items-center gap-1.5 rounded px-2 py-1 text-[13px] transition-colors",
                          isActive
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {method && (
                          <span
                            className={cn(
                              "shrink-0 font-mono text-[10px] font-semibold",
                              METHOD_COLORS[method] ?? "text-muted-foreground",
                            )}
                          >
                            {method}
                          </span>
                        )}
                        <span className="truncate">{doc.attributes.title}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
