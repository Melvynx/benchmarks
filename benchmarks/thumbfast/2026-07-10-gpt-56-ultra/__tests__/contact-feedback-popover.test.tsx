import { Button } from "@/components/ui/button";
import { ContactFeedbackPopover } from "@/features/contact/feedback/contact-feedback-popover";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../test/setup";

const sendFeedback = vi.fn();

vi.mock("@convex/_generated/api", () => ({
  api: {
    forms: {
      submitFeedback: {},
    },
  },
}));

vi.mock("convex/react", () => ({
  useAction: () => sendFeedback,
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({
    data: {
      user: {
        email: "creator@thumbfa.st",
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function renderFeedbackPopover() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return setup(
    <QueryClientProvider client={queryClient}>
      <ContactFeedbackPopover>
        <Button>Feedback</Button>
      </ContactFeedbackPopover>
    </QueryClientProvider>,
  );
}

describe("ContactFeedbackPopover", () => {
  beforeEach(() => {
    sendFeedback.mockReset();
    sendFeedback.mockResolvedValue({ message: "sent" });
  });

  it("opens from the feedback button and submits feedback", async () => {
    const { user } = renderFeedbackPopover();

    await user.click(screen.getByRole("button", { name: "Feedback" }));

    const message = screen.getByPlaceholderText("Enter your message");
    expect(message).toBeInTheDocument();

    await user.type(message, "The dashboard button should open feedback.");
    await user.click(screen.getByRole("button", { name: "Satisfied" }));
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendFeedback).toHaveBeenCalledWith({
        email: "creator@thumbfa.st",
        message: "The dashboard button should open feedback.",
        review: "4",
      });
    });
  });
});
