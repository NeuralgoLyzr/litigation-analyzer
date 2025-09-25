"use client";

import { LogoutButton } from "./AuthButtons";

export function ProfileHeader() {
  return (
    <div className="flex items-center justify-end h-full px-4">
      <LogoutButton />
    </div>
  );
} 