#!/usr/bin/env tsx

/**
 * DynamoDB Table Setup Script
 *
 * This script creates the Yggdrasil table in DynamoDB (Local or AWS)
 * with the complete schema including Global Secondary Indexes (GSIs).
 *
 * Run this script to initialize your database:
 * - Local: npm run db:setup (uses DynamoDB Local in Docker)
 * - AWS: Unset DYNAMODB_ENDPOINT and run with AWS credentials
 *
 * What this script does:
 * 1. Checks if table already exists
 * 2. Creates table with PK/SK structure
 * 3. Creates 3 Global Secondary Indexes for efficient queries
 * 4. Waits for table to become ACTIVE
 * 5. Verifies table creation was successful
 *
 * IMPORTANT: We load environment variables FIRST before any AWS imports.
 * This ensures the DynamoDB client is configured with the correct endpoint.
 */

// ===================================================================
// STEP 1: Load environment variables BEFORE any other imports
// ===================================================================
import dotenv from "dotenv";
import path from "path";

// Load .env.local file (local development)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Also try .env if .env.local doesn't exist
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ===================================================================
// STEP 2: Now import AWS SDK
// ===================================================================
import {
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  waitUntilTableExists,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

// ===================================================================
// STEP 3: Create DynamoDB client with environment variables
// ===================================================================
// We create the client here (not import from shared module) to ensure
// it picks up our environment variables loaded by dotenv above

const tableName = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
const endpoint = process.env.DYNAMODB_ENDPOINT;
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "fakeAccessKeyId";
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || "fakeSecretAccessKey";

const dynamoDBClient = new DynamoDBClient({
  ...(endpoint && { endpoint }),
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Color codes for terminal output
 * Makes the output easier to read and understand
 */
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

/**
 * Log helper functions for consistent output
 */
function logInfo(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Check if table already exists
 *
 * @param tableName - Name of the table to check
 * @returns true if table exists, false otherwise
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await dynamoDBClient.send(new ListTablesCommand({}));
    return result.TableNames?.includes(tableName) ?? false;
  } catch (error) {
    logError(`Failed to list tables: ${error}`);
    throw error;
  }
}

/**
 * Create the Yggdrasil table with complete schema
 *
 * Table Structure:
 * - Primary Key: PK (Partition Key) + SK (Sort Key)
 * - Both keys are Strings for maximum flexibility
 *
 * Why Single-Table Design?
 * - Cost: One table = one set of capacity units (cheaper)
 * - Performance: Related data in one query (faster)
 * - Scalability: DynamoDB scales per table
 * - Flexibility: Can store multiple entity types
 *
 * Key Patterns:
 * - User: PK=USER#<id>, SK=PROFILE
 * - Tree: PK=USER#<userId>, SK=TREE#<treeId>
 * - Person: PK=USER#<userId>, SK=PERSON#<personId>
 * - Relationship: PK=PERSON#<id1>, SK=PARENT|CHILD|SPOUSE#<id2>
 */
async function createTable(): Promise<void> {
  logInfo(`Creating table: ${tableName}...`);
  logInfo(`Endpoint: ${endpoint || "AWS DynamoDB"}`);
  logInfo(`Region: ${region}`);
  try {
    await dynamoDBClient.send(
      new CreateTableCommand({
        /**
         * Table Name
         * Same name used in both local and production for consistency
         */
        TableName: tableName,

        /**
         * Attribute Definitions
         *
         * Only define attributes used in keys (primary or GSI).
         * Other attributes can be any shape (NoSQL flexibility).
         *
         * All key attributes MUST be String type for our design.
         */
        AttributeDefinitions: [
          // Primary key attributes
          { AttributeName: "PK", AttributeType: "S" }, // Partition Key (String)
          { AttributeName: "SK", AttributeType: "S" }, // Sort Key (String)

          // GSI1 attributes (reverse lookups)
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },

          // GSI2 attributes (tree-based queries)
          { AttributeName: "GSI2PK", AttributeType: "S" },
          { AttributeName: "GSI2SK", AttributeType: "S" },

          // GSI3 attributes (user-based queries)
          { AttributeName: "GSI3PK", AttributeType: "S" },
          { AttributeName: "GSI3SK", AttributeType: "S" },
        ],

        /**
         * Primary Key Schema
         *
         * Composite key: PK + SK
         * - PK: Partition key (determines which partition stores the item)
         * - SK: Sort key (enables range queries and relationships)
         *
         * Benefits of composite key:
         * - One-to-many relationships (1 PK, many SKs)
         * - Hierarchical data (USER -> TREES -> PERSONS)
         * - Efficient range queries (begins_with, between)
         */
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" }, // HASH = Partition Key
          { AttributeName: "SK", KeyType: "RANGE" }, // RANGE = Sort Key
        ],

        /**
         * Global Secondary Indexes (GSIs)
         *
         * GSIs enable additional query patterns beyond the primary key.
         * Each GSI is essentially a separate table with its own keys.
         *
         * GSI Benefits:
         * - Query data in different ways
         * - Reverse lookups (child -> parent)
         * - Filter by different attributes
         *
         * GSI Costs:
         * - Storage: Each GSI stores a copy of projected attributes
         * - Writes: Each write goes to table + all GSIs
         * - Reads: GSIs have their own capacity units
         *
         * GSI Limitations:
         * - Eventually consistent (slight delay after writes)
         * - Must project needed attributes
         * - Can't query if keys are missing (sparse index)
         */
        GlobalSecondaryIndexes: [
          /**
           * GSI1: Reverse Lookup Index
           *
           * Purpose: Query relationships in reverse direction
           *
           * Examples:
           * - Find all children of a parent
           * - Find person by email (GSI1PK=EMAIL#<email>)
           * - Reverse any primary key query
           *
           * Pattern: GSI1PK and GSI1SK are swapped from PK/SK
           */
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: {
              /**
               * Projection Type: ALL
               *
               * Copies all attributes to the index.
               * Options:
               * - ALL: All attributes (simplest, but more storage)
               * - KEYS_ONLY: Only key attributes (minimal storage)
               * - INCLUDE: Specific attributes (balanced)
               *
               * We use ALL for maximum query flexibility.
               */
              ProjectionType: "ALL",
            },
          },

          /**
           * GSI2: Tree-Based Query Index
           *
           * Purpose: Query all entities in a specific tree
           *
           * Examples:
           * - Get all persons in a tree (GSI2PK=<treeId>, GSI2SK begins_with PERSON#)
           * - Get all relationships in a tree
           * - Sort entities by creation date within a tree
           *
           * Pattern: GSI2PK=<treeId>, GSI2SK=<timestamp or entity key>
           */
          {
            IndexName: "GSI2",
            KeySchema: [
              { AttributeName: "GSI2PK", KeyType: "HASH" },
              { AttributeName: "GSI2SK", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
          },

          /**
           * GSI3: User-Based Query Index
           *
           * Purpose: Query all entities belonging to a user
           *
           * Examples:
           * - Get all trees for a user
           * - Get recently updated items for a user
           * - User dashboard queries
           *
           * Pattern: GSI3PK=<userId>, GSI3SK=<timestamp or entity type>
           */
          {
            IndexName: "GSI3",
            KeySchema: [
              { AttributeName: "GSI3PK", KeyType: "HASH" },
              { AttributeName: "GSI3SK", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "ALL",
            },
          },
        ],

        /**
         * Billing Mode: PAY_PER_REQUEST (On-Demand)
         *
         * Two billing modes available:
         *
         * 1. PROVISIONED:
         *    - Pre-allocate Read Capacity Units (RCU) and Write Capacity Units (WCU)
         *    - Cheaper if traffic is predictable
         *    - Auto-scaling available
         *    - Risk of throttling if you exceed capacity
         *
         * 2. PAY_PER_REQUEST (On-Demand):
         *    - Pay only for what you use
         *    - No capacity planning needed
         *    - Perfect for:
         *      - Development/testing
         *      - Unpredictable traffic
         *      - New applications
         *      - Spiky workloads
         *    - ~6x more expensive per request, but often cheaper overall
         *
         * We use PAY_PER_REQUEST because:
         * - No upfront capacity planning
         * - Great for development and testing
         * - AWS Free Tier includes 25 WCU and 25 RCU (enough for development)
         * - Can switch to PROVISIONED later if needed
         */
        BillingMode: "PAY_PER_REQUEST",

        /**
         * Table Class: STANDARD
         *
         * Two table classes:
         * - STANDARD: Default, optimized for frequent access
         * - STANDARD_INFREQUENT_ACCESS: 50% cheaper storage, 25% more expensive reads
         *
         * We use STANDARD for active application data.
         */
        TableClass: "STANDARD",

        /**
         * Tags (Optional)
         *
         * Useful for:
         * - Cost allocation
         * - Resource organization
         * - Access control
         */
        Tags: [
          { Key: "Project", Value: "Yggdrasil" },
          {
            Key: "Environment",
            Value: endpoint ? "Development" : "Production",
          },
          { Key: "ManagedBy", Value: "Script" },
        ],
      })
    );

    logSuccess(`Table creation initiated: ${tableName}`);

    /**
     * Wait for table to become ACTIVE
     *
     * Table creation is asynchronous. The table goes through states:
     * CREATING -> ACTIVE
     *
     * We wait for ACTIVE before proceeding to ensure table is ready.
     *
     * Timeout: 25 attempts * 20 seconds = ~8 minutes max wait
     * (Usually takes 10-30 seconds)
     */
    logInfo("Waiting for table to become active...");

    await waitUntilTableExists(
      {
        client: dynamoDBClient,
        maxWaitTime: 300, // 5 minutes max
        minDelay: 2, // Check every 2 seconds minimum
        maxDelay: 10, // Up to 10 seconds between checks
      },
      { TableName: tableName }
    );

    logSuccess("Table is now active!");

    // Verify table was created correctly
    const description = await dynamoDBClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );

    const table = description.Table;
    if (!table) {
      throw new Error("Table description is missing");
    }

    logSuccess("Table verification:");
    console.log(`  - Table Name: ${table.TableName}`);
    console.log(`  - Table Status: ${table.TableStatus}`);
    console.log(
      `  - Billing Mode: ${
        table.BillingModeSummary?.BillingMode || "PROVISIONED"
      }`
    );
    console.log(`  - Item Count: ${table.ItemCount || 0}`);
    console.log(`  - Table Size: ${table.TableSizeBytes || 0} bytes`);
    console.log(`  - Primary Key: PK (HASH) + SK (RANGE)`);
    console.log(`  - GSIs: ${table.GlobalSecondaryIndexes?.length || 0}`);

    if (table.GlobalSecondaryIndexes) {
      table.GlobalSecondaryIndexes.forEach((gsi) => {
        console.log(`    - ${gsi.IndexName}: ${gsi.IndexStatus}`);
      });
    }
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    if (err.name === "ResourceInUseException") {
      logWarning("Table already exists!");
      return;
    }

    logError(`Failed to create table: ${err.message || error}`);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("\n=== DynamoDB Table Setup ===\n");

  // Debug: Show loaded environment
  console.log("Environment variables loaded:");
  console.log("  DYNAMODB_ENDPOINT:", process.env.DYNAMODB_ENDPOINT);
  console.log("  AWS_REGION:", process.env.AWS_REGION);
  console.log("  AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
  console.log("  DYNAMODB_TABLE_NAME:", process.env.DYNAMODB_TABLE_NAME);
  console.log("");

  try {
    // Step 1: Check if table already exists
    logInfo(`Checking if table "${tableName}" exists...`);
    const exists = await checkTableExists(tableName);

    if (exists) {
      logWarning(`Table "${tableName}" already exists!`);
      logInfo("No action needed. Table is ready to use.");

      // Show existing table info
      const description = await dynamoDBClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );

      const table = description.Table;
      if (table) {
        console.log("\nExisting table info:");
        console.log(`  - Status: ${table.TableStatus}`);
        console.log(`  - Item Count: ${table.ItemCount || 0}`);
        console.log(`  - Size: ${table.TableSizeBytes || 0} bytes`);
      }

      return;
    }

    // Step 2: Create table
    logInfo("Table does not exist. Creating now...");
    await createTable();

    // Step 3: Success message
    console.log("\n" + "=".repeat(50));
    logSuccess("Setup completed successfully!");
    console.log("=".repeat(50));

    console.log("\nNext steps:");
    console.log("  1. Run seed data: npm run db:seed");
    console.log("  2. View in Admin UI: http://localhost:8001");
    console.log("  3. Start dev server: npm run dev\n");
  } catch (error) {
    console.log("\n" + "=".repeat(50));
    logError("Setup failed!");
    console.log("=".repeat(50) + "\n");

    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
