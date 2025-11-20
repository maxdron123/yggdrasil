/**
 * Check demo user credentials and GSI1 setup
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

async function checkDemoUser() {
  console.log("\n=== Checking Demo User ===\n");

  // Query for user by email using GSI1
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :email",
      ExpressionAttributeValues: {
        ":email": "demo@yggdrasil.local",
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("❌ Demo user not found in GSI1!");

    // Try direct PK query
    const directResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :userPK AND SK = :profile",
        ExpressionAttributeValues: {
          ":userPK": "USER#user-demo-001",
          ":profile": "PROFILE",
        },
      })
    );

    if (directResult.Items && directResult.Items.length > 0) {
      console.log("✅ User found via direct query:");
      const user = directResult.Items[0];
      console.log(JSON.stringify(user, null, 2));

      if (user.passwordHash) {
        // Test password
        const isValid = await bcrypt.compare("demo123", user.passwordHash);
        console.log(
          "\nPassword test: demo123 =>",
          isValid ? "✅ VALID" : "❌ INVALID"
        );
      } else {
        console.log("\n⚠️  No passwordHash field found!");
      }

      console.log("\n⚠️  Missing GSI1 fields:");
      console.log("  - GSI1PK should be: demo@yggdrasil.local");
      console.log("  - GSI1SK should be: USER");
    } else {
      console.log("❌ User not found via direct query either!");
    }
  } else {
    console.log("✅ Demo user found in GSI1:");
    const user = result.Items[0];
    console.log(JSON.stringify(user, null, 2));

    if (user.passwordHash) {
      // Test password
      const isValid = await bcrypt.compare("demo123", user.passwordHash);
      console.log(
        "\nPassword test: demo123 =>",
        isValid ? "✅ VALID" : "❌ INVALID"
      );
    } else {
      console.log("\n⚠️  No passwordHash field found!");
    }
  }
}

checkDemoUser().catch(console.error);
