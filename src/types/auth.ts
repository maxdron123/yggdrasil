/**
 * User and Authentication Type Definitions
 *
 * This file defines types for user accounts and authentication.
 */

import { z } from "zod";

/**
 * User Interface
 *
 * Represents a user account in the application.
 * Stored in DynamoDB as:
 * - PK: USER#<userId>
 * - SK: PROFILE
 */
export interface User {
  // DynamoDB keys
  PK: string; // USER#<userId>
  SK: string; // PROFILE
  EntityType: "User";

  // Identifiers
  userId: string; // Unique user identifier (UUID)

  // GSI keys
  GSI1PK: string; // EMAIL#<email>
  GSI1SK: string; // USER

  // User information
  email: string; // Email address (unique)
  name: string; // Display name

  // Authentication (local development only)
  passwordHash?: string; // Bcrypt hash (only for local credentials provider)

  // Cognito integration (production)
  cognitoUsername?: string; // Cognito sub (user ID from Cognito)

  // Preferences
  defaultTreeId?: string; // Default tree to show on login
  preferences: {
    theme?: "light" | "dark";
    language?: string;
    emailNotifications?: boolean;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * Zod Schema for User Validation
 */
export const UserSchema = z
  .object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1).max(100),
    passwordHash: z.string().optional(),
    cognitoUsername: z.string().optional(),
    defaultTreeId: z.string().uuid().optional(),
    preferences: z.object({
      theme: z.enum(["light", "dark"]).optional(),
      language: z.string().optional(),
      emailNotifications: z.boolean().optional(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastLoginAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Input Schema for User Registration
 */
export const UserRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
});

/**
 * Input Schema for User Login
 */
export const UserLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Type inference
 */
export type UserValidated = z.infer<typeof UserSchema>;
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
