/**
 * Registration API Route
 *
 * Handles user registration by:
 * 1. Validating input data
 * 2. Hashing password with bcrypt
 * 3. Creating user record in DynamoDB
 * 4. Returning success/error response
 *
 * Endpoint: POST /api/auth/register
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { z } from "zod";

// Load environment variables
const tableName = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
const endpoint = process.env.DYNAMODB_ENDPOINT;
const region = process.env.AWS_REGION || "us-east-1";

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  ...(endpoint && { endpoint }),
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fakeAccessKeyId",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fakeSecretAccessKey",
  },
});

/**
 * Registration schema validation
 *
 * Uses Zod to validate request body matches expected format.
 */
const registrationSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  displayName: z.string().max(100, "Display name too long").optional(),
});

/**
 * Check if email already exists
 *
 * Note: This is a simplified check using a known pattern.
 * In production, you'd want a GSI on email for efficient lookup.
 */
async function emailExists(email: string): Promise<boolean> {
  // For demo, we're just checking against the seed user
  // In production, you'd scan or use a GSI
  try {
    const result = await dynamoDBClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: "USER#seed-user-001" },
          SK: { S: "PROFILE" },
        },
      })
    );

    if (result.Item && result.Item.Email?.S === email) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
}

/**
 * POST /api/auth/register
 *
 * Create a new user account
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = registrationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, displayName } = validationResult.data;

    // Check if email already exists
    const exists = await emailExists(email);
    if (exists) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Generate user ID
    const userId = uuidv4();

    // Hash password (cost factor 10 = ~65ms on modern CPU)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user record
    const now = new Date().toISOString();

    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          PK: { S: `USER#${userId}` },
          SK: { S: "PROFILE" },
          EntityType: { S: "User" },
          UserId: { S: userId },
          Email: { S: email },
          PasswordHash: { S: passwordHash },
          ...(displayName && { DisplayName: { S: displayName } }),
          CreatedAt: { S: now },
          UpdatedAt: { S: now },
          // GSI3 for user-based queries
          GSI3PK: { S: `USER#${userId}` },
          GSI3SK: { S: "PROFILE" },
        },
        // Prevent overwriting if user somehow already exists
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    // Return success (don't include sensitive data)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          displayName: displayName || email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);

    const err = error as Error & { name?: string };

    // Handle conditional check failure
    if (err.name === "ConditionalCheckFailedException") {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/auth/register
 *
 * Handle preflight CORS requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
