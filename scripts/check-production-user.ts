/**
 * Check production user to debug login issues
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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

async function checkUser() {
  console.log("\n=== Checking Production User ===\n");

  // Query by email using GSI1
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :email",
      ExpressionAttributeValues: {
        ":email": "demo@yggdrasil.local",
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("❌ User not found with email lookup (GSI1)");
    return;
  }

  const user = result.Items[0];
  console.log("✅ User found!");
  console.log("\nUser data:");
  console.log("- PK:", user.PK);
  console.log("- SK:", user.SK);
  console.log("- Email:", user.email);
  console.log("- Name:", user.name);
  console.log("- GSI1PK:", user.GSI1PK);
  console.log("- GSI1SK:", user.GSI1SK);
  console.log("- Password hash:", user.passwordHash.substring(0, 20) + "...");
  console.log("\n✅ User exists and is properly indexed!");
}

checkUser().catch(console.error);
