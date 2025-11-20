/**
 * Create a separate demo user for Greek Gods tree
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
const NEW_USER_ID = "user-gods-demo";
const GODS_TREE_ID = "tree-greek-gods";

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT,
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

async function createGodsUser() {
  console.log("\n=== Creating Greek Gods Demo User ===\n");

  const now = new Date().toISOString();
  const hashedPassword = await bcrypt.hash("gods123", 10);

  // 1. Create the new user
  console.log("👤 Creating user: gods@yggdrasil.local");

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${NEW_USER_ID}`,
        SK: `PROFILE`,
        EntityType: "User",
        userId: NEW_USER_ID,
        email: "gods@yggdrasil.local",
        name: "Greek Mythology Demo",
        passwordHash: hashedPassword,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  console.log("✅ User created");

  // 2. Get the existing Greek Gods tree
  console.log("\n🔍 Finding Greek Gods tree...");

  const treeResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :treePK AND GSI1SK = :metadata",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${GODS_TREE_ID}`,
        ":metadata": "METADATA",
      },
    })
  );

  if (!treeResult.Items || treeResult.Items.length === 0) {
    console.error("❌ Greek Gods tree not found!");
    return;
  }

  const tree = treeResult.Items[0];
  console.log(`✅ Found tree: ${tree.treeName}`);

  // 3. Update tree to point to new user
  console.log("\n🔄 Transferring tree to new user...");

  // Create new tree entry for new user
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${NEW_USER_ID}`,
        SK: `TREE#${GODS_TREE_ID}`,
        EntityType: "Tree",
        userId: NEW_USER_ID,
        treeId: GODS_TREE_ID,
        GSI1PK: `TREE#${GODS_TREE_ID}`,
        GSI1SK: "METADATA",
        GSI3PK: NEW_USER_ID,
        GSI3SK: `TREE#${now}`,
        treeName: tree.treeName,
        description: tree.description,
        isPublic: tree.isPublic,
        personCount: tree.personCount,
        sharedWith: tree.sharedWith || [],
        generationCount: tree.generationCount || 0,
        createdAt: tree.createdAt,
        updatedAt: now,
      },
    })
  );

  console.log("✅ Tree transferred to new user");

  // 4. Get all persons in the tree and update their userId
  console.log("\n👥 Updating persons in tree...");

  const personsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression:
        "GSI1PK = :treePK AND begins_with(GSI1SK, :personPrefix)",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${GODS_TREE_ID}`,
        ":personPrefix": "PERSON#",
      },
    })
  );

  if (personsResult.Items && personsResult.Items.length > 0) {
    for (const person of personsResult.Items) {
      // Create person entry for new user
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...person,
            PK: `USER#${NEW_USER_ID}`,
            userId: NEW_USER_ID,
            GSI3PK: NEW_USER_ID,
            updatedAt: now,
          },
        })
      );
      process.stdout.write(".");
    }
    console.log(` ${personsResult.Items.length} persons updated`);
  }

  // 5. Get all relationships and update their userId
  console.log("\n🔗 Updating relationships...");

  const relsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :treePK",
      ExpressionAttributeValues: {
        ":treePK": GODS_TREE_ID,
      },
    })
  );

  if (relsResult.Items && relsResult.Items.length > 0) {
    const relationshipItems = relsResult.Items.filter(
      (item) => item.EntityType === "RELATIONSHIP"
    );
    for (const rel of relationshipItems) {
      // Extract person IDs from PK and SK
      const personId = rel.PK.replace("PERSON#", "");
      const relType = rel.SK.split("#")[0];
      const otherPersonId = rel.SK.split("#")[1];

      // Create relationship entry for new user
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...rel,
            PK: `PERSON#${personId}`,
            SK: `${relType}#${otherPersonId}`,
            userId: NEW_USER_ID,
            updatedAt: now,
          },
        })
      );
      process.stdout.write(".");
    }
    console.log(` ${relationshipItems.length} relationships updated`);
  }

  console.log("\n✅ Greek Gods Demo User Created Successfully!\n");
  console.log("═══════════════════════════════════════");
  console.log("Credentials:");
  console.log("  Email:    gods@yggdrasil.local");
  console.log("  Password: gods123");
  console.log("═══════════════════════════════════════");
  console.log("\nSign in to view the Greek pantheon! 🏛️\n");
}

createGodsUser().catch(console.error);
