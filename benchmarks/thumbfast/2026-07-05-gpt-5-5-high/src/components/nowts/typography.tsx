import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentPropsWithRef, ElementType, ForwardedRef } from "react";

import type React from "react";
import { forwardRef } from "react";

// Source : https://www.totaltypescript.com/pass-component-as-prop-react
type FixedForwardRef = <T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactNode,
) => (props: P & React.RefAttributes<T>) => React.ReactNode;

const fixedForwardRef = forwardRef as FixedForwardRef;

type DistributiveOmit<T, TOmitted extends PropertyKey> = T extends unknown
  ? Omit<T, TOmitted>
  : never;

export const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "font-caption scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "font-caption scroll-m-20 text-3xl font-semibold tracking-tight transition-colors",
      h3: "font-caption scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      default: "",
      quote: "mt-6 border-l-2 pl-6 italic",
      code: "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-muted-foreground text-xl",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-muted-foreground text-sm",
      link: "dark:text-primary font-medium text-cyan-600 hover:underline",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
type TypographyCvaProps = VariantProps<typeof typographyVariants>;

const defaultElementMapping = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  p: "p",
  quote: "p",
  code: "code",
  lead: "p",
  large: "p",
  small: "p",
  muted: "p",
  link: "a",
  default: "p",
} satisfies Record<NonNullable<TypographyCvaProps["variant"]>, ElementType>;

type ElementMapping = typeof defaultElementMapping;

type ElementTypeForVariant<TVariant extends keyof ElementMapping> =
  ElementMapping[TVariant];

/**
 * The Typography component is useful to add Text to your page
 *
 * Usage :
 *
 * ```tsx
 * <Typography variant="h1">Hello World</Typography>
 * <Typography variant="h2" as="a" href="#">Hello World</Typography>
 * <Typography variant="large" as={Link} href="#">Hello World</Typography>
 * ```
 *
 * You can use the `as` prop to define the element type of the component
 * `as` can be a string or a component
 *
 * @param params The parameters of the component
 * @param ref The ref of the element. Untyped because it's a generic
 * @returns
 */
const InnerTypography = <
  TAs extends ElementType,
  TVariant extends TypographyCvaProps["variant"] = "default",
>(
  {
    variant = "default",
    className,
    as,
    ...props
  }: {
    as?: TAs;
    variant?: TVariant;
  } & DistributiveOmit<
    ComponentPropsWithRef<
      ElementType extends TAs
        ? ElementTypeForVariant<NonNullable<TVariant>>
        : TAs
    >,
    "as"
  >,
  ref: ForwardedRef<Element>,
) => {
  const Comp = as ?? defaultElementMapping[variant ?? "default"];
  return (
    <Comp
      {...props}
      className={cn(typographyVariants({ variant }), className)}
      ref={ref}
    ></Comp>
  );
};

export const Typography = fixedForwardRef(InnerTypography);
