/**
 * Analyze Greek Gods Tree Connections
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.production") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil-Production";
const TREE_ID = "tree-greek-gods";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.DYNAMODB_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

async function analyzeConnections() {
  console.log("\n=== Analyzing Greek Gods Connections ===\n");

  // Get all persons
  const personsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression:
        "GSI2PK = :treePK AND begins_with(GSI2SK, :personPrefix)",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${TREE_ID}`,
        ":personPrefix": "PERSON#",
      },
    })
  );

  const persons = personsResult.Items || [];
  console.log(`Total persons: ${persons.length}\n`);

  // Get all relationships
  const relsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression:
        "GSI2PK = :treePK AND begins_with(GSI2SK, :relPrefix)",
      ExpressionAttributeValues: {
        ":treePK": `TREE#${TREE_ID}`,
        ":relPrefix": "REL#",
      },
    })
  );

  // Deduplicate relationships
  const uniqueRels = new Map();
  relsResult.Items?.forEach((item) => {
    if (!uniqueRels.has(item.RelationshipId)) {
      uniqueRels.set(item.RelationshipId, item);
    }
  });

  console.log(`Total unique relationships: ${uniqueRels.size}\n`);

  // Count connections per person
  const connections = new Map();
  persons.forEach((p) => {
    connections.set(p.personId, { person: p, count: 0, types: new Set() });
  });

  uniqueRels.forEach((rel) => {
    if (connections.has(rel.Person1Id)) {
      connections.get(rel.Person1Id).count++;
      connections.get(rel.Person1Id).types.add(rel.RelationshipType);
    }
    if (connections.has(rel.Person2Id)) {
      connections.get(rel.Person2Id).count++;
      connections
        .get(rel.Person2Id)
        .types.add(
          rel.RelationshipType === "Parent"
            ? "Child"
            : rel.RelationshipType === "Child"
            ? "Parent"
            : rel.RelationshipType
        );
    }
  });

  // Show disconnected or poorly connected gods
  console.log("Connection Analysis:\n");

  const disconnected = [];
  const weaklyConnected = [];
  const wellConnected = [];

  connections.forEach((data, personId) => {
    if (data.count === 0) {
      disconnected.push(data);
    } else if (data.count <= 2) {
      weaklyConnected.push(data);
    } else {
      wellConnected.push(data);
    }
  });

  if (disconnected.length > 0) {
    console.log("❌ DISCONNECTED (0 connections):");
    disconnected.forEach((data) => {
      console.log(`  - ${data.person.firstName}`);
    });
    console.log();
  }

  if (weaklyConnected.length > 0) {
    console.log("⚠️  WEAKLY CONNECTED (1-2 connections):");
    weaklyConnected.forEach((data) => {
      console.log(
        `  - ${data.person.firstName}: ${data.count} connections (${Array.from(
          data.types
        ).join(", ")})`
      );
    });
    console.log();
  }

  console.log("✅ WELL CONNECTED (3+ connections):");
  wellConnected
    .sort((a, b) => b.count - a.count)
    .forEach((data) => {
      console.log(
        `  - ${data.person.firstName}: ${data.count} connections (${Array.from(
          data.types
        ).join(", ")})`
      );
    });

  // Show all relationships grouped by type
  console.log("\n\n=== Relationships by Type ===\n");

  const byType = new Map();
  uniqueRels.forEach((rel) => {
    if (!byType.has(rel.RelationshipType)) {
      byType.set(rel.RelationshipType, []);
    }
    byType.get(rel.RelationshipType).push(rel);
  });

  byType.forEach((rels, type) => {
    console.log(`\n${type} (${rels.length}):`);
    rels.forEach((rel) => {
      const p1 = persons.find((p) => p.personId === rel.Person1Id);
      const p2 = persons.find((p) => p.personId === rel.Person2Id);
      console.log(`  ${p1?.firstName} → ${p2?.firstName}`);
    });
  });

  console.log("\n");
}

analyzeConnections().catch(console.error);
