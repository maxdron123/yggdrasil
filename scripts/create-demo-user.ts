/**
 * Create demo user with proper GSI1 fields
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
const USER_ID = "user-demo-001";

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

async function createDemoUser() {
  console.log("\n=== Creating Demo User ===\n");

  const now = new Date().toISOString();
  const hashedPassword = await bcrypt.hash("demo123", 10);

  console.log("👤 Creating user: demo@yggdrasil.local");

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${USER_ID}`,
        SK: `PROFILE`,
        EntityType: "User",
        userId: USER_ID,
        email: "demo@yggdrasil.local",
        name: "Demo User",
        passwordHash: hashedPassword,
        GSI1PK: "demo@yggdrasil.local",
        GSI1SK: "USER",
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  console.log("✅ User created successfully!");
  console.log("\n═══════════════════════════════════════");
  console.log("Credentials:");
  console.log("  Email:    demo@yggdrasil.local");
  console.log("  Password: demo123");
  console.log("═══════════════════════════════════════\n");
}

createDemoUser().catch(console.error);
