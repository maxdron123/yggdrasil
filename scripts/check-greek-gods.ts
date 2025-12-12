/**
 * Check Greek Gods Tree Data
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.production") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
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

async function checkData() {
  console.log("\n=== Checking Greek Gods Tree Data ===\n");

  // Check if tree exists
  console.log("1. Checking tree...");
  const treeResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${DEMO_USER_ID}`,
        SK: `TREE#${TREE_ID}`,
      },
    })
  );

  if (treeResult.Item) {
    console.log("✅ Tree found:", treeResult.Item.treeName);
    console.log("   Person count:", treeResult.Item.personCount);
  } else {
    console.log("❌ Tree not found!");
    return;
  }

  // Check persons in tree using GSI2
  console.log("\n2. Checking persons in tree...");
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

  console.log(`Found ${personsResult.Items?.length || 0} persons`);
  if (personsResult.Items && personsResult.Items.length > 0) {
    console.log("\nPersons:");
    personsResult.Items.forEach((item) => {
      console.log(
        `  - ${item.firstName} ${item.lastName || ""} (${item.personId})`
      );
    });
  }

  // Check relationships
  console.log("\n3. Checking relationships...");
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

  console.log(`Found ${relsResult.Items?.length || 0} relationship records`);

  // Count unique relationships
  const uniqueRels = new Set();
  relsResult.Items?.forEach((item) => {
    uniqueRels.add(item.RelationshipId);
  });
  console.log(`Unique relationships: ${uniqueRels.size}`);

  if (relsResult.Items && relsResult.Items.length > 0) {
    console.log("\nSample relationships:");
    const seen = new Set();
    relsResult.Items.slice(0, 10).forEach((item) => {
      if (!seen.has(item.RelationshipId)) {
        console.log(
          `  - ${item.Person1Id} → ${item.Person2Id} (${item.RelationshipType})`
        );
        seen.add(item.RelationshipId);
      }
    });
  }

  console.log("\n");
}

checkData().catch(console.error);
