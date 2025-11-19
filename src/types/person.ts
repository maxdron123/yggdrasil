/**
 * Person Entity Type Definitions
 *
 * This file defines the TypeScript types and Zod schemas for Person entities
 * in our family tree application.
 *
 * A Person represents an individual in a family tree with biographical information.
 * Persons are stored in DynamoDB with the following key structure:
 * - PK: USER#<userId>
 * - SK: PERSON#<personId>
 */

import { z } from "zod";

/**
 * Gender Enum
 *
 * Represents biological sex. Used for tree layout and relationship validation.
 * Can be extended to include more options based on requirements.
 */
export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
  UNKNOWN = "Unknown",
}

/**
 * Person Interface
 *
 * Core data structure for a person in the family tree.
 * All fields except required ones (userId, personId, treeId) are optional
 * to allow for incomplete historical records.
 */
export interface Person {
  // Primary identifiers (required)
  userId: string; // Owner of the tree
  personId: string; // Unique person identifier (UUID)
  treeId: string; // Which family tree this person belongs to

  // DynamoDB keys (set automatically by service layer)
  PK: string; // Partition key: USER#<userId>
  SK: string; // Sort key: PERSON#<personId>
  EntityType: "Person"; // Discriminator for queries

  // GSI keys for efficient queries
  GSI1PK: string; // TREE#<treeId>
  GSI1SK: string; // PERSON#<personId>
  GSI2PK: string; // <treeId>
  GSI2SK: string; // <createdAt>
  GSI3PK: string; // <userId>
  GSI3SK: string; // <updatedAt>

  // Personal information
  firstName: string; // Required: Given name
  lastName?: string; // Optional: Family name (may be unknown for historical records)
  middleName?: string; // Optional: Middle name(s)
  maidenName?: string; // Optional: Birth surname (if changed by marriage)
  nickname?: string; // Optional: Preferred name or alias

  // Biographical data
  gender?: Gender; // Optional: Biological sex
  birthDate?: string; // Optional: ISO 8601 date string (YYYY-MM-DD)
  birthPlace?: string; // Optional: City, State, Country
  deathDate?: string; // Optional: ISO 8601 date string
  deathPlace?: string; // Optional: City, State, Country
  isLiving?: boolean; // Optional: Whether person is still alive

  // Additional details
  occupation?: string; // Optional: Primary occupation or profession
  biography?: string; // Optional: Free-form biographical text
  notes?: string; // Optional: Additional notes or research info

  // Media
  profilePhotoUrl?: string; // Optional: S3 key or URL to profile photo

  // Metadata
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  createdBy?: string; // Optional: User who created this record
  updatedBy?: string; // Optional: User who last updated
}

/**
 * Zod Schema for Person Validation
 *
 * This schema validates Person data at runtime, ensuring:
 * - Required fields are present
 * - Data types are correct
 * - Dates are valid ISO 8601 strings
 * - String lengths are reasonable
 *
 * Used in API routes and forms to validate incoming data.
 */
export const PersonSchema = z
  .object({
    // Required fields
    userId: z.string().uuid("User ID must be a valid UUID"),
    personId: z.string().uuid("Person ID must be a valid UUID"),
    treeId: z.string().uuid("Tree ID must be a valid UUID"),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be less than 100 characters"),

    // Optional fields with constraints
    lastName: z
      .string()
      .max(100, "Last name must be less than 100 characters")
      .optional(),
    middleName: z
      .string()
      .max(100, "Middle name must be less than 100 characters")
      .optional(),
    maidenName: z
      .string()
      .max(100, "Maiden name must be less than 100 characters")
      .optional(),
    nickname: z
      .string()
      .max(50, "Nickname must be less than 50 characters")
      .optional(),

    // Gender with enum validation
    gender: z.nativeEnum(Gender).optional(),

    // Dates - ISO 8601 format validation
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be in YYYY-MM-DD format")
      .optional(),
    birthPlace: z
      .string()
      .max(200, "Birth place must be less than 200 characters")
      .optional(),
    deathDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Death date must be in YYYY-MM-DD format")
      .optional(),
    deathPlace: z
      .string()
      .max(200, "Death place must be less than 200 characters")
      .optional(),
    isLiving: z.boolean().optional(),

    // Text fields with length limits
    occupation: z
      .string()
      .max(200, "Occupation must be less than 200 characters")
      .optional(),
    biography: z
      .string()
      .max(5000, "Biography must be less than 5000 characters")
      .optional(),
    notes: z
      .string()
      .max(2000, "Notes must be less than 2000 characters")
      .optional(),

    // Media
    profilePhotoUrl: z.string().url("Must be a valid URL").optional(),

    // Timestamps
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdBy: z.string().uuid().optional(),
    updatedBy: z.string().uuid().optional(),
  })
  .strict(); // Reject unknown fields

