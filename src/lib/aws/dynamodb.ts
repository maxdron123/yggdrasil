/**
 * DynamoDB Client Configuration
 *
 * This module sets up the DynamoDB clients for both low-level and high-level operations.
 * It automatically configures based on the environment (local Docker vs AWS production).
 *
 * Two clients are provided:
 * 1. DynamoDBClient - Low-level client for admin operations (create table, etc.)
 * 2. DynamoDBDocumentClient - High-level client for CRUD operations (recommended)
 *
 * The DocumentClient automatically marshals/unmarshals JavaScript objects to/from
 * DynamoDB's AttributeValue format, making it much easier to work with.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { dynamoDBConfig, appConfig } from "./config";

/**
 * Create the base DynamoDB client
 *
 * This is the low-level client that sends raw DynamoDB commands.
 * Used for administrative operations like CreateTable, DescribeTable, etc.
 *
 * Configuration:
 * - endpoint: Points to Docker (local) or AWS (production)
 * - region: AWS region (required even for local)
 * - credentials: Dummy for local, real/IAM for production
 */
export const dynamoDBClient = new DynamoDBClient({
  // Use local endpoint if DYNAMODB_ENDPOINT is set, otherwise use AWS default
  ...(dynamoDBConfig.endpoint && { endpoint: dynamoDBConfig.endpoint }),

  // AWS region
  region: dynamoDBConfig.region,

  // Credentials (dummy for local, IAM/env for production)
  ...(dynamoDBConfig.credentials && {
    credentials: dynamoDBConfig.credentials,
  }),
});

/**
 * Create the DynamoDB Document Client
 *
 * This is the high-level client that automatically converts JavaScript objects
 * to DynamoDB format. Use this for all CRUD operations in your application.
 *
 * Example without DocumentClient (complex):
 * {
 *   PK: { S: "USER#123" },
 *   SK: { S: "PERSON#456" },
 *   FirstName: { S: "John" },
 *   Age: { N: "30" }
 * }
 *
 * Example with DocumentClient (simple):
 * {
 *   PK: "USER#123",
 *   SK: "PERSON#456",
 *   FirstName: "John",
 *   Age: 30
 * }
 *
 * The DocumentClient handles all the type conversion automatically!
 */
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  /**
   * Marshalling Options
   *
   * These options control how JavaScript values are converted to DynamoDB format:
   */
  marshallOptions: {
    /**
     * convertEmptyValues
     *
     * true = Empty strings ("") and empty binary buffers are converted to NULL
     * false = Throws error on empty values
     *
     * Recommendation: true (allows empty strings in optional fields)
     */
    convertEmptyValues: true,

    /**
     * removeUndefinedValues
     *
     * true = Remove properties with undefined values before sending to DynamoDB
     * false = Throw error if undefined values are present
     *
     * Recommendation: true (safer, prevents errors from optional fields)
     *
     * Example:
     * { name: "John", age: undefined } → { name: "John" }
     */
    removeUndefinedValues: true,

    /**
     * convertClassInstanceToMap
     *
     * true = Convert class instances to plain objects
     * false = Keep class instances as-is
     *
     * Recommendation: true (DynamoDB doesn't support class instances)
     */
    convertClassInstanceToMap: true,
  },

  /**
   * Unmarshalling Options
   *
   * These options control how DynamoDB format is converted back to JavaScript:
   */
  unmarshallOptions: {
    /**
     * wrapNumbers
     *
     * true = Return numbers as { value: "123" } objects (preserves precision)
     * false = Return numbers as native JavaScript numbers
     *
     * Recommendation: false (easier to work with, precision usually not an issue)
     *
     * Note: JavaScript numbers are IEEE 754 double precision (safe up to 2^53 - 1)
     * If you need exact precision for very large numbers, set to true
     */
    wrapNumbers: false,
  },
});

