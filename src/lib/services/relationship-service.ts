/**
 * Relationship Service
 *
 * Business logic layer for relationship operations between persons.
 * Handles parent-child, spousal, and sibling relationships with proper validation.
 */

import { docClient } from "@/lib/aws/dynamodb";
import { QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  SimpleRelationship as Relationship,
  RelationshipType,
  RelationshipCreateInput,
  relationshipCreateSchema,
} from "@/types/relationship";
import { getPerson } from "./person-service";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";

/**
 * Create a relationship between two persons
 */
export async function createRelationship(
  userId: string,
  input: RelationshipCreateInput
): Promise<Relationship> {
  // Validate input
  const validatedInput = relationshipCreateSchema.parse(input);

  const { person1Id, person2Id, relationshipType, treeId } = validatedInput;

  // Verify both persons exist and belong to the same tree
  const person1 = await getPerson(person1Id, userId);
  const person2 = await getPerson(person2Id, userId);

  if (!person1 || !person2) {
    throw new Error("One or both persons not found");
  }

  if (person1.treeId !== treeId || person2.treeId !== treeId) {
    throw new Error("Persons must belong to the same tree");
  }

  if (person1.userId !== userId || person2.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Prevent self-relationships
  if (person1Id === person2Id) {
    throw new Error("Cannot create relationship with self");
  }

  const relationshipId = `rel-${uuidv4()}`;
  const now = new Date().toISOString();

  const relationship: Relationship = {
    RelationshipId: relationshipId,
    Person1Id: person1Id,
    Person2Id: person2Id,
    RelationshipType: relationshipType,
    TreeId: treeId,
    UserId: userId,
    CreatedAt: now,
  };

  // Store in DynamoDB
  // For relationships, we store TWO records to enable bidirectional queries
  const item1 = {
    PK: `PERSON#${person1Id}`,
    SK: `${relationshipType}#${person2Id}#${relationshipId}`,
    EntityType: "RELATIONSHIP",

    // GSI2: For querying relationships by tree
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `REL#${relationshipId}`,

    ...relationship,
  };

  // For bidirectional relationships (Parent/Spouse), create reverse record
  let item2;
  if (relationshipType === "Parent") {
    // If Person1 is parent of Person2, then Person2 is child of Person1
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `CHILD#${person1Id}#${relationshipId}`,
      EntityType: "RELATIONSHIP",
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `REL#${relationshipId}`,
      RelationshipId: relationshipId,
      Person1Id: person2Id,
      Person2Id: person1Id,
      RelationshipType: "Child" as RelationshipType,
      TreeId: treeId,
      UserId: userId,
      CreatedAt: now,
    };
  } else if (relationshipType === "Spouse") {
    // Spouse relationships are symmetric
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `SPOUSE#${person1Id}#${relationshipId}`,
      EntityType: "RELATIONSHIP",
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `REL#${relationshipId}`,
      ...relationship,
      Person1Id: person2Id,
      Person2Id: person1Id,
    };
  } else if (relationshipType === "Sibling") {
    // Sibling relationships are symmetric
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `SIBLING#${person1Id}#${relationshipId}`,
      EntityType: "RELATIONSHIP",
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `REL#${relationshipId}`,
      ...relationship,
      Person1Id: person2Id,
      Person2Id: person1Id,
    };
  }

  try {
    // Use BatchWriteCommand to write both records atomically
    const putRequests = [{ PutRequest: { Item: item1 } }];

    if (item2) {
      putRequests.push({ PutRequest: { Item: item2 } });
    }

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      })
    );

    return relationship;
  } catch (error) {
    console.error("Error creating relationship:", error);
    throw new Error("Failed to create relationship");
  }
}

/**
 * Get all relationships for a person
 */
export async function getPersonRelationships(
  personId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :personPK",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    // Filter only relationship items
    return result.Items.filter(
      (item) => item.EntityType === "RELATIONSHIP"
    ).map(itemToRelationship);
  } catch (error) {
    console.error("Error getting person relationships:", error);
    throw new Error("Failed to get person relationships");
  }
}

/**
 * Get all relationships in a tree
 */
