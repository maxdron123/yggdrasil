/**
 * Relationship Entity Type Definitions
 *
 * This file defines relationships between persons in the family tree.
 * Relationships are bidirectional and stored as separate records for
 * efficient querying in both directions.
 *
 * Example: Parent-Child relationship creates two records:
 * 1. PK: PERSON#<childId>, SK: PARENT#<parentId>
 * 2. PK: PERSON#<parentId>, SK: CHILD#<childId>
 */

import { z } from "zod";

/**
 * Relationship Type Enums
 */

/** Parent-Child relationship types */
export enum ParentChildType {
  BIOLOGICAL = "Biological",
  ADOPTIVE = "Adoptive",
  STEP = "Step",
  FOSTER = "Foster",
  UNKNOWN = "Unknown",
}

/** Spousal relationship status */
export enum SpousalStatus {
  MARRIED = "Married",
  DIVORCED = "Divorced",
  WIDOWED = "Widowed",
  SEPARATED = "Separated",
  PARTNER = "Partner", // Unmarried partnership
  UNKNOWN = "Unknown",
}

/** General relationship category */
export enum RelationshipCategory {
  PARENT_CHILD = "ParentChild",
  SPOUSAL = "Spousal",
}

/**
 * Base Relationship Interface
 *
 * Common fields for all relationship types
 */
interface BaseRelationship {
  // DynamoDB keys
  PK: string; // PERSON#<personId1>
  SK: string; // PARENT|CHILD|SPOUSE#<personId2>
  EntityType: "Relationship";

  // Identifiers
  relationshipId: string; // UUID for this relationship
  treeId: string; // Family tree this relationship belongs to

  // GSI keys
  GSI1PK: string; // PERSON#<personId2> (for reverse lookup)
  GSI1SK: string; // PARENT|CHILD|SPOUSE#<personId1>
  GSI2PK: string; // <treeId>
  GSI2SK: string; // REL#<personId1>#<personId2>

  // Category
  category: RelationshipCategory;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  notes?: string;
}

/**
 * Parent-Child Relationship
 *
 * Represents a parent-child relationship.
 * Two records are created:
 * 1. Child → Parent: PERSON#<childId> / PARENT#<parentId>
 * 2. Parent → Child: PERSON#<parentId> / CHILD#<childId>
 */
export interface ParentChildRelationship extends BaseRelationship {
  category: RelationshipCategory.PARENT_CHILD;
  childId: string;
  parentId: string;
  relationshipType: ParentChildType;

  // Additional fields
  adoptionDate?: string; // ISO 8601 date if adoptive
  isDirectParent: boolean; // true if this is the primary record, false if reverse
}

/**
 * Spousal Relationship
 *
 * Represents a marriage or partnership.
 * Two records are created (bidirectional):
 * 1. PERSON#<spouse1Id> / SPOUSE#<spouse2Id>
 * 2. PERSON#<spouse2Id> / SPOUSE#<spouse1Id>
 */
export interface SpousalRelationship extends BaseRelationship {
  category: RelationshipCategory.SPOUSAL;
  spouse1Id: string;
  spouse2Id: string;
  status: SpousalStatus;

  // Event dates
  marriageDate?: string; // ISO 8601 date
  marriagePlace?: string;
  divorceDate?: string; // ISO 8601 date
  divorcePlace?: string;

  // Metadata
  isPrimaryRecord: boolean; // true for spouse1→spouse2, false for reverse
}

/**
 * Union type for all relationships
 */
export type Relationship = ParentChildRelationship | SpousalRelationship;

/**
 * Zod Schemas for Validation
 */

