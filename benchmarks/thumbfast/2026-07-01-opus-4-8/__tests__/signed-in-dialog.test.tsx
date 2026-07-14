import { DialogComponent } from "@/features/dialog-manager/dialog-component";
import { useDialogStore } from "@/features/dialog-manager/dialog-store";
import { SignedInDialog } from "@/features/landing/signed-in-dialog";
import { useRouter } from "@/compat/navigation";
import { useSession } from "@/lib/auth-client";
import { useLocation } from "@tanstack/react-router";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../test/setup";

vi.mock("@/compat/navigation", async () => {
  const actual = await vi.importActual("@/compat/navigation");

  return {
    ...actual,
    useRouter: vi.fn(),
  };
});

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");

  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

function DialogManagerWrapper() {
  const activeDialog = useDialogStore((state) => state.activeDialog);

  return activeDialog ? <DialogComponent dialog={activeDialog} /> : null;
}

function SignedInDialogTestPage() {
  return (
    <>
      <SignedInDialog />
      <DialogManagerWrapper />
    </>
  );
}

describe("SignedInDialog", () => {
  beforeEach(() => {
    useDialogStore.setState({ dialogs: [], activeDialog: null });
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(router);
    vi.mocked(useLocation).mockReturnValue({ pathname: "/" } as ReturnType<
      typeof useLocation
    >);
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user_1" } },
    } as ReturnType<typeof useSession>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the dialog hidden for 10 minutes after choosing Stay here", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const firstRender = setup(<SignedInDialogTestPage />);

    expect(
      await screen.findByRole("alertdialog", { name: "You are signed in!" }),
    ).toBeInTheDocument();

    await firstRender.user.click(
      screen.getByRole("button", { name: /stay here/i }),
    );

    await waitFor(() => {
      expect(useDialogStore.getState().activeDialog).toBeNull();
    });

    firstRender.unmount();
    const suppressedRender = setup(<SignedInDialogTestPage />);

    expect(
      screen.queryByRole("alertdialog", { name: "You are signed in!" }),
    ).not.toBeInTheDocument();

    nowSpy.mockReturnValue(1_000_000 + 10 * 60 * 1000 + 1);

    useDialogStore.setState({ dialogs: [], activeDialog: null });
    suppressedRender.unmount();
    setup(<SignedInDialogTestPage />);

    expect(
      await screen.findByRole("alertdialog", { name: "You are signed in!" }),
    ).toBeInTheDocument();
  });
});
