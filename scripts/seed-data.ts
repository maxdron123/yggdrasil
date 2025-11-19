#!/usr/bin/env tsx

/**
 * DynamoDB Seed Data Script
 *
 * This script populates the Yggdrasil table with sample family tree data
 * for testing and development purposes.
 *
 * What this script creates:
 * - 1 demo user account
 * - 1 family tree
 * - 3 generations of people (grandparents, parents, children)
 * - Various relationship types (biological, adoptive, marriages)
 * - Different biographical data patterns
 *
 * Run this script:
 * - npm run db:seed
 * - Can be run multiple times (uses predictable IDs)
 *
 * The seed data demonstrates:
 * - Parent-child relationships (biological and adoptive)
 * - Spousal relationships (married, divorced)
 * - Multiple children per parent
 * - People with complete vs partial biographical data
 * - Living and deceased persons
 */

// Load environment variables FIRST
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Now import AWS SDK after env vars are loaded
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

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

function logData(message: string) {
  console.log(`${colors.cyan}  →${colors.reset} ${message}`);
}

/**
 * Generate consistent IDs for seed data
 * This allows re-running the script without duplicates
 */
const SEED_IDS = {
  userId: "seed-user-001",
  treeId: "seed-tree-001",
  // Generation 1 (Grandparents)
  grandpa: "seed-person-001",
  grandma: "seed-person-002",
  // Generation 2 (Parents)
  father: "seed-person-003",
  mother: "seed-person-004",
  uncle: "seed-person-005",
  aunt: "seed-person-006",
  // Generation 3 (Children)
  child1: "seed-person-007",
  child2: "seed-person-008",
  child3: "seed-person-009",
  adoptedChild: "seed-person-010",
};

/**
 * Helper to create DynamoDB AttributeValue format
 * DynamoDB requires specific format: { S: "string" }, { N: "123" }, etc.
 */
function toDynamoDBItem(obj: Record<string, any>) {
  const item: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue; // Skip undefined/null values
    }

    if (typeof value === "string") {
      item[key] = { S: value };
    } else if (typeof value === "number") {
      item[key] = { N: value.toString() };
    } else if (typeof value === "boolean") {
      item[key] = { BOOL: value };
    } else if (Array.isArray(value)) {
      // String array
      if (value.length > 0 && typeof value[0] === "string") {
        item[key] = { SS: value };
      } else {
        item[key] = { L: value.map((v) => ({ S: v.toString() })) };
      }
    } else if (typeof value === "object") {
      // Map (nested object)
      item[key] = { M: toDynamoDBItem(value) };
    }
  }

  return item;
}

/**
 * Create seed data items
 *
 * Each item follows our single-table design pattern:
 * - PK: Primary partition key (USER#id, TREE#id, PERSON#id)
 * - SK: Sort key (PROFILE, TREE#id, PERSON#id, PARENT#id, etc.)
 * - GSI1PK/SK: For reverse lookups
 * - GSI2PK/SK: For tree-based queries
 * - GSI3PK/SK: For user-based queries
 */
