/**
 * NextAuth v5 Configuration
 *
 * This is the main auth configuration file for NextAuth v5.
 * It exports the auth() function and related utilities.
 */

import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

/**
 * NextAuth v5 Handler
 *
 * Creates the auth() function and handlers for NextAuth v5.
 */
export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);