/**
 * Input Schema for Creating a Person
 *
 * Simplified schema for form input - omits auto-generated fields
 * like IDs, keys, and timestamps which are set by the service layer.
 */
export const PersonInputSchema = PersonSchema.omit({
  userId: true,
  personId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
}).extend({
  // Override treeId to be optional in forms (can be set from context)
  treeId: z.string().uuid().optional(),
});

/**
 * Type inference from Zod schemas
 * This ensures TypeScript types stay in sync with validation schemas
 */
export type PersonInput = z.infer<typeof PersonInputSchema>;
export type PersonValidated = z.infer<typeof PersonSchema>;

// Aliases for consistency with service layer
export type PersonCreateInput = PersonInput;
export type PersonUpdateInput = Partial<PersonInput>;

// Validation schemas for service layer
export const personCreateSchema = PersonInputSchema;
export const personUpdateSchema = PersonInputSchema.partial();

/**
 * Helper function to create a Person with default values
 *
 * @param userId - User who owns this person
 * @param treeId - Tree this person belongs to
 * @param data - Partial person data
 * @returns Complete Person object with generated IDs and keys
 */
export function createPersonDefaults(
  userId: string,
  treeId: string,
  data: Partial<Person>
): Omit<
  Person,
  "PK" | "SK" | "GSI1PK" | "GSI1SK" | "GSI2PK" | "GSI2SK" | "GSI3PK" | "GSI3SK"
> {
  const now = new Date().toISOString();
  const personId = data.personId || crypto.randomUUID();

  return {
    userId,
    personId,
    treeId,
    EntityType: "Person",
    firstName: data.firstName || "",
    lastName: data.lastName,
    middleName: data.middleName,
    maidenName: data.maidenName,
    nickname: data.nickname,
    gender: data.gender,
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    deathDate: data.deathDate,
    deathPlace: data.deathPlace,
    isLiving: data.isLiving ?? true, // Default to living if not specified
    occupation: data.occupation,
    biography: data.biography,
    notes: data.notes,
    profilePhotoUrl: data.profilePhotoUrl,
    createdAt: data.createdAt || now,
    updatedAt: now,
    createdBy: data.createdBy || userId,
    updatedBy: userId,
  };
}

/**
 * Helper function to format person's full name
 *
 * @param person - Person object
 * @returns Formatted full name
 */
export function getFullName(person: Partial<Person>): string {
  const parts = [person.firstName, person.middleName, person.lastName].filter(
    Boolean
  );

  return parts.join(" ") || "Unknown";
}

/**
 * Helper function to get display name (includes nickname if available)
 *
 * @param person - Person object
 * @returns Display name with nickname
 */
export function getDisplayName(person: Partial<Person>): string {
  const fullName = getFullName(person);
  return person.nickname ? `${fullName} "${person.nickname}"` : fullName;
}

/**
 * Helper function to calculate age
 *
 * @param person - Person object
 * @returns Age in years or null if birth date not available
 */
export function calculateAge(person: Partial<Person>): number | null {
  if (!person.birthDate) return null;

  const birth = new Date(person.birthDate);
  const end = person.deathDate ? new Date(person.deathDate) : new Date();

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Helper function to format life span
 *
 * @param person - Person object
 * @returns Formatted life span string (e.g., "1950-2020" or "1950-present")
 */
export function getLifeSpan(person: Partial<Person>): string {
  if (!person.birthDate) return "Unknown";

  const birthYear = new Date(person.birthDate).getFullYear();

  if (person.deathDate) {
    const deathYear = new Date(person.deathDate).getFullYear();
    return `${birthYear}-${deathYear}`;
  }

  return person.isLiving ? `${birthYear}-present` : `${birthYear}-?`;
}
