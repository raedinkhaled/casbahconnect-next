"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface UserMenuProps {
  userId: string;
  imageUrl: string;
}

export default function UserMenu({ userId, imageUrl }: UserMenuProps) {
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
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </Button>
    </div>
  );
}
