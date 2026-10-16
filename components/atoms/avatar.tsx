"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva("relative flex shrink-0 overflow-hidden rounded-md", {
  variants: {
    size: {
      sm: "size-7 text-[11px]",
      md: "size-[34px] text-xs",
      lg: "size-[52px] text-[17px]",
    },
  },
  defaultVariants: { size: "md" },
});

/**
 * Avatar NEXUS THRIVE: cuadrado de radio 4 px (nunca círculo). Sin foto, la
 * inicial en Montserrat 700 sobre `--primary`; `tone="gold"` para clientes
 * destacados y `tone="neutral"` para listas largas.
 */
function Avatar({
  className,
  size,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

const FALLBACK_TONES = {
  ink: "bg-primary text-primary-foreground",
  gold: "bg-accent text-ink",
  neutral: "bg-surface-muted text-foreground",
} as const;

function AvatarFallback({
  className,
  tone = "ink",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & {
  tone?: keyof typeof FALLBACK_TONES;
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center font-display font-bold tracking-[0.02em]",
        FALLBACK_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Iniciales para el fallback: "María Torres" → "MT". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
