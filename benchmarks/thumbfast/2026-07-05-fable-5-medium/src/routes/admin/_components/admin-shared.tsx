import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

export function AdminPageHeader(props: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        {props.description ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.action ? <div className="shrink-0">{props.action}</div> : null}
    </div>
  );
}

export function AdminStatCard(props: {
  title: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
}) {
  const Icon = props.icon;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {props.title}
        </CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{props.value}</div>
        {props.description ? (
          <p className="text-muted-foreground text-xs">{props.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminSearch(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative max-w-sm flex-1", props.className)}>
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder ?? "Search..."}
        className="pl-9"
      />
    </div>
  );
}

export function AdminEmptyState(props: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{props.title}</CardTitle>
        {props.description ? (
          <CardDescription>{props.description}</CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function AdminPagination(props: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const end = Math.min(props.page * props.pageSize, props.total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        {props.total === 0
          ? "No results"
          : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${props.total.toLocaleString()}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-muted-foreground min-w-28 text-center text-sm">
          Page {props.page} of {props.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminTable(props: {
  headers: string[];
  rows?: ReactNode[][];
  empty: string;
}) {
  if (props.rows === undefined) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {props.headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={index}>
                {props.headers.map((header) => (
                  <TableCell key={header}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {props.headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.length > 0 ? (
            props.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={props.headers.length}
                className="h-24 text-center"
              >
                {props.empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function StatusBadge(props: { value?: string | null }) {
  const value = props.value ?? "unknown";
  const variant =
    value === "active" ||
    value === "completed" ||
    value === "approved" ||
    value === "succeeded"
      ? "default"
      : value === "failed" || value === "banned"
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{value}</Badge>;
}
