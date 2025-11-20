/**
 * Fix gods user by adding GSI1 fields for email lookup
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";

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

async function fixGodsUser() {
  console.log("\n=== Fixing Gods User (Adding GSI1 fields) ===\n");

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "USER#user-gods-demo",
        SK: "PROFILE",
      },
      UpdateExpression: "SET GSI1PK = :email, GSI1SK = :metadata",
      ExpressionAttributeValues: {
        ":email": "gods@yggdrasil.local",
        ":metadata": "USER",
      },
    })
  );

  console.log("✅ GSI1 fields added to gods user");
  console.log("\nYou can now log in with:");
  console.log("  Email:    gods@yggdrasil.local");
  console.log("  Password: gods123\n");
}

fixGodsUser().catch(console.error);
