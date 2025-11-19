#!/usr/bin/env tsx

/**
 * DynamoDB Local Backup Script
 *
 * This script exports all data from the DynamoDB Local database
 * to a JSON file for backup and versioning purposes.
 *
 * Use cases:
 * - Create backups before major changes
 * - Version control seed data
 * - Transfer data between environments
 * - Share sample datasets with team
 *
 * Run this script:
 * - npm run db:backup
 *
 * Output:
 * - backups/yggdrasil-backup-YYYYMMDD-HHMMSS.json
 *
 * The backup file contains:
 * - All items from the table
 * - Metadata (timestamp, item count, table info)
 * - DynamoDB's native JSON format (can be restored easily)
 */

// Load environment variables FIRST
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Now import AWS SDK
import { ScanCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Create client with environment variables
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
 */
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logData(message: string) {
  console.log(`${colors.cyan}  →${colors.reset} ${message}`);
}

/**
 * Get table metadata
 */
async function getTableInfo() {
  try {
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
      attributeDefinitions: result.Table?.AttributeDefinitions,
      globalSecondaryIndexes: result.Table?.GlobalSecondaryIndexes?.map(
        (gsi) => ({
          name: gsi.IndexName,
          keys: gsi.KeySchema,
          status: gsi.IndexStatus,
        })
      ),
    };
  } catch (error) {
    logWarning("Could not retrieve table metadata");
    return null;
  }
}

/**
 * Scan entire table and return all items
 *
 * Important: Scan is expensive on production!
 * - Use sparingly on AWS (costs money and consumes capacity)
 * - For large tables, consider exporting via AWS Data Pipeline
 * - This is safe for DynamoDB Local (no costs, small datasets)
 *
 * Scan pagination:
 * - DynamoDB returns max 1MB per request
 * - Use LastEvaluatedKey to get next page
 * - We continue until LastEvaluatedKey is undefined
 */
async function scanAllItems() {
  const items: any[] = [];
  let lastEvaluatedKey: any = undefined;
  let pageCount = 0;

  logInfo("Scanning table (this may take a moment for large tables)...");

  do {
    const params: any = {
      TableName: tableName,
    };

    // If we have a lastEvaluatedKey, continue from there
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamoDBClient.send(new ScanCommand(params));

    // Convert DynamoDB format to regular JavaScript objects
    const pageItems =
      result.Items?.map((item) => ({
        // Keep both formats for flexibility
        raw: item, // DynamoDB native format
        unmarshalled: unmarshall(item), // JavaScript format
      })) || [];

    items.push(...pageItems);
    lastEvaluatedKey = result.LastEvaluatedKey;
    pageCount++;

    logData(`Scanned page ${pageCount}: ${pageItems.length} items`);
  } while (lastEvaluatedKey);

  logSuccess(`Scanned ${items.length} total items from table`);

  return items;
}

/**
 * Generate timestamped filename
 */
function generateBackupFilename(): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-");

  return `yggdrasil-backup-${timestamp}.json`;
}

/**
 * Save backup to file
 */
function saveBackup(data: any, filename: string) {
  // Ensure backups directory exists
  const backupsDir = path.resolve(process.cwd(), "backups");

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    logInfo("Created backups directory");
  }

  const filepath = path.join(backupsDir, filename);

  // Write with pretty printing for readability
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");

  return filepath;
}

/**
 * Calculate backup file size
 */
function getFileSizeInMB(filepath: string): number {
  const stats = fs.statSync(filepath);
  return stats.size / (1024 * 1024);
}

/**
 * Main execution function
 */
async function main() {
  console.log("\n=== DynamoDB Local Backup ===\n");

  logInfo("Backup configuration:");
  logData(`Endpoint: ${endpoint || "AWS DynamoDB"}`);
  logData(`Region: ${region}`);
  logData(`Table: ${tableName}`);
  console.log("");

  try {
    // Get table info
    logInfo("Retrieving table information...");
    const tableInfo = await getTableInfo();

    if (tableInfo) {
      logData(`Table: ${tableInfo.tableName}`);
      logData(`Status: ${tableInfo.status}`);
      logData(`Approximate item count: ${tableInfo.itemCount}`);
      logData(`Table size: ${(tableInfo.sizeBytes / 1024).toFixed(2)} KB`);
      console.log("");
    }

    // Scan all items
    const items = await scanAllItems();

    if (items.length === 0) {
      logWarning("Table is empty - no data to backup");
      console.log("\nTo populate with sample data, run: npm run db:seed\n");
      return;
    }

    // Prepare backup data
    const backupData = {
      metadata: {
        backupDate: new Date().toISOString(),
        tableName,
        itemCount: items.length,
        environment: endpoint ? "Local (Docker)" : "AWS",
        endpoint,
        region,
        tableInfo,
      },
      items: items.map((item) => item.unmarshalled), // Use unmarshalled format
      rawItems: items.map((item) => item.raw), // Keep raw format for restore
    };

    // Generate filename
    const filename = generateBackupFilename();
    logInfo(`Saving backup to: ${filename}`);

    // Save to file
    const filepath = saveBackup(backupData, filename);
    const fileSize = getFileSizeInMB(filepath);

    // Success summary
    console.log("\n" + "=".repeat(50));
    logSuccess("Backup completed successfully!");
    console.log("=".repeat(50));

    console.log("\nBackup Details:");
    logData(`File: ${path.basename(filepath)}`);
    logData(`Location: ${filepath}`);
    logData(`Size: ${fileSize.toFixed(2)} MB`);
    logData(`Items backed up: ${items.length}`);

    console.log("\nBackup Contents:");
    // Group items by entity type
    const entityCounts: Record<string, number> = {};
    items.forEach((item) => {
      const entityType = item.unmarshalled.EntityType || "Unknown";
      entityCounts[entityType] = (entityCounts[entityType] || 0) + 1;
    });

    Object.entries(entityCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([type, count]) => {
        logData(`${type}: ${count} items`);
      });

    console.log("\nTo restore this backup:");
    logData("1. Stop your application");
    logData("2. Delete existing table: Delete the table in Admin UI");
    logData("3. Recreate table: npm run db:setup");
    logData("4. Import backup manually via Admin UI or custom script");
    console.log("");
  } catch (error) {
    console.log("\n" + "=".repeat(50));
    console.error("❌ Backup failed!");
    console.log("=".repeat(50) + "\n");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
