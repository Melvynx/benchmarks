import { Loader } from "@/components/nowts/loader";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@/hooks/use-async-mutation";
import { LogOut } from "lucide-react";
export const UserDropdownStopImpersonating = () => {
  const stopImpersonating = useMutation({
    mutationFn: async () => {
      return authClient.admin.stopImpersonating();
    },
    onSuccess: () => {
      window.location.href = "/admin";
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        stopImpersonating.mutate();
      }}
    >
      {stopImpersonating.isPending ? (
        <Loader className="mr-2 size-4" />
      ) : (
        <LogOut className="mr-2 size-4" />
      )}
      Stop Impersonating
    </DropdownMenuItem>
  );
};
