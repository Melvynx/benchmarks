import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";

type OrganizationFilterSelectProps = {
  value: string;
  onChange: (organizationId: string) => void;
  className?: string;
};

export function OrganizationFilterSelect(props: OrganizationFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const results = useQuery(
    api.admin.queries.listOrganizations,
    open
      ? { page: 1, pageSize: 20, search: debouncedQuery || undefined }
      : "skip",
  );
  const organizations = results?.organizations;

  const selectedOrg = useQuery(
    api.admin.queries.getOrganizationById,
    props.value ? { organizationId: props.value } : "skip",
  );

  const selectedLabel = props.value
    ? (selectedOrg?.name ??
      selectedOrg?.slug ??
      `${props.value.slice(0, 12)}...`)
    : "All organizations";

  const handleSelect = (organizationId: string) => {
    props.onChange(organizationId);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[240px] justify-between font-normal", props.className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search organization..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => handleSelect("")}>
                <Building2 className="size-4" />
                <span className="truncate">All organizations</span>
                {props.value === "" ? (
                  <Check className="ml-auto size-4" />
                ) : null}
              </CommandItem>
            </CommandGroup>
            {organizations === undefined ? (
              <div className="flex justify-center py-6">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No organizations found
              </div>
            ) : (
              <CommandGroup>
                {organizations.map((organization) => (
                  <CommandItem
                    key={organization.id}
                    value={organization.id}
                    onSelect={() => handleSelect(organization.id)}
                  >
                    <Building2 className="size-4" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{organization.name}</span>
                      {organization.slug ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {organization.slug}
                        </span>
                      ) : null}
                    </span>
                    {props.value === organization.id ? (
                      <Check className="ml-auto size-4 shrink-0" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
