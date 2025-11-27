/**
 * Initialize production database with demo users
 * Run this ONCE after deploying to AWS
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

// Use production credentials
const client = new DynamoDBClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID!,
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "Yggdrasil-Production";

async function setupProduction() {
  console.log("\n=== Setting Up Production Database ===\n");

  const now = new Date().toISOString();

  // Create demo user
  const demoPassword = await bcrypt.hash("demo123", 10);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: "USER#user-demo-001",
        SK: "PROFILE",
        EntityType: "User",
        userId: "user-demo-001",
        email: "demo@yggdrasil.local",
        name: "Demo User",
        passwordHash: demoPassword,
        GSI1PK: "demo@yggdrasil.local",
        GSI1SK: "USER",
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  console.log("✅ Demo user created");
  console.log("\nCredentials:");
  console.log("  Email: demo@yggdrasil.local");
  console.log("  Password: demo123\n");
}

setupProduction().catch(console.error);
