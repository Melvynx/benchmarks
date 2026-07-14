import { useCallback, useState } from "react";

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => unknown;
  onError?: (error: Error, variables: TVariables) => unknown;
};

type MutateOptions<TData, TVariables> = Pick<
  MutationOptions<TData, TVariables>,
  "onSuccess" | "onError"
>;

export function useMutation<TData, TVariables = void>(
  options: MutationOptions<TData, TVariables>,
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutateAsync = useCallback(
    async (
      variables?: TVariables,
      mutateOptions?: MutateOptions<TData, TVariables>,
    ) => {
      setIsPending(true);
      setError(null);
      setIsSuccess(false);

      try {
        const mutationVariables = variables as TVariables;
        const data = await options.mutationFn(mutationVariables);
        await options.onSuccess?.(data, mutationVariables);
        await mutateOptions?.onSuccess?.(data, mutationVariables);
        setIsSuccess(true);
        return data;
      } catch (unknownError) {
        const nextError =
          unknownError instanceof Error
            ? unknownError
            : new Error(String(unknownError));
        setError(nextError);
        await options.onError?.(nextError, variables as TVariables);
        await mutateOptions?.onError?.(nextError, variables as TVariables);
        throw nextError;
      } finally {
        setIsPending(false);
      }
    },
    [options],
  );

  const mutate = useCallback(
    (
      variables?: TVariables,
      mutateOptions?: MutateOptions<TData, TVariables>,
    ) => {
      void mutateAsync(variables, mutateOptions).catch(() => null);
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isPending,
    isSuccess,
    isError: error !== null,
    error,
  };
}
