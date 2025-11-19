/**
 * Family Tree Entity Type Definitions
 *
 * This file defines the TypeScript types for Family Tree metadata.
 * A Tree represents a collection of persons and relationships
 * belonging to a user.
 */

import { z } from "zod";

/**
 * Tree Interface
 *
 * Metadata for a family tree owned by a user.
 * Stored in DynamoDB as:
 * - PK: USER#<userId>
 * - SK: TREE#<treeId>
 */
export interface Tree {
  // DynamoDB keys
  PK: string; // USER#<userId>
  SK: string; // TREE#<treeId>
  EntityType: "Tree";

  // Identifiers
  userId: string; // Owner of this tree
  treeId: string; // Unique tree identifier (UUID)

  // GSI keys
  GSI1PK: string; // TREE#<treeId>
  GSI1SK: string; // METADATA
  GSI3PK: string; // <userId>
  GSI3SK: string; // TREE#<updatedAt>

  // Tree metadata
  treeName: string; // Display name for the tree
  description?: string; // Optional description

  // Root person (starting point for tree visualization)
  rootPersonId?: string; // Optional: Primary person in the tree

  // Privacy settings
  isPublic: boolean; // Whether tree is publicly viewable
  sharedWith: string[]; // Array of email addresses with access

  // Statistics (updated periodically)
  personCount?: number; // Number of persons in this tree
  generationCount?: number; // Number of generations

  // Metadata
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Zod Schema for Tree Validation
 */
export const TreeSchema = z
  .object({
    userId: z.string().uuid(),
    treeId: z.string().uuid(),
    treeName: z
      .string()
      .min(1, "Tree name is required")
      .max(100, "Tree name must be less than 100 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    rootPersonId: z.string().uuid().optional(),
    isPublic: z.boolean(),
    sharedWith: z.array(z.string().email()).default([]),
    personCount: z.number().int().nonnegative().optional(),
    generationCount: z.number().int().nonnegative().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

/**
 * Input Schema for Creating a Tree
 */
export const TreeInputSchema = z.object({
  treeName: z
    .string()
    .min(1, "Tree name is required")
    .max(100, "Tree name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  isPublic: z.boolean().default(false),
  sharedWith: z.array(z.string().email()).default([]),
});

/**
 * Type inference
 */
export type TreeInput = z.infer<typeof TreeInputSchema>;
export type TreeValidated = z.infer<typeof TreeSchema>;

// Aliases for consistency with service layer
export type TreeCreateInput = TreeInput;
export type TreeUpdateInput = Partial<TreeInput> & { rootPersonId?: string };

// Validation schemas for service layer
export const treeCreateSchema = TreeInputSchema;
export const treeUpdateSchema = TreeInputSchema.partial().extend({
  rootPersonId: z.string().uuid().optional(),
});

/**
 * Helper function to create a Tree with defaults
 *
 * @param userId - User who owns this tree
 * @param data - Tree input data
 * @returns Complete Tree object
 */
export function createTreeDefaults(
  userId: string,
  data: TreeInput
): Omit<Tree, "PK" | "SK" | "GSI1PK" | "GSI1SK" | "GSI3PK" | "GSI3SK"> {
  const now = new Date().toISOString();
  const treeId = crypto.randomUUID();

  return {
    userId,
    treeId,
    EntityType: "Tree",
    treeName: data.treeName,
    description: data.description,
    rootPersonId: undefined,
    isPublic: data.isPublic ?? false,
    sharedWith: data.sharedWith ?? [],
    personCount: 0,
    generationCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
