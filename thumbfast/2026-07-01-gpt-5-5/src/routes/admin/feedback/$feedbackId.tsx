import { Button } from "@/components/ui/button";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type React from "react";
import {
  AdminFeedbackDetailContentSkeleton,
  AdminFeedbackDetailSkeleton,
} from "../_components/admin-skeletons";
import { AdminPageHeader, StatusBadge } from "../_components/admin-shared";

export const Route = createFileRoute("/admin/feedback/$feedbackId")({
  component: AdminFeedbackDetailRoute,
  pendingComponent: AdminFeedbackDetailSkeleton,
});

function AdminFeedbackDetailRoute() {
  const { feedbackId } = Route.useParams();
  const feedback = useQuery(api.admin.queries.getFeedbackById, { feedbackId });

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Feedback detail"
            description="Inspect one feedback record with user and organization context."
          />
          <Button asChild variant="outline" className="w-fit">
            <Link to="/admin/feedback">Back to feedback</Link>
          </Button>
          {feedback === undefined ? (
            <AdminFeedbackDetailContentSkeleton />
          ) : feedback === null ? (
            <div className="text-muted-foreground rounded-md border p-4 text-sm">
              Feedback not found.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <section className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <StatusBadge value={feedback.reply ? "replied" : "open"} />
                  <span className="text-muted-foreground text-sm">
                    {dayjs(feedback.createdAt).format("MMM D, YYYY HH:mm")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {feedback.message}
                </p>
                <div className="bg-muted rounded-md p-3 text-sm">
                  <p className="text-muted-foreground text-xs">Admin reply</p>
                  <p>{feedback.reply ?? "No reply stored."}</p>
                </div>
              </section>
              <aside className="space-y-3 rounded-md border p-4 text-sm">
                <Info label="Rating" value={feedback.rating ?? "-"} />
                <Info
                  label="User"
                  value={
                    feedback.user ? (
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: feedback.user.id }}
                        className="underline-offset-2 hover:underline"
                      >
                        {feedback.user.email}
                      </Link>
                    ) : (
                      "-"
                    )
                  }
                />
                <Info
                  label="Organization"
                  value={
                    feedback.organization ? (
                      <Link
                        to="/admin/organizations/$orgId"
                        params={{ orgId: feedback.organization.id }}
                        className="underline-offset-2 hover:underline"
                      >
                        {feedback.organization.name}
                      </Link>
                    ) : feedback.organizationId ? (
                      <Link
                        to="/admin/organizations/$orgId"
                        params={{ orgId: feedback.organizationId }}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {feedback.organizationId}
                      </Link>
                    ) : (
                      "-"
                    )
                  }
                />
              </aside>
            </div>
          )}
        </div>
      </LayoutContent>
    </Layout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
