import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  id?: string;
  tone?: "light" | "dark";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  id,
  tone = "light",
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p
        data-reveal
        className={`inline-flex items-center gap-2 text-[12px] font-medium tracking-[0.14em] uppercase ${
          tone === "light" ? "text-ember-2" : "text-ember"
        }`}
      >
        <span className="h-px w-6 bg-current" aria-hidden />
        {eyebrow}
      </p>
      <h2
        id={id}
        data-reveal
        style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
        className="font-display mt-4 text-[clamp(2.25rem,5.2vw,4.25rem)] leading-[0.98] tracking-[-0.025em] text-cream"
      >
        {title}
      </h2>
      {description ? (
        <p
          data-reveal
          style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
          className={`mt-5 text-[17px] leading-relaxed text-sand/85 ${
            centered ? "mx-auto max-w-2xl" : "max-w-xl"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