export const ParentChildRelationshipSchema = z
  .object({
    relationshipId: z.string().min(1),
    treeId: z.string().min(1),
    category: z.literal(RelationshipCategory.PARENT_CHILD),
    childId: z.string().min(1),
    parentId: z.string().min(1),
    relationshipType: z.nativeEnum(ParentChildType),
    adoptionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    isDirectParent: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdBy: z.string().min(1).optional(),
    updatedBy: z.string().min(1).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const SpousalRelationshipSchema = z
  .object({
    relationshipId: z.string().min(1),
    treeId: z.string().min(1),
    category: z.literal(RelationshipCategory.SPOUSAL),
    spouse1Id: z.string().min(1),
    spouse2Id: z.string().min(1),
    status: z.nativeEnum(SpousalStatus),
    marriageDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    marriagePlace: z.string().max(200).optional(),
    divorceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    divorcePlace: z.string().max(200).optional(),
    isPrimaryRecord: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdBy: z.string().min(1).optional(),
    updatedBy: z.string().min(1).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

/**
 * Input schemas for creating relationships (omit auto-generated fields)
 */
export const ParentChildInputSchema = z.object({
  treeId: z.string().min(1),
  childId: z.string().min(1),
  parentId: z.string().min(1),
  relationshipType: z.nativeEnum(ParentChildType),
  adoptionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const SpousalInputSchema = z.object({
  treeId: z.string().min(1),
  spouse1Id: z.string().min(1),
  spouse2Id: z.string().min(1),
  status: z.nativeEnum(SpousalStatus),
  marriageDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  marriagePlace: z.string().max(200).optional(),
  divorceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  divorcePlace: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Type inference
 */
export type ParentChildInput = z.infer<typeof ParentChildInputSchema>;
export type SpousalInput = z.infer<typeof SpousalInputSchema>;

/**
 * Helper functions
 */

/**
 * Create bidirectional parent-child relationship records
 *
 * @param input - Relationship input data
 * @param userId - User creating the relationship
 * @returns Array of two relationship records [child→parent, parent→child]
 */
export function createParentChildRecords(
  input: ParentChildInput,
  userId: string
): [ParentChildRelationship, ParentChildRelationship] {
  const now = new Date().toISOString();
  const relationshipId = crypto.randomUUID();

  // Child → Parent record
  const childToParent: ParentChildRelationship = {
    PK: `PERSON#${input.childId}`,
    SK: `PARENT#${input.parentId}`,
    EntityType: "Relationship",
    relationshipId,
    treeId: input.treeId,
    category: RelationshipCategory.PARENT_CHILD,
    childId: input.childId,
    parentId: input.parentId,
    relationshipType: input.relationshipType,
    adoptionDate: input.adoptionDate,
    isDirectParent: true,
    GSI1PK: `PERSON#${input.parentId}`,
    GSI1SK: `CHILD#${input.childId}`,
    GSI2PK: input.treeId,
    GSI2SK: `REL#${input.childId}#${input.parentId}`,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    notes: input.notes,
  };

  // Parent → Child record (reverse)
  const parentToChild: ParentChildRelationship = {
    PK: `PERSON#${input.parentId}`,
    SK: `CHILD#${input.childId}`,
    EntityType: "Relationship",
    relationshipId,
    treeId: input.treeId,
    category: RelationshipCategory.PARENT_CHILD,
    childId: input.childId,
    parentId: input.parentId,
    relationshipType: input.relationshipType,
    adoptionDate: input.adoptionDate,
    isDirectParent: false,
    GSI1PK: `PERSON#${input.childId}`,
    GSI1SK: `PARENT#${input.parentId}`,
    GSI2PK: input.treeId,
    GSI2SK: `REL#${input.parentId}#${input.childId}`,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    notes: input.notes,
  };

  return [childToParent, parentToChild];
}

/**
 * Create bidirectional spousal relationship records
 *
 * @param input - Relationship input data
 * @param userId - User creating the relationship
 * @returns Array of two relationship records [spouse1→spouse2, spouse2→spouse1]
 */
export function createSpousalRecords(
  input: SpousalInput,
  userId: string
): [SpousalRelationship, SpousalRelationship] {
  const now = new Date().toISOString();
  const relationshipId = crypto.randomUUID();

  // Spouse1 → Spouse2 record
  const spouse1ToSpouse2: SpousalRelationship = {
    PK: `PERSON#${input.spouse1Id}`,
    SK: `SPOUSE#${input.spouse2Id}`,
    EntityType: "Relationship",
    relationshipId,
    treeId: input.treeId,
    category: RelationshipCategory.SPOUSAL,
    spouse1Id: input.spouse1Id,
    spouse2Id: input.spouse2Id,
    status: input.status,
    marriageDate: input.marriageDate,
    marriagePlace: input.marriagePlace,
    divorceDate: input.divorceDate,
    divorcePlace: input.divorcePlace,
    isPrimaryRecord: true,
    GSI1PK: `PERSON#${input.spouse2Id}`,
    GSI1SK: `SPOUSE#${input.spouse1Id}`,
    GSI2PK: input.treeId,
    GSI2SK: `REL#${input.spouse1Id}#${input.spouse2Id}`,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    notes: input.notes,
  };

  // Spouse2 → Spouse1 record (reverse)
  const spouse2ToSpouse1: SpousalRelationship = {
    PK: `PERSON#${input.spouse2Id}`,
    SK: `SPOUSE#${input.spouse1Id}`,
    EntityType: "Relationship",
    relationshipId,
    treeId: input.treeId,
    category: RelationshipCategory.SPOUSAL,
    spouse1Id: input.spouse2Id, // Note: IDs are swapped
    spouse2Id: input.spouse1Id,
    status: input.status,
    marriageDate: input.marriageDate,
    marriagePlace: input.marriagePlace,
    divorceDate: input.divorceDate,
    divorcePlace: input.divorcePlace,
    isPrimaryRecord: false,
    GSI1PK: `PERSON#${input.spouse1Id}`,
    GSI1SK: `SPOUSE#${input.spouse2Id}`,
    GSI2PK: input.treeId,
    GSI2SK: `REL#${input.spouse2Id}#${input.spouse1Id}`,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    notes: input.notes,
  };

  return [spouse1ToSpouse2, spouse2ToSpouse1];
}

// Simple type aliases for service layer compatibility
export type RelationshipType = "Parent" | "Child" | "Spouse" | "Sibling";

export interface SimpleRelationship {
  RelationshipId: string;
  Person1Id: string;
  Person2Id: string;
  RelationshipType: RelationshipType;
  TreeId: string;
  UserId: string;
  CreatedAt: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface RelationshipCreateInput {
  person1Id: string;
  person2Id: string;
  relationshipType: RelationshipType;
  treeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export const relationshipCreateSchema = z.object({
  person1Id: z.string().min(1),
  person2Id: z.string().min(1),
  relationshipType: z.enum(["Parent", "Child", "Spouse", "Sibling"]),
  treeId: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});
