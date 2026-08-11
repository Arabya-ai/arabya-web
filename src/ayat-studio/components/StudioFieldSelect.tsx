"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/ayat-studio/hooks/use-mobile";
import { cn } from "@/ayat-studio/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ayat-studio/components/ui/select";

export type StudioSelectOption = {
  value: string;
  label: string;
};

type StudioFieldSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: StudioSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * Radix Select on desktop; native `<select>` on mobile/tablet to avoid
 * portal stacking and transparent overlay bugs on small screens.
 */
export function StudioFieldSelect({
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
  contentClassName,
  id,
  "aria-label": ariaLabel,
}: StudioFieldSelectProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && isMobile) {
    return (
      <div className="relative w-full">
        <select
          id={id}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            "studio-native-select flex h-10 w-full appearance-none rounded-md border border-input bg-[hsl(var(--background))] px-3 py-2 pe-9 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            triggerClassName,
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
