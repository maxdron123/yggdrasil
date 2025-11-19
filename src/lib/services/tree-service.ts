/**
 * Tree Service
 *
 * Business logic layer for family tree operations.
 * Handles CRUD operations for trees with proper validation and error handling.
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
  Tree,
  TreeCreateInput,
  TreeUpdateInput,
  treeCreateSchema,
  treeUpdateSchema,
} from "@/types/tree";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";

/**
 * Create a new family tree
 */
export async function createTree(
  userId: string,
  input: TreeCreateInput
): Promise<Tree> {
  // Validate input
  const validatedInput = treeCreateSchema.parse(input);

  const treeId = `tree-${uuidv4()}`;
  const now = new Date().toISOString();

  const tree: Tree = {
    PK: `USER#${userId}`,
    SK: `TREE#${treeId}`,
    EntityType: "Tree",
    userId: userId,
    treeId: treeId,
    GSI1PK: `TREE#${treeId}`,
    GSI1SK: "METADATA",
    GSI3PK: userId,
    GSI3SK: `TREE#${now}`,
    treeName: validatedInput.treeName,
    description: validatedInput.description,
    isPublic: validatedInput.isPublic ?? false,
    sharedWith: validatedInput.sharedWith ?? [],
    personCount: 0,
    generationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Store in DynamoDB
  const item = {
    ...tree,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        // Ensure we don't overwrite an existing tree (shouldn't happen with UUID)
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    return tree;
  } catch (error) {
    console.error("Error creating tree:", error);
    throw new Error("Failed to create tree");
  }
}

/**
 * Get a single tree by ID
 */
export async function getTree(
  treeId: string,
  userId?: string
): Promise<Tree | null> {
  try {
    // Query using GSI2 (TreeId index)
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :treePK",
        ExpressionAttributeValues: {
          ":treePK": `TREE#${treeId}`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];

    // If userId is provided, verify ownership (unless tree is public)
    if (userId && item.userId !== userId && !item.isPublic) {
      return null; // Not authorized
    }

    return itemToTree(item);
  } catch (error) {
    console.error("Error getting tree:", error);
    throw new Error("Failed to get tree");
  }
}

/**
 * Get all trees for a user
 */
export async function getUserTrees(userId: string): Promise<Tree[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :userPK AND begins_with(SK, :treePrefix)",
        ExpressionAttributeValues: {
          ":userPK": `USER#${userId}`,
          ":treePrefix": "TREE#",
        },
      })
    );

    if (!result.Items) {
      return [];
    }

    return result.Items.map(itemToTree);
  } catch (error) {
    console.error("Error getting user trees:", error);
    throw new Error("Failed to get user trees");
  }
}

/**
 * Update a tree
 */
export async function updateTree(
  treeId: string,
  userId: string,
  input: TreeUpdateInput
): Promise<Tree> {
  // Validate input
  const validatedInput = treeUpdateSchema.parse(input);

  const now = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, string | boolean | null> = {};

  if (validatedInput.treeName !== undefined) {
    updateExpressions.push("treeName = :treeName");
    attributeValues[":treeName"] = validatedInput.treeName;
  }

  if (validatedInput.description !== undefined) {
    updateExpressions.push("#desc = :desc");
    attributeNames["#desc"] = "description";
    attributeValues[":desc"] = validatedInput.description;
  }

  if (validatedInput.isPublic !== undefined) {
    updateExpressions.push("isPublic = :isPublic");
    attributeValues[":isPublic"] = validatedInput.isPublic;
  }

  if (validatedInput.rootPersonId !== undefined) {
    updateExpressions.push("rootPersonId = :rootPersonId");
    attributeValues[":rootPersonId"] = validatedInput.rootPersonId;
  }

  // Always update updatedAt and GSI3SK
  updateExpressions.push("updatedAt = :updatedAt", "GSI3SK = :updatedAt");
  attributeValues[":updatedAt"] = `TREE#${now}`;
  attributeValues[":userId"] = userId;

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TREE#${treeId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames:
          Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
        ExpressionAttributeValues: attributeValues,
        ConditionExpression: "userId = :userId", // Ensure user owns the tree
        ReturnValues: "ALL_NEW",
      })
    );

    if (!result.Attributes) {
      throw new Error("Tree not found or unauthorized");
    }

    return itemToTree(result.Attributes);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new Error("Tree not found or unauthorized");
    }
    console.error("Error updating tree:", error);
    throw new Error("Failed to update tree");
  }
}

/**
 * Delete a tree and all its associated data
 * WARNING: This will delete all persons and relationships in the tree
 */
export async function deleteTree(
  treeId: string,
  userId: string
): Promise<void> {
  try {
    // First, verify ownership and get the tree
    const tree = await getTree(treeId, userId);
    if (!tree || tree.userId !== userId) {
      throw new Error("Tree not found or unauthorized");
    }

    // TODO: In a production system, we should:
    // 1. Query all persons in this tree (using GSI2)
    // 2. Query all relationships in this tree
    // 3. Delete them in batches
    // For now, we'll just delete the tree record

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TREE#${treeId}`,
        },
        ConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new Error("Tree not found or unauthorized");
    }
    console.error("Error deleting tree:", error);
    throw new Error("Failed to delete tree");
  }
}

/**
 * Increment the person count for a tree
 */
export async function incrementTreePersonCount(
  treeId: string,
  userId: string
): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TREE#${treeId}`,
        },
        UpdateExpression: "ADD personCount :inc SET updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":inc": 1,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.error("Error incrementing person count:", error);
    // Don't throw - this is not critical
  }
}

/**
 * Decrement the person count for a tree
 */
export async function decrementTreePersonCount(
  treeId: string,
  userId: string
): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TREE#${treeId}`,
        },
        UpdateExpression: "ADD personCount :dec SET updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":dec": -1,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.error("Error decrementing person count:", error);
    // Don't throw - this is not critical
  }
}

/**
 * Convert DynamoDB item to Tree object
 */
function itemToTree(item: Record<string, unknown>): Tree {
  return item as unknown as Tree;
}
