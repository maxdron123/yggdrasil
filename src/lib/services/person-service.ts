/**
 * Person Service
 *
 * Business logic layer for person operations in family trees.
 * Handles CRUD operations with proper validation and relationship tracking.
 */

import { docClient } from "@/lib/aws/dynamodb";
import {
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  Person,
  PersonCreateInput,
  PersonUpdateInput,
  personCreateSchema,
  personUpdateSchema,
} from "@/types/person";
import {
  incrementTreePersonCount,
  decrementTreePersonCount,
} from "./tree-service";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";

/**
 * Create a new person in a family tree
 */
export async function createPerson(
  userId: string,
  treeId: string,
  input: PersonCreateInput
): Promise<Person> {
  // Validate input
  const validatedInput = personCreateSchema.parse({ ...input, treeId });

  const personId = `person-${uuidv4()}`;
  const now = new Date().toISOString();

  const person: Person = {
    PK: `USER#${userId}`,
    SK: `PERSON#${personId}`,
    EntityType: "Person",
    userId,
    personId,
    treeId,
    GSI1PK: `TREE#${treeId}`,
    GSI1SK: `PERSON#${personId}`,
    GSI2PK: treeId,
    GSI2SK: now,
    GSI3PK: userId,
    GSI3SK: now,
    firstName: validatedInput.firstName,
    lastName: validatedInput.lastName,
    middleName: validatedInput.middleName,
    maidenName: validatedInput.maidenName,
    nickname: validatedInput.nickname,
    gender: validatedInput.gender,
    birthDate: validatedInput.birthDate,
    birthPlace: validatedInput.birthPlace,
    deathDate: validatedInput.deathDate,
    deathPlace: validatedInput.deathPlace,
    isLiving: validatedInput.isLiving ?? true,
    occupation: validatedInput.occupation,
    biography: validatedInput.biography,
    notes: validatedInput.notes,
    profilePhotoUrl: validatedInput.profilePhotoUrl,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: person,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    // Increment person count in the tree
    await incrementTreePersonCount(treeId, userId);

    return person;
  } catch (error) {
    console.error("Error creating person:", error);
    throw new Error("Failed to create person");
  }
}

/**
 * Get a single person by ID
 */
export async function getPerson(
  personId: string,
  userId?: string
): Promise<Person | null> {
  try {
    // Query using GSI1 (PersonId index)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :personPK",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];

    // If userId is provided, verify ownership
    // TODO: Check if tree is public
    if (userId && item.userId !== userId) {
      return null; // Not authorized
    }

    return itemToPerson(item);
  } catch (error) {
    console.error("Error getting person:", error);
    throw new Error("Failed to get person");
  }
}

/**
 * Get all persons in a tree
 */
