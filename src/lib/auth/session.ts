/**
 * Server-Side Session Utilities
 *
 * This module provides utilities for accessing the session on the server side.
 * Used in:
 * - Server Components
 * - Server Actions
 * - API Routes
 * - Middleware
 */

import { auth } from "./auth";
import type { Session } from "next-auth";

/**
 * Get the current session on the server
 *
 * This function retrieves the authenticated user's session.
 * Returns null if user is not authenticated.
 *
 * Usage in Server Component:
 * ```typescript
 * import { getCurrentUser } from "@/lib/auth/session";
 *
 * export default async function MyPage() {
 *   const session = await getCurrentUser();
 *
 *   if (!session) {
 *     redirect("/auth/signin");
 *   }
 *
 *   return <div>Hello {session.user.name}</div>;
 * }
 * ```
 *
 * Usage in API Route:
 * ```typescript
 * import { getCurrentUser } from "@/lib/auth/session";
 *
 * export async function GET() {
 *   const session = await getCurrentUser();
 *
 *   if (!session) {
 *     return new Response("Unauthorized", { status: 401 });
 *   }
 *
 *   // ... handle request
 * }
 * ```
 */
export async function getCurrentUser(): Promise<Session | null> {
  const session = await auth();
  return session;
}

/**
 * Require authentication on the server
 *
 * This function throws an error if user is not authenticated.
 * Useful for API routes and server actions that require authentication.
 *
 * Usage:
 * ```typescript
 * import { requireAuth } from "@/lib/auth/session";
 *
 * export async function GET() {
 *   const session = await requireAuth();
 *   // session is guaranteed to exist here
 *
 *   // ... handle authenticated request
 * }
 * ```
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentUser();

  if (!session) {
    throw new Error("Unauthorized - Please sign in");
  }

  return session;
}

/**
 * Get the current user ID
 *
 * Convenience function to get just the user ID.
 * Returns null if user is not authenticated.
 *
 * Usage:
 * ```typescript
 * const userId = await getCurrentUserId();
 * if (!userId) {
 *   return new Response("Unauthorized", { status: 401 });
 * }
 * ```
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentUser();
  return session?.user?.id || null;
}

/**
 * Check if a resource belongs to the current user
 *
 * This is a security helper to verify ownership.
 * Used before allowing modifications to user data.
 *
 * Usage:
 * ```typescript
 * import { requireOwnership } from "@/lib/auth/session";
 *
 * export async function DELETE(
 *   request: Request,
 *   { params }: { params: { treeId: string } }
 * ) {
 *   const tree = await getTree(params.treeId);
 *
 *   await requireOwnership(tree.userId);
 *
 *   // User owns this tree, safe to delete
 *   await deleteTree(params.treeId);
 * }
 * ```
 */
export async function requireOwnership(resourceUserId: string): Promise<void> {
  const session = await requireAuth();

  if (session.user.id !== resourceUserId) {
    throw new Error("Forbidden - You don't own this resource");
  }
}

/**
 * Check if user is authenticated (boolean)
 *
 * Simple check that returns true/false.
 * Useful for conditional rendering logic.
 *
 * Usage:
 * ```typescript
 * const isAuthenticated = await isAuth();
 * if (isAuthenticated) {
 *   // Show authenticated content
 * } else {
 *   // Show public content or redirect
 * }
 * ```
 */
export async function isAuth(): Promise<boolean> {
  const session = await getCurrentUser();
  return !!session;
}

/**
 * Type guard for session user
 *
 * Helper to ensure session and user exist with TypeScript type safety.
 *
 * Usage:
 * ```typescript
 * const session = await getCurrentUser();
 * if (hasUser(session)) {
 *   // TypeScript knows session.user exists here
 *   console.log(session.user.email);
 * }
 * ```
 */
export function hasUser(session: Session | null): session is Session & {
  user: NonNullable<Session["user"]>;
} {
  return !!session?.user;
}
