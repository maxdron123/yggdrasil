/**
 * Delete Greek Gods Tree
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.production") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const DEMO_USER_ID = "user-demo-001";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil-Production";
const TREE_ID = "tree-greek-gods";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.DYNAMODB_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

async function deleteGreekGodsTree() {
  console.log("\n=== Deleting Greek Gods Tree ===\n");

  // 1. Delete the tree
  console.log("1. Deleting tree record...");
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${DEMO_USER_ID}`,
        SK: `TREE#${TREE_ID}`,
      },
    })
  );
  console.log("✓ Tree deleted");

  // 2. Find and delete all relationships using GSI2
  console.log("\n2. Deleting relationships...");
  const relsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression:
        "GSI2PK = :treePK AND begins_with(GSI2SK, :relPrefix)",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${TREE_ID}`,
        ":relPrefix": "REL#",
      },
    })
  );

  if (relsResult.Items && relsResult.Items.length > 0) {
    // Delete in batches of 25
    for (let i = 0; i < relsResult.Items.length; i += 25) {
      const batch = relsResult.Items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: {
                Key: {
                  PK: item.PK,
                  SK: item.SK,
                },
              },
            })),
          },
        })
      );
      console.log(
        `✓ Deleted ${Math.min(i + 25, relsResult.Items.length)}/${
          relsResult.Items.length
        } relationships`
      );
    }
  }

  // 3. Find and delete all persons
  console.log("\n3. Deleting persons...");
  const personsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression:
        "GSI2PK = :treePK AND begins_with(GSI2SK, :personPrefix)",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${TREE_ID}`,
        ":personPrefix": "PERSON#",
      },
    })
  );

  if (personsResult.Items && personsResult.Items.length > 0) {
    for (let i = 0; i < personsResult.Items.length; i += 25) {
      const batch = personsResult.Items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: {
                Key: {
                  PK: item.PK,
                  SK: item.SK,
                },
              },
            })),
          },
        })
      );
      console.log(
        `✓ Deleted ${Math.min(i + 25, personsResult.Items.length)}/${
          personsResult.Items.length
        } persons`
      );
    }
  } else {
    console.log("✓ No persons found to delete");
  }

  console.log("\n✅ Greek Gods tree deleted successfully!\n");
}

deleteGreekGodsTree().catch(console.error);
