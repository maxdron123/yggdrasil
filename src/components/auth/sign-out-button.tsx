/**
 * Sign Out Button Component
 *
 * Client component that handles user sign out.
 * Must be a client component to use signOut() from next-auth/react.
 */

"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
    >
      Sign Out
    </button>
  );
}