async function createSeedData() {
  const now = new Date().toISOString();
  const userId = SEED_IDS.userId;
  const treeId = SEED_IDS.treeId;

  logInfo("Preparing seed data...");

  // Hash password for demo user
  const passwordHash = await bcrypt.hash("demo123", 10);

  const items = [];

  // ========================================
  // 1. USER ACCOUNT
  // ========================================
  logData("Creating demo user account...");
  items.push({
    PK: `USER#${userId}`,
    SK: "PROFILE",
    EntityType: "User",
    UserId: userId,
    Email: "demo@yggdrasil.local",
    PasswordHash: passwordHash,
    DisplayName: "Demo User",
    CreatedAt: now,
    UpdatedAt: now,
    // GSI3: User-based queries
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PROFILE`,
  });

  // ========================================
  // 2. FAMILY TREE
  // ========================================
  logData("Creating family tree...");
  items.push({
    PK: `USER#${userId}`,
    SK: `TREE#${treeId}`,
    EntityType: "Tree",
    TreeId: treeId,
    UserId: userId,
    TreeName: "The Smith Family Tree",
    Description:
      "A three-generation family tree demonstrating various relationship types and biographical data patterns.",
    RootPersonId: SEED_IDS.grandpa,
    IsPublic: false,
    PersonCount: 10,
    CreatedAt: now,
    UpdatedAt: now,
    // GSI1: Reverse lookup (tree by ID)
    GSI1PK: `TREE#${treeId}`,
    GSI1SK: `USER#${userId}`,
    // GSI3: User's trees
    GSI3PK: `USER#${userId}`,
    GSI3SK: `TREE#${now}`,
  });

  // ========================================
  // 3. GENERATION 1: GRANDPARENTS
  // ========================================
  logData("Creating Generation 1: Grandparents...");

  // Grandpa (deceased, complete biographical data)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.grandpa}`,
    EntityType: "Person",
    PersonId: SEED_IDS.grandpa,
    TreeId: treeId,
    UserId: userId,
    FirstName: "William",
    MiddleName: "James",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Male",
    BirthDate: "1940-03-15",
    DeathDate: "2018-11-22",
    BirthPlace: "Boston, Massachusetts, USA",
    DeathPlace: "Portland, Maine, USA",
    Biography:
      "William was a World War II veteran and devoted family man. He worked as a carpenter for 40 years and was known for his woodworking crafts.",
    CreatedAt: now,
    UpdatedAt: now,
    // GSI1: Reverse lookup
    GSI1PK: `PERSON#${SEED_IDS.grandpa}`,
    GSI1SK: `TREE#${treeId}`,
    // GSI2: All persons in tree
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.grandpa}`,
    // GSI3: User's persons
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#1`,
  });

  // Grandma (living, complete biographical data)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.grandma}`,
    EntityType: "Person",
    PersonId: SEED_IDS.grandma,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Margaret",
    MiddleName: "Rose",
    LastName: "Smith",
    BirthName: "Johnson",
    Gender: "Female",
    BirthDate: "1942-07-08",
    BirthPlace: "Portland, Maine, USA",
    Biography:
      "Margaret was a schoolteacher for 35 years, specializing in elementary education. She loves gardening and has won several local flower show competitions.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.grandma}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.grandma}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#2`,
  });

  // ========================================
  // 4. GENERATION 2: PARENTS
  // ========================================
  logData("Creating Generation 2: Parents...");

  // Father
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.father}`,
    EntityType: "Person",
    PersonId: SEED_IDS.father,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Robert",
    MiddleName: "William",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Male",
    BirthDate: "1968-04-12",
    BirthPlace: "Portland, Maine, USA",
    Biography:
      "Robert is a software engineer who enjoys hiking and photography. He's passionate about preserving family history.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.father}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.father}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#3`,
  });

  // Mother
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.mother}`,
    EntityType: "Person",
    PersonId: SEED_IDS.mother,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Jennifer",
    MiddleName: "Anne",
    LastName: "Smith",
    BirthName: "Davis",
    Gender: "Female",
    BirthDate: "1970-09-23",
    BirthPlace: "Seattle, Washington, USA",
    Biography:
      "Jennifer is a nurse and advocate for healthcare reform. She loves cooking and volunteers at local food banks.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.mother}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.mother}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#4`,
  });

  // Uncle (partial data)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.uncle}`,
    EntityType: "Person",
    PersonId: SEED_IDS.uncle,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Michael",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Male",
    BirthDate: "1970-11-30",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.uncle}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.uncle}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#5`,
  });

  // Aunt
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.aunt}`,
    EntityType: "Person",
    PersonId: SEED_IDS.aunt,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Linda",
    LastName: "Smith",
    BirthName: "Martinez",
    Gender: "Female",
    BirthDate: "1972-05-14",
    BirthPlace: "San Diego, California, USA",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.aunt}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.aunt}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#6`,
  });

  // ========================================
  // 5. GENERATION 3: CHILDREN
  // ========================================
  logData("Creating Generation 3: Children...");

  // Child 1 (oldest)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.child1}`,
    EntityType: "Person",
    PersonId: SEED_IDS.child1,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Emma",
    MiddleName: "Grace",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Female",
    BirthDate: "1995-06-15",
    BirthPlace: "Portland, Maine, USA",
    Biography: "Emma is studying computer science and loves robotics.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.child1}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.child1}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#7`,
  });

  // Child 2 (middle)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.child2}`,
    EntityType: "Person",
    PersonId: SEED_IDS.child2,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Oliver",
    MiddleName: "James",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Male",
    BirthDate: "1998-03-22",
    BirthPlace: "Portland, Maine, USA",
    Biography:
      "Oliver is passionate about music and plays guitar in a local band.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.child2}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.child2}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#8`,
  });

  // Child 3 (youngest biological)
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.child3}`,
    EntityType: "Person",
    PersonId: SEED_IDS.child3,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Sophia",
    LastName: "Smith",
    BirthName: "Smith",
    Gender: "Female",
    BirthDate: "2002-12-10",
    BirthPlace: "Portland, Maine, USA",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.child3}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.child3}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#9`,
  });

  // Adopted Child
  items.push({
    PK: `USER#${userId}`,
    SK: `PERSON#${SEED_IDS.adoptedChild}`,
    EntityType: "Person",
    PersonId: SEED_IDS.adoptedChild,
    TreeId: treeId,
    UserId: userId,
    FirstName: "Lucas",
    MiddleName: "Alexander",
    LastName: "Smith",
    BirthName: "Unknown",
    Gender: "Male",
    BirthDate: "2000-08-05",
    Biography: "Lucas was adopted at age 3 and is now studying marine biology.",
    CreatedAt: now,
    UpdatedAt: now,
    GSI1PK: `PERSON#${SEED_IDS.adoptedChild}`,
    GSI1SK: `TREE#${treeId}`,
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `PERSON#${SEED_IDS.adoptedChild}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `PERSON#${now}#10`,
  });

  // ========================================
  // 6. RELATIONSHIPS
  // ========================================
  logData("Creating relationships...");

  /**
   * Relationship Pattern:
   * Each relationship needs TWO records for bidirectional queries:
   * 1. PERSON#A -> RELATIONSHIP#PERSON#B
   * 2. PERSON#B -> RELATIONSHIP#PERSON#A (via GSI1)
   */

  // Grandparents marriage
  items.push(
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandpa}#SPOUSE#${SEED_IDS.grandma}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.grandpa,
      Person2Id: SEED_IDS.grandma,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1962-06-10",
      MarriagePlace: "Portland, Maine, USA",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.grandma}`,
      GSI1SK: `SPOUSE#${SEED_IDS.grandpa}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.grandpa}#${SEED_IDS.grandma}`,
    },
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandma}#SPOUSE#${SEED_IDS.grandpa}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.grandma,
      Person2Id: SEED_IDS.grandpa,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1962-06-10",
      MarriagePlace: "Portland, Maine, USA",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.grandpa}`,
      GSI1SK: `SPOUSE#${SEED_IDS.grandma}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.grandma}#${SEED_IDS.grandpa}`,
    }
  );

  // Father's parents
  items.push(
    // Grandpa -> Father
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandpa}#CHILD#${SEED_IDS.father}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.grandpa,
      ChildId: SEED_IDS.father,
      TreeId: treeId,
      UserId: userId,
      Type: "Biological",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.father}`,
      GSI1SK: `PARENT#${SEED_IDS.grandpa}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.grandpa}#${SEED_IDS.father}`,
    },
    // Grandma -> Father
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandma}#CHILD#${SEED_IDS.father}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.grandma,
      ChildId: SEED_IDS.father,
      TreeId: treeId,
      UserId: userId,
      Type: "Biological",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.father}`,
      GSI1SK: `PARENT#${SEED_IDS.grandma}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.grandma}#${SEED_IDS.father}`,
    }
  );

  // Uncle's parents
  items.push(
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandpa}#CHILD#${SEED_IDS.uncle}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.grandpa,
      ChildId: SEED_IDS.uncle,
      TreeId: treeId,
      UserId: userId,
      Type: "Biological",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.uncle}`,
      GSI1SK: `PARENT#${SEED_IDS.grandpa}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.grandpa}#${SEED_IDS.uncle}`,
    },
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.grandma}#CHILD#${SEED_IDS.uncle}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.grandma,
      ChildId: SEED_IDS.uncle,
      TreeId: treeId,
      UserId: userId,
      Type: "Biological",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.uncle}`,
      GSI1SK: `PARENT#${SEED_IDS.grandma}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.grandma}#${SEED_IDS.uncle}`,
    }
  );

  // Uncle and Aunt marriage
  items.push(
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.uncle}#SPOUSE#${SEED_IDS.aunt}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.uncle,
      Person2Id: SEED_IDS.aunt,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1995-08-20",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.aunt}`,
      GSI1SK: `SPOUSE#${SEED_IDS.uncle}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.uncle}#${SEED_IDS.aunt}`,
    },
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.aunt}#SPOUSE#${SEED_IDS.uncle}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.aunt,
      Person2Id: SEED_IDS.uncle,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1995-08-20",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.uncle}`,
      GSI1SK: `SPOUSE#${SEED_IDS.aunt}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.aunt}#${SEED_IDS.uncle}`,
    }
  );

  // Father and Mother marriage
  items.push(
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.father}#SPOUSE#${SEED_IDS.mother}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.father,
      Person2Id: SEED_IDS.mother,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1993-07-15",
      MarriagePlace: "Portland, Maine, USA",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.mother}`,
      GSI1SK: `SPOUSE#${SEED_IDS.father}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.father}#${SEED_IDS.mother}`,
    },
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.mother}#SPOUSE#${SEED_IDS.father}`,
      EntityType: "Relationship",
      RelationshipType: "Spousal",
      Person1Id: SEED_IDS.mother,
      Person2Id: SEED_IDS.father,
      TreeId: treeId,
      UserId: userId,
      Status: "Married",
      MarriageDate: "1993-07-15",
      MarriagePlace: "Portland, Maine, USA",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.father}`,
      GSI1SK: `SPOUSE#${SEED_IDS.mother}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#SPOUSE#${SEED_IDS.mother}#${SEED_IDS.father}`,
    }
  );

  // Children relationships (biological)
  const biologicalChildren = [
    SEED_IDS.child1,
    SEED_IDS.child2,
    SEED_IDS.child3,
  ];
  for (const childId of biologicalChildren) {
    items.push(
      // Father -> Child
      {
        PK: `USER#${userId}`,
        SK: `PERSON#${SEED_IDS.father}#CHILD#${childId}`,
        EntityType: "Relationship",
        RelationshipType: "ParentChild",
        ParentId: SEED_IDS.father,
        ChildId: childId,
        TreeId: treeId,
        UserId: userId,
        Type: "Biological",
        CreatedAt: now,
        UpdatedAt: now,
        GSI1PK: `PERSON#${childId}`,
        GSI1SK: `PARENT#${SEED_IDS.father}`,
        GSI2PK: `TREE#${treeId}`,
        GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.father}#${childId}`,
      },
      // Mother -> Child
      {
        PK: `USER#${userId}`,
        SK: `PERSON#${SEED_IDS.mother}#CHILD#${childId}`,
        EntityType: "Relationship",
        RelationshipType: "ParentChild",
        ParentId: SEED_IDS.mother,
        ChildId: childId,
        TreeId: treeId,
        UserId: userId,
        Type: "Biological",
        CreatedAt: now,
        UpdatedAt: now,
        GSI1PK: `PERSON#${childId}`,
        GSI1SK: `PARENT#${SEED_IDS.mother}`,
        GSI2PK: `TREE#${treeId}`,
        GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.mother}#${childId}`,
      }
    );
  }

  // Adopted child relationships
  items.push(
    // Father -> Adopted Child
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.father}#CHILD#${SEED_IDS.adoptedChild}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.father,
      ChildId: SEED_IDS.adoptedChild,
      TreeId: treeId,
      UserId: userId,
      Type: "Adoptive",
      AdoptionDate: "2003-09-15",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.adoptedChild}`,
      GSI1SK: `PARENT#${SEED_IDS.father}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.father}#${SEED_IDS.adoptedChild}`,
    },
    // Mother -> Adopted Child
    {
      PK: `USER#${userId}`,
      SK: `PERSON#${SEED_IDS.mother}#CHILD#${SEED_IDS.adoptedChild}`,
      EntityType: "Relationship",
      RelationshipType: "ParentChild",
      ParentId: SEED_IDS.mother,
      ChildId: SEED_IDS.adoptedChild,
      TreeId: treeId,
      UserId: userId,
      Type: "Adoptive",
      AdoptionDate: "2003-09-15",
      CreatedAt: now,
      UpdatedAt: now,
      GSI1PK: `PERSON#${SEED_IDS.adoptedChild}`,
      GSI1SK: `PARENT#${SEED_IDS.mother}`,
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `RELATIONSHIP#PARENT#${SEED_IDS.mother}#${SEED_IDS.adoptedChild}`,
    }
  );

  logSuccess(`Prepared ${items.length} items for seeding`);

  return items;
}

