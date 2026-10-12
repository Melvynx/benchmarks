"use client";

import { X } from "lucide-react";
import type { City } from "@/lib/cities";
import { cx } from "@/lib/cx";
import { FOCUS_RING, ICON_BUTTON, REF_BADGE } from "./styles";

interface CityNameButtonProps {
  readonly city: City;
  readonly isReference: boolean;
  readonly onPromote: (cityId: string) => void;
  readonly className?: string;
}

/** Clicking a city name makes it the reference. The reference's own name is inert. */
export function CityNameButton({ city, isReference, onPromote, className }: CityNameButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onPromote(city.id)}
      disabled={isReference}
      title={isReference ? undefined : `Make ${city.name} the reference`}
      className={cx(
        "min-w-0 rounded-sm text-left text-sm font-semibold text-stone-900 dark:text-stone-100",
        !isReference && "cursor-pointer hover:text-emerald-700 hover:underline dark:hover:text-emerald-400",
        FOCUS_RING,
        className,
      )}
    >
      {city.name}
    </button>
  );
}

export function ReferenceBadge() {
  return <span className={REF_BADGE}>Ref</span>;
}

interface RemoveCityButtonProps {
  readonly city: City;
  readonly onRemove: (cityId: string) => void;
}

export function RemoveCityButton({ city, onRemove }: RemoveCityButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onRemove(city.id)}
      aria-label={`Remove ${city.name}`}
      title={`Remove ${city.name}`}
      className={ICON_BUTTON}
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
