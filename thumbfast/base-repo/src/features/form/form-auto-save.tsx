import { useDebounceFn } from "@/hooks/use-debounce-fn";
import { createContext, Fragment, use, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Form } from "./tanstack-form";

type AutoSaveFormApi = {
  reset: () => void;
  state: {
    isDirty: boolean;
    isSubmitting: boolean;
  };
  store: {
    state: {
      values: unknown;
    };
    subscribe: (listener: () => void) => () => void;
  };
} & React.ComponentProps<typeof Form>["form"];

const FormAutoSaveContext = createContext<{
  isDirty: boolean;
  isLoading: boolean;
  cancel: () => void;
  submit: () => void;
} | null>(null);

export const useFormAutoSave = () => {
  const ctx = use(FormAutoSaveContext);

  if (!ctx) {
    throw new Error("FormUnsavedBarContext is not provided");
  }

  return ctx;
};

export const FormAutoSave = ({
  children,
  form,
}: {
  children: React.ReactNode;
  form: AutoSaveFormApi;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submit = () => {
    buttonRef.current?.click();
  };
  const cancel = () => form.reset();
  const isDirty = form.state.isDirty;

  useHotkeys("mod+s", submit, {
    enabled: isDirty,
    enableOnContentEditable: true,
    preventDefault: true,
    enableOnFormTags: true,
  });

  return (
    <FormAutoSaveContext.Provider
      value={{
        isDirty,
        isLoading: form.state.isSubmitting,
        cancel,
        submit,
      }}
    >
      <Fragment>
        <Form form={form}>
          {children}
          <button type="submit" className="hidden" ref={buttonRef} />
        </Form>
      </Fragment>
    </FormAutoSaveContext.Provider>
  );
};

export const FormAutoSaveWatch = (props: {
  autoSaveMs?: number;
  form: AutoSaveFormApi;
}) => {
  const lastFormStateRef = useRef<string | null>(null);

  const ctx = useFormAutoSave();

  const debounce = useDebounceFn(() => {
    const json = JSON.stringify(props.form.store.state.values);
    if (json === lastFormStateRef.current) return;
    lastFormStateRef.current = json;

    ctx.submit();
  }, props.autoSaveMs ?? 300);

  useEffect(() => {
    return props.form.store.subscribe(() => {
      debounce();
    });
  }, [props.form.store, debounce]);

  return null;
};
