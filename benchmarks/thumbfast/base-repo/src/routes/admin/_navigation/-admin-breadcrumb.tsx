import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "@tanstack/react-router";

const titleize = (segment: string) =>
  segment
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function AdminBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname
    .replace(/^\/admin\/?/, "")
    .split("/")
    .filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Admin</BreadcrumbPage>
        </BreadcrumbItem>
        {segments.map((segment) => (
          <BreadcrumbItem key={segment} className="hidden sm:flex">
            <BreadcrumbSeparator />
            <BreadcrumbPage>{titleize(segment)}</BreadcrumbPage>
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
