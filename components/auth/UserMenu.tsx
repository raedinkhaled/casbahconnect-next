"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

interface UserMenuProps {
  userId: string;
  imageUrl: string;
}

export default function UserMenu({ userId, imageUrl }: UserMenuProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSubmitting(true);
    setError(null);
    try {
      await signOut({ callbackUrl: "/", redirect: false });
      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link aria-label="Open your profile" href={`/profile/${userId}`}>
        <Image
          alt="Profile"
          className="size-10 rounded-full object-cover"
          height={40}
          src={imageUrl}
          width={40}
        />
      </Link>
      <Button
        className="btn-secondary hidden min-h-10 px-3 sm:inline-flex"
        onClick={handleSignOut}
        disabled={isSubmitting || isNavigating}
        type="button"
      >
        {isSubmitting || isNavigating ? "Signing out…" : "Sign out"}
      </Button>
      {error && <p className="small-regular text-red-500" role="alert">{error}</p>}
    </div>
  );
}
