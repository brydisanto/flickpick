"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function EditProfileButton({ profileUserId }: { profileUserId: string }) {
  const { user } = useAuth();

  if (!user || user.id !== profileUserId) return null;

  return (
    <Link
      href="/profile/edit"
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
    >
      <Pencil size={12} />
      Edit Profile
    </Link>
  );
}