/**
 * Write items to DynamoDB in batches
 *
 * BatchWriteItem limitations:
 * - Maximum 25 items per batch
 * - Items must be <= 400 KB total
 * - No duplicate items in a batch
 */
async function writeBatchItems(items: any[]) {
  const BATCH_SIZE = 25;
  let totalWritten = 0;

  logInfo(`Writing ${items.length} items in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Convert to DynamoDB format
    const putRequests = batch.map((item) => ({
      PutRequest: {
        Item: toDynamoDBItem(item),
      },
    }));

    try {
      await dynamoDBClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: putRequests,
          },
        })
      );

      totalWritten += batch.length;
      logData(
        `Wrote batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} items`
      );
    } catch (error) {
      console.error(`Failed to write batch starting at index ${i}:`, error);
      throw error;
    }
  }

  logSuccess(`Successfully wrote ${totalWritten} items to DynamoDB`);
}

/**
 * Main execution function
 */
async function main() {
  console.log("\n=== DynamoDB Seed Data ===\n");

  logInfo("Environment configuration:");
  logData(`Endpoint: ${endpoint || "AWS DynamoDB"}`);
  logData(`Region: ${region}`);
  logData(`Table: ${tableName}`);
  console.log("");

  try {
    // Create seed data
    const items = await createSeedData();

    // Write to DynamoDB
    await writeBatchItems(items);

    // Success summary
    console.log("\n" + "=".repeat(50));
    logSuccess("Seed data created successfully!");
    console.log("=".repeat(50));

    console.log("\nSeed Data Summary:");
    logData("1 demo user (email: demo@yggdrasil.local, password: demo123)");
    logData("1 family tree (The Smith Family Tree)");
    logData("10 persons across 3 generations");
    logData("26 relationship records (spousal + parent-child)");

    console.log("\nNext steps:");
    logData("1. View data in Admin UI: http://localhost:8001");
    logData("2. Try logging in with demo credentials");
    logData("3. Explore the family tree visualization");
    logData("4. Start dev server: npm run dev\n");
  } catch (error) {
    console.log("\n" + "=".repeat(50));
    console.error("❌ Seed data creation failed!");
    console.log("=".repeat(50) + "\n");
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
