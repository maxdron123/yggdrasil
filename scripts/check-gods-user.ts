/**
 * Check if gods user exists and verify credentials
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

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

async function checkUser() {
  console.log("\n=== Checking Gods User ===\n");

  // Query for user by email
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :email",
      ExpressionAttributeValues: {
        ":email": "gods@yggdrasil.local",
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("❌ User not found in GSI1!");

    // Try direct PK query
    const directResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :userPK AND SK = :profile",
        ExpressionAttributeValues: {
          ":userPK": "USER#user-gods-demo",
          ":profile": "PROFILE",
        },
      })
    );

    if (directResult.Items && directResult.Items.length > 0) {
      console.log("✅ User found via direct query:");
      const user = directResult.Items[0];
      console.log(JSON.stringify(user, null, 2));

      // Test password
      const isValid = await bcrypt.compare("gods123", user.passwordHash);
      console.log(
        "\nPassword test: gods123 =>",
        isValid ? "✅ VALID" : "❌ INVALID"
      );
    } else {
      console.log("❌ User not found via direct query either!");
    }
  } else {
    console.log("✅ User found in GSI1:");
    const user = result.Items[0];
    console.log(JSON.stringify(user, null, 2));

    // Test password
    const isValid = await bcrypt.compare("gods123", user.passwordHash);
    console.log(
      "\nPassword test: gods123 =>",
      isValid ? "✅ VALID" : "❌ INVALID"
    );
  }
}

checkUser().catch(console.error);
