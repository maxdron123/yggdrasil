/**
 * Navbar Component
 *
 * Main navigation header with user menu
 */

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <span className="text-xl font-bold text-gray-900">Yggdrasil</span>
          </Link>

          {/* Navigation Links */}
          {session && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/trees"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                My Trees
              </Link>
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-gray-700">
                  {session.user?.name || session.user?.email}
                </span>
                <SignOutButton />
              </>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