export async function getTreePersons(
  treeId: string,
  userId?: string
): Promise<Person[]> {
  try {
    // Query using GSI2 (TreeId index)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :treeId",
        ExpressionAttributeValues: {
          ":treeId": treeId,
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    // If userId is provided, filter by ownership
    // TODO: Check if tree is public
    const persons = result.Items.map(itemToPerson);
    if (userId) {
      return persons.filter((p) => p.userId === userId);
    }

    return persons;
  } catch (error) {
    console.error("Error getting tree persons:", error);
    throw new Error("Failed to get tree persons");
  }
}

/**
 * Get all persons for a user across all trees
 */
export async function getUserPersons(userId: string): Promise<Person[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :userPK AND begins_with(SK, :personPrefix)",
        ExpressionAttributeValues: {
          ":userPK": `USER#${userId}`,
          ":personPrefix": "PERSON#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToPerson);
  } catch (error) {
    console.error("Error getting user persons:", error);
    throw new Error("Failed to get user persons");
  }
}

/**
 * Update a person
 */
export async function updatePerson(
  personId: string,
  userId: string,
  input: PersonUpdateInput
): Promise<Person> {
  // Validate input
  const validatedInput = personUpdateSchema.parse(input);

  const now = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, string | boolean | null | undefined> =
    {};

  if (validatedInput.firstName !== undefined) {
    updateExpressions.push("firstName = :firstName");
    attributeValues[":firstName"] = validatedInput.firstName;
  }

  if (validatedInput.lastName !== undefined) {
    updateExpressions.push("lastName = :lastName");
    attributeValues[":lastName"] = validatedInput.lastName;
  }

  if (validatedInput.middleName !== undefined) {
    updateExpressions.push("middleName = :middleName");
    attributeValues[":middleName"] = validatedInput.middleName;
  }

  if (validatedInput.gender !== undefined) {
    updateExpressions.push("gender = :gender");
    attributeValues[":gender"] = validatedInput.gender;
  }

  if (validatedInput.birthDate !== undefined) {
    updateExpressions.push("birthDate = :birthDate");
    attributeValues[":birthDate"] = validatedInput.birthDate;
  }

  if (validatedInput.birthPlace !== undefined) {
    updateExpressions.push("birthPlace = :birthPlace");
    attributeValues[":birthPlace"] = validatedInput.birthPlace;
  }

  if (validatedInput.deathDate !== undefined) {
    updateExpressions.push("deathDate = :deathDate");
    attributeValues[":deathDate"] = validatedInput.deathDate;
  }

  if (validatedInput.deathPlace !== undefined) {
    updateExpressions.push("deathPlace = :deathPlace");
    attributeValues[":deathPlace"] = validatedInput.deathPlace;
  }

  if (validatedInput.isLiving !== undefined) {
    updateExpressions.push("isLiving = :isLiving");
    attributeValues[":isLiving"] = validatedInput.isLiving;
  }

  if (validatedInput.profilePhotoUrl !== undefined) {
    updateExpressions.push("profilePhotoUrl = :profilePhotoUrl");
    attributeValues[":profilePhotoUrl"] = validatedInput.profilePhotoUrl;
  }

  if (validatedInput.biography !== undefined) {
    updateExpressions.push("biography = :biography");
    attributeValues[":biography"] = validatedInput.biography;
  }

  // Always update updatedAt and GSI3SK
  updateExpressions.push(
    "updatedAt = :updatedAt",
    "updatedBy = :updatedBy",
    "GSI3SK = :gsi3sk"
  );
  attributeValues[":updatedAt"] = now;
  attributeValues[":updatedBy"] = userId;
  attributeValues[":gsi3sk"] = now;
  attributeValues[":userId"] = userId;

  if (updateExpressions.length === 2) {
    throw new Error("No fields to update");
  }

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `PERSON#${personId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames:
          Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
        ExpressionAttributeValues: attributeValues,
        ConditionExpression: "userId = :userId", // Ensure user owns the person
        ReturnValues: "ALL_NEW",
      })
    );

    if (!result.Attributes) {
      throw new Error("Person not found or unauthorized");
    }

    return itemToPerson(result.Attributes);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new Error("Person not found or unauthorized");
    }
    console.error("Error updating person:", error);
    throw new Error("Failed to update person");
  }
}

/**
 * Delete a person
 * WARNING: This will also delete all relationships involving this person
 */
export async function deletePerson(
  personId: string,
  userId: string
): Promise<void> {
  try {
    // First, get the person to verify ownership and get treeId
    const person = await getPerson(personId, userId);
    if (!person || person.userId !== userId) {
      throw new Error("Person not found or unauthorized");
    }

    // TODO: Delete all relationships involving this person
    // For now, just delete the person record

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `PERSON#${personId}`,
        },
        ConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    // Decrement person count in the tree
    await decrementTreePersonCount(person.treeId, userId);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new Error("Person not found or unauthorized");
    }
    console.error("Error deleting person:", error);
    throw new Error("Failed to delete person");
  }
}

/**
 * Search persons by name in a tree
 */
export async function searchPersonsByName(
  treeId: string,
  searchTerm: string,
  userId?: string
): Promise<Person[]> {
  try {
    // Get all persons in the tree first
    const persons = await getTreePersons(treeId, userId);

    // Filter by name (case-insensitive)
    const lowerSearch = searchTerm.toLowerCase();
    return persons.filter((person) => {
      const fullName = `${person.firstName} ${person.middleName || ""} ${
        person.lastName || ""
      }`.toLowerCase();
      return fullName.includes(lowerSearch);
    });
  } catch (error) {
    console.error("Error searching persons:", error);
    throw new Error("Failed to search persons");
  }
}

/**
 * Convert DynamoDB item to Person object
 */
function itemToPerson(item: Record<string, unknown>): Person {
  return item as unknown as Person;
}
