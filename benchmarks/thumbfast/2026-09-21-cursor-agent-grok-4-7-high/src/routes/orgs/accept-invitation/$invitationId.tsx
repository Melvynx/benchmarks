import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useMutation } from "convex/react";

export const Route = createFileRoute("/orgs/accept-invitation/$invitationId")({
  component: AcceptInvitationRoute,
});

function AcceptInvitationRoute() {
  const { invitationId } = useParams({
    from: "/orgs/accept-invitation/$invitationId",
  });
  const navigate = useNavigate();
  const acceptInvitation = useMutation(api.app.acceptInvitation);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              const result = await acceptInvitation({ invitationId });
              await navigate({ to: result.redirectTo });
            }}
          >
            Accept Invitation
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
