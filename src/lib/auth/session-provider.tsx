/**
 * Session Provider Component
 *
 * This client component wraps the NextAuth SessionProvider.
 * Required for useSession() hook to work in client components.
 *
 * Why separate file?
 * - NextAuth's SessionProvider must be a Client Component
 * - We want to keep our root layout as a Server Component
 * - This wrapper allows us to use "use client" directive in isolation
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

/**
 * SessionProvider Wrapper
 *
 * Wrap your app with this provider to enable session access
 * in all client components via useSession() hook.
 *
 * Usage in layout.tsx:
 * ```typescript
 * import { SessionProvider } from "@/lib/auth/session-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SessionProvider>
 *           {children}
 *         </SessionProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
