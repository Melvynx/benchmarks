import { DialogComponent } from "@/features/dialog-manager/dialog-component";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { useDialogStore } from "@/features/dialog-manager/dialog-store";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setup } from "../test/setup";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Create a wrapper component to test the dialog
function DialogManagerWrapper() {
  const activeDialog = useDialogStore((state) => state.activeDialog);

  return activeDialog ? <DialogComponent dialog={activeDialog} /> : null;
}

describe("Dialog Manager Store", () => {
  beforeEach(() => {
    // Reset the store before each test
    useDialogStore.setState({ dialogs: [], activeDialog: null });
    vi.clearAllMocks();
  });

  describe("Dialog UI Interaction", () => {
    it("should render a confirm dialog and handle action", async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);

      // Add a dialog
      dialogManager.confirm({
        title: "Confirmation Dialog",
        description: "Please confirm this action",
        action: {
          label: "Confirm",
          onClick: actionFn,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Check if dialog is rendered
      expect(screen.getByText("Confirmation Dialog")).toBeInTheDocument();
      expect(
        screen.getByText("Please confirm this action"),
      ).toBeInTheDocument();

      // Click the confirm button
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      // Check if action was called
      expect(actionFn).toHaveBeenCalled();

      // Dialog should be removed after action
      await waitFor(() => {
        expect(useDialogStore.getState().activeDialog).toBeNull();
      });
    });

    it("should trigger the confirm action with Enter", async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);

      dialogManager.confirm({
        title: "You are signed in!",
        description: "Would you like to go to your dashboard?",
        action: {
          label: "Continue",
          onClick: actionFn,
        },
        cancel: {
          label: "Stay here",
        },
      });

      setup(<DialogManagerWrapper />);

      fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });

      await waitFor(() => {
        expect(actionFn).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(useDialogStore.getState().activeDialog).toBeNull();
      });
    });

    it("should render a dialog and handle cancel via Escape", async () => {
      const cancelFn = vi.fn();

      // Add a dialog
      dialogManager.confirm({
        title: "Confirmation Dialog",
        description: "Please confirm this action",
        cancel: {
          label: "Dismiss",
          onClick: cancelFn,
        },
        action: {
          label: "Confirm",
          onClick: vi.fn(),
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // The cancel label is shown in the footer hint
      expect(screen.getByText("Dismiss")).toBeInTheDocument();

      // Press Escape to cancel (dialog uses onOpenChange for cancel)
      await user.keyboard("{Escape}");

      // Check if cancel function was called
      expect(cancelFn).toHaveBeenCalled();
      await waitFor(() => {
        expect(useDialogStore.getState().activeDialog).toBeNull();
      });
    });

    it("should handle input in dialog", async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);

      // Add a dialog with input
      dialogManager.input({
        title: "Input Dialog",
        description: "Please enter a value",
        input: {
          label: "Name",
          defaultValue: "",
          placeholder: "Enter your name",
        },
        action: {
          label: "Submit",
          onClick: actionFn,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Type in the input field
      const inputElement = screen.getByPlaceholderText("Enter your name");
      await user.type(inputElement, "John Doe");

      // Click the submit button
      await user.click(screen.getByRole("button", { name: "Submit" }));

      // Check if action was called with the input value
      expect(actionFn).toHaveBeenCalledWith("John Doe");
    });

    it("should handle confirm text in dialog", async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);

      // Add a dialog with confirm text
      dialogManager.confirm({
        title: "Delete Confirmation",
        description: "This action cannot be undone",
        confirmText: "DELETE",
        action: {
          label: "Delete",
          onClick: actionFn,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Check if the delete button is disabled initially
      const deleteButton = screen.getByRole("button", { name: "Delete" });
      expect(deleteButton).toBeDisabled();

      // Type the wrong confirmation text
      const confirmInput = screen.getByRole("textbox");
      await user.type(confirmInput, "DELET");

      // Button should still be disabled
      expect(deleteButton).toBeDisabled();

      // Clear and type the correct confirmation text
      await user.clear(confirmInput);
      await user.type(confirmInput, "DELETE");

      // Button should be enabled now
      expect(deleteButton).not.toBeDisabled();

      // Click the delete button
      await user.click(deleteButton);

      // Check if action was called
      expect(actionFn).toHaveBeenCalled();
    });

    it("should show loading state during async action", async () => {
      // Create a promise that we can resolve manually
      let resolvePromise!: (value: unknown) => void;
      const actionPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      // Add a dialog with async action
      dialogManager.confirm({
        title: "Loading Test",
        description: "This will take some time",
        action: {
          label: "Process",
          onClick: async () => actionPromise as Promise<void>,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Click the process button
      await user.click(screen.getByRole("button", { name: "Process" }));

      // Check if loading state is shown
      const processButton = screen.getByRole("button", { name: "Process" });
      expect(processButton).toBeDisabled();

      // Resolve the promise
      resolvePromise(undefined);

      // Wait for the dialog to be removed
      await waitFor(() => {
        expect(useDialogStore.getState().activeDialog).toBeNull();
      });
    });

    it("should handle error in async action", async () => {
      const errorMessage = "Something went wrong";

      // Create a promise that we can reject manually
      let rejectPromise!: (reason: Error) => void;
      const actionPromise = new Promise<void>((_, reject) => {
        rejectPromise = reject;
      });

      // Add a dialog with async action that will fail
      dialogManager.confirm({
        title: "Error Test",
        description: "This will fail",
        action: {
          label: "Process",
          onClick: async () => actionPromise,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Click the process button
      await user.click(screen.getByRole("button", { name: "Process" }));

      // Reject the promise with an error
      rejectPromise(new Error(errorMessage));

      // Check if toast.error was called with the error message
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Action failed", {
          description: errorMessage,
        });
      });

      // Dialog should still be active (not removed on error)
      expect(useDialogStore.getState().activeDialog).toBeTruthy();
    });

    it("should render a custom dialog with children", async () => {
      // Add a custom dialog with children
      dialogManager.custom({
        children: <div data-testid="custom-content">Custom Dialog Content</div>,
      });

      // Render the dialog wrapper
      setup(<DialogManagerWrapper />);

      // Check if custom content is rendered
      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
      expect(screen.getByText("Custom Dialog Content")).toBeInTheDocument();
    });

    it("should handle dialog with default input value", async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const defaultValue = "Default Name";

      // Add a dialog with input that has a default value
      dialogManager.input({
        title: "Input Dialog",
        description: "Please enter a value",
        input: {
          label: "Name",
          defaultValue,
          placeholder: "Enter your name",
        },
        action: {
          label: "Submit",
          onClick: actionFn,
        },
      });

      // Render the dialog wrapper
      const { user } = setup(<DialogManagerWrapper />);

      // Input should have the default value
      const inputElement = screen.getByPlaceholderText("Enter your name");
      expect(inputElement).toHaveValue(defaultValue);

      // Click the submit button without changing the input
      await user.click(screen.getByRole("button", { name: "Submit" }));

      // Check if action was called with the default value
      expect(actionFn).toHaveBeenCalledWith(defaultValue);
    });

    it("should use default cancel label when not provided", async () => {
      // Add a dialog without specifying cancel label
      dialogManager.confirm({
        title: "Simple Dialog",
        description: "This dialog uses default cancel label",
        action: {
          label: "OK",
          onClick: vi.fn(),
        },
      });

      // Render the dialog wrapper
      setup(<DialogManagerWrapper />);

      // The default "Cancel" label is shown in the footer Esc hint
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });
});
