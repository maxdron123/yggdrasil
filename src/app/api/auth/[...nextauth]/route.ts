/**
 * NextAuth API Route Handler
 *
 * This is the catch-all route that handles all NextAuth.js requests.
 * In Next.js 13+ App Router, this goes in: app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth handles these endpoints automatically:
 * - /api/auth/signin - Sign in page
 * - /api/auth/signout - Sign out
 * - /api/auth/session - Get current session
 * - /api/auth/csrf - Get CSRF token
 * - /api/auth/providers - Get available providers
 * - /api/auth/callback/:provider - OAuth callback
 *
 * You don't need to create these endpoints manually.
 * NextAuth creates them based on your configuration.
 */

import { handlers } from "@/lib/auth/auth";

/**
 * Export the NextAuth handlers
 *
 * In NextAuth v5, handlers are created by the NextAuth() call
 * and exported as GET and POST.
 */
export const { GET, POST } = handlers;

/**
 * Route Segment Config (Optional)
 *
 * Configure how Next.js handles this route.
 * For auth routes, we typically want:
 * - dynamic: Always run on server (not pre-rendered)
 * - runtime: Use Node.js runtime (for bcrypt, crypto, etc.)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