/**
 * Helper function to check if DynamoDB is accessible
 *
 * This is useful during application startup to verify connectivity.
 * Can be called in a healthcheck endpoint or during initialization.
 *
 * @returns Promise<boolean> - true if DynamoDB is accessible, false otherwise
 */
export async function checkDynamoDBConnection(): Promise<boolean> {
  try {
    // Try to list tables as a simple connectivity test
    const { ListTablesCommand } = await import("@aws-sdk/client-dynamodb");
    await dynamoDBClient.send(new ListTablesCommand({ Limit: 1 }));

    if (appConfig.debug) {
      console.log("✅ DynamoDB connection successful");
    }

    return true;
  } catch (error) {
    console.error("❌ DynamoDB connection failed:", error);
    return false;
  }
}

/**
 * Helper function to check if a specific table exists
 *
 * @param tableName - Name of the table to check
 * @returns Promise<boolean> - true if table exists, false otherwise
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { DescribeTableCommand } = await import("@aws-sdk/client-dynamodb");
    await dynamoDBClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );

    if (appConfig.debug) {
      console.log(`✅ Table "${tableName}" exists`);
    }

    return true;
  } catch (error) {
    const err = error as { name?: string };
    if (err.name === "ResourceNotFoundException") {
      if (appConfig.debug) {
        console.log(`⚠️ Table "${tableName}" does not exist`);
      }
      return false;
    }

    // Other errors (permission issues, network, etc.)
    console.error(`❌ Error checking table "${tableName}":`, error);
    throw error;
  }
}

/**
 * Helper function to get table information
 *
 * Returns detailed information about a table including:
 * - Item count (approximate)
 * - Table size in bytes
 * - Table status
 * - GSI information
 *
 * @param tableName - Name of the table
 * @returns Promise<object | null> - Table description or null if doesn't exist
 */
export async function getTableInfo(tableName: string) {
  try {
    const { DescribeTableCommand } = await import("@aws-sdk/client-dynamodb");
    const result = await dynamoDBClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );

    return {
      tableName: result.Table?.TableName,
      status: result.Table?.TableStatus,
      itemCount: result.Table?.ItemCount || 0,
      sizeBytes: result.Table?.TableSizeBytes || 0,
      creationDate: result.Table?.CreationDateTime,
      keySchema: result.Table?.KeySchema,
      globalSecondaryIndexes: result.Table?.GlobalSecondaryIndexes,
    };
  } catch (error) {
    const err = error as { name?: string };
    if (err.name === "ResourceNotFoundException") {
      return null;
    }
    throw error;
  }
}

/**
 * Log DynamoDB client configuration (development only)
 */
if (appConfig.debug) {
  console.log("🗄️ DynamoDB Client Configured:");
  console.log("- Mode:", appConfig.isLocal ? "Local (Docker)" : "AWS");
  console.log("- Endpoint:", dynamoDBConfig.endpoint || "AWS Default");
  console.log("- Region:", dynamoDBConfig.region);
  console.log("- Table Name:", dynamoDBConfig.tableName);

  // Test connection on startup (async, doesn't block)
  checkDynamoDBConnection().then((connected) => {
    if (connected) {
      console.log("✅ DynamoDB is accessible");

      // Check if main table exists
      checkTableExists(dynamoDBConfig.tableName).then((exists) => {
        if (!exists) {
          console.log(`⚠️ Table "${dynamoDBConfig.tableName}" not found`);
          console.log("💡 Run: npm run db:setup to create tables");
        }
      });
    } else {
      console.error("❌ Cannot connect to DynamoDB");
      if (appConfig.isLocal) {
        console.log("💡 Make sure Docker is running: npm run docker:up");
      }
    }
  });
}

// Export clients and utilities
const dynamoDBUtils = {
  client: dynamoDBClient,
  docClient,
  checkConnection: checkDynamoDBConnection,
  checkTableExists,
  getTableInfo,
};

export default dynamoDBUtils;