export async function getTreeRelationships(
  treeId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI2",
        KeyConditionExpression:
          "GSI2PK = :treePK AND begins_with(GSI2SK, :relPrefix)",
        ExpressionAttributeValues: {
          ":treePK": `TREE#${treeId}`,
          ":relPrefix": "REL#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    // Deduplicate by RelationshipId (since we store bidirectional records)
    const uniqueRelationships = new Map<string, Relationship>();
    result.Items.forEach((item) => {
      const rel = itemToRelationship(item);
      if (!uniqueRelationships.has(rel.RelationshipId)) {
        uniqueRelationships.set(rel.RelationshipId, rel);
      }
    });

    return Array.from(uniqueRelationships.values());
  } catch (error) {
    console.error("Error getting tree relationships:", error);
    throw new Error("Failed to get tree relationships");
  }
}

/**
 * Get parents of a person
 */
export async function getPersonParents(
  personId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :personPK AND begins_with(SK, :childPrefix)",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
          ":childPrefix": "CHILD#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToRelationship);
  } catch (error) {
    console.error("Error getting person parents:", error);
    throw new Error("Failed to get person parents");
  }
}

/**
 * Get children of a person
 */
export async function getPersonChildren(
  personId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :personPK AND begins_with(SK, :parentPrefix)",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
          ":parentPrefix": "PARENT#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToRelationship);
  } catch (error) {
    console.error("Error getting person children:", error);
    throw new Error("Failed to get person children");
  }
}

/**
 * Get spouses of a person
 */
export async function getPersonSpouses(
  personId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :personPK AND begins_with(SK, :spousePrefix)",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
          ":spousePrefix": "SPOUSE#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToRelationship);
  } catch (error) {
    console.error("Error getting person spouses:", error);
    throw new Error("Failed to get person spouses");
  }
}

/**
 * Get siblings of a person
 */
export async function getPersonSiblings(
  personId: string
): Promise<Relationship[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :personPK AND begins_with(SK, :siblingPrefix)",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${personId}`,
          ":siblingPrefix": "SIBLING#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToRelationship);
  } catch (error) {
    console.error("Error getting person siblings:", error);
    throw new Error("Failed to get person siblings");
  }
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(
  relationshipId: string,
  person1Id: string,
  person2Id: string,
  relationshipType: RelationshipType,
  userId: string
): Promise<void> {
  try {
    // Verify ownership by checking if person1 belongs to user
    const person1 = await getPerson(person1Id, userId);
    if (!person1 || person1.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete both records (forward and reverse)
    const deleteRequests = [
      {
        DeleteRequest: {
          Key: {
            PK: `PERSON#${person1Id}`,
            SK: `${relationshipType}#${person2Id}`,
          },
        },
      },
    ];

    // Add reverse record deletion
    if (relationshipType === "Parent") {
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            PK: `PERSON#${person2Id}`,
            SK: `CHILD#${person1Id}`,
          },
        },
      });
    } else if (
      relationshipType === "Spouse" ||
      relationshipType === "Sibling"
    ) {
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            PK: `PERSON#${person2Id}`,
            SK: `${relationshipType}#${person1Id}`,
          },
        },
      });
    }

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      })
    );
  } catch (error) {
    console.error("Error deleting relationship:", error);
    throw new Error("Failed to delete relationship");
  }
}

/**
 * Check if a relationship exists between two persons
 */
export async function relationshipExists(
  person1Id: string,
  person2Id: string,
  relationshipType: RelationshipType
): Promise<boolean> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :personPK AND SK = :sk",
        ExpressionAttributeValues: {
          ":personPK": `PERSON#${person1Id}`,
          ":sk": `${relationshipType}#${person2Id}`,
        },
        Limit: 1,
      })
    );

    return !!result.Items && result.Items.length > 0;
  } catch (error) {
    console.error("Error checking relationship existence:", error);
    return false;
  }
}

/**
 * Convert DynamoDB item to Relationship object
 */
function itemToRelationship(item: Record<string, unknown>): Relationship {
  return {
    RelationshipId: item.RelationshipId as string,
    Person1Id: item.Person1Id as string,
    Person2Id: item.Person2Id as string,
    RelationshipType: item.RelationshipType as RelationshipType,
    TreeId: item.TreeId as string,
    UserId: item.UserId as string,
    CreatedAt: item.CreatedAt as string,
  };
}
