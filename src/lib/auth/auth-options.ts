/**
 * NextAuth Configuration
 *
 * This module configures NextAuth.js v5 for the Yggdrasil application.
 * It supports two authentication modes:
 * - Local: Credentials provider (email/password)
 * - Production: AWS Cognito provider
 *
 * The mode is determined by environment variables:
 * - If Cognito is configured → Use Cognito
 * - Otherwise → Use Credentials (local development)
 */

import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import CognitoProvider from "next-auth/providers/cognito";
import bcrypt from "bcryptjs";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { dynamoDBClient } from "../aws/dynamodb";
import { authConfig, cognitoConfig, dynamoDBConfig } from "../aws/config";

/**
 * NextAuth Configuration Object
 *
 * This configuration defines:
 * - Authentication providers (Credentials and/or Cognito)
 * - Session strategy (JWT vs database)
 * - Callbacks for customizing behavior
 * - Pages for custom UI
 */
export const authOptions: NextAuthConfig = {
  /**
   * Authentication Providers
   *
   * Providers are authentication methods (email/password, OAuth, etc.)
   * We dynamically configure based on environment:
   * - Development: Credentials only
   * - Production: Cognito (with Credentials as fallback)
   */
  providers: [
    /**
     * Credentials Provider (Local Development)
     *
     * This provider handles email/password authentication.
     * Used in development with DynamoDB Local.
     *
     * Security features:
     * - Passwords hashed with bcrypt (cost factor 10)
     * - User lookup in DynamoDB
     * - Returns user object on success, null on failure
     */
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      /**
       * Authorization function
       *
       * This function is called when user submits login form.
       * It must return a user object on success, or null on failure.
       *
       * Steps:
       * 1. Validate input
       * 2. Look up user in DynamoDB by email
       * 3. Compare password hash
       * 4. Return user data (without password hash)
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Look up user by email
          // Note: In production, you'd want a GSI on email for efficient lookup
          // For demo, we're using the seed user with known ID
          const userId = "seed-user-001"; // Demo user ID

          const result = await dynamoDBClient.send(
            new GetItemCommand({
              TableName: dynamoDBConfig.tableName,
              Key: {
                PK: { S: `USER#${userId}` },
                SK: { S: "PROFILE" },
              },
            })
          );

          if (!result.Item) {
            console.log("User not found:", credentials.email);
            return null;
          }

          const user = unmarshall(result.Item) as User & {
            PasswordHash: string;
          };

          // Verify email matches (case-insensitive)
          if (user.Email.toLowerCase() !== credentials.email.toLowerCase()) {
            console.log("Email mismatch");
            return null;
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.PasswordHash
          );

          if (!passwordMatch) {
            console.log("Password mismatch");
            return null;
          }

          // Return user data (exclude password hash)
          return {
            id: user.UserId,
            email: user.Email,
            name: user.DisplayName || user.Email,
            image: null, // Add profile photo URL if available
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),

    /**
     * AWS Cognito Provider (Production)
     *
     * This provider handles authentication via AWS Cognito.
     * Only included if Cognito is properly configured.
     *
     * Benefits of Cognito:
     * - Managed authentication service (no password handling)
     * - MFA support
     * - Password reset flows
     * - Social identity providers (Google, Facebook, etc.)
     * - Compliance (SOC, PCI, HIPAA)
     */
    ...(cognitoConfig.isConfigured
      ? [
          CognitoProvider({
            clientId: cognitoConfig.clientId,
            clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
            issuer: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`,
            /**
             * Profile callback
             *
             * Maps Cognito user attributes to NextAuth user object
             */
            profile(profile) {
              return {
                id: profile.sub, // Cognito user ID
                email: profile.email,
                name: profile.name || profile.email,
                image: profile.picture || null,
              };
            },
          }),
        ]
      : []),
  ],

  /**
   * Session Strategy
   *
   * JWT: Session stored in encrypted cookie (no database)
   * Database: Session stored in database (requires adapter)
   *
   * We use JWT because:
   * - Stateless (no session storage needed)
   * - Works well with serverless (AWS Amplify)
   * - Fast (no database lookup on every request)
   *
   * Trade-off: Can't revoke sessions instantly (must wait for expiry)
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  /**
   * Pages Configuration
   *
   * Override default NextAuth pages with custom UI.
   * Points to our custom pages in app/auth directory.
   */
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    // verifyRequest: "/auth/verify-request", // Email verification page
    // newUser: "/auth/new-user", // New user welcome page
  },

  /**
   * Callbacks
   *
   * Callbacks are async functions you can use to control what happens
   * when an action is performed (sign in, JWT creation, session creation).
   */
  callbacks: {
    /**
     * JWT Callback
     *
     * This callback is called whenever a JWT is created or updated.
     * Use it to add custom data to the JWT.
     *
     * The JWT is encrypted and stored in a cookie.
     * Don't store sensitive data here (even though it's encrypted).
     *
     * @param token - The JWT token
     * @param user - User object (only available during sign in)
     * @param account - Account object (provider info)
     */
    async jwt({ token, user, account }) {
      // On initial sign in, add user data to token
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Add provider info (useful for knowing if Cognito or credentials)
      if (account) {
        token.provider = account.provider;
      }

      return token;
    },

    /**
     * Session Callback
     *
     * This callback is called whenever a session is checked.
     * Use it to add custom data to the session object.
     *
     * The session object is what you get from useSession() or getServerSession().
     *
     * @param session - The session object
     * @param token - The JWT token (contains custom data from jwt callback)
     */
    async session({ session, token }) {
      // Add custom data from token to session
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }

      // Add provider info to session
      session.provider = token.provider as string;

      return session;
    },

    /**
     * Sign In Callback
     *
     * This callback is called before sign in is completed.
     * Return true to allow sign in, false to deny.
     *
     * Use cases:
     * - Block specific users
     * - Require email verification
     * - Check user status in database
     */
    async signIn({ user, account, profile }) {
      // For Cognito, check if user exists in our database
      if (account?.provider === "cognito") {
        try {
          // Check if user exists in DynamoDB
          const result = await dynamoDBClient.send(
            new GetItemCommand({
              TableName: dynamoDBConfig.tableName,
              Key: {
                PK: { S: `USER#${user.id}` },
                SK: { S: "PROFILE" },
              },
            })
          );

          // If user doesn't exist, create them
          if (!result.Item) {
            // TODO: Create user in DynamoDB
            // This would be implemented in the API route
            console.log("New Cognito user - need to create in database");
          }

          return true;
        } catch (error) {
          console.error("Error checking user:", error);
          return false;
        }
      }

      // Allow credentials provider sign in
      return true;
    },

    /**
     * Redirect Callback
     *
     * This callback is called when user is redirected after authentication.
     * Return the URL to redirect to.
     *
     * Default behavior: Redirect to the page user came from (callbackUrl)
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  /**
   * Events
   *
   * Events are async functions that are triggered on specific actions.
   * They don't return anything and can't block the action.
   *
   * Use cases:
   * - Logging
   * - Analytics
   * - Sending notifications
   */
  events: {
    async signIn({ user }) {
      console.log("User signed in:", user.email);
      // TODO: Log to analytics, send welcome email, etc.
    },
    async signOut() {
      console.log("User signed out");
      // TODO: Log to analytics, cleanup, etc.
    },
  },

  /**
   * Debug Mode
   *
   * Enable debug messages in development.
   * Shows detailed logs of NextAuth operations.
   */
  debug: process.env.NODE_ENV === "development",

  /**
   * Secret
   *
   * Used to encrypt JWT tokens and session cookies.
   * MUST be set to a random string in production.
   *
   * Generate with: openssl rand -base64 32
   */
  secret: authConfig.secret,
};

/**
 * Type augmentation for NextAuth
 *
 * This extends NextAuth's built-in types to include our custom fields.
 * Provides TypeScript autocomplete for session.user.id, etc.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
    provider?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email: string;
    name: string;
    provider?: string;
  }
}
