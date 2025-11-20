/**
 * Create Sample Family Tree for Demo User - SIMPLE VERSION
 *
 * Uses the actual service functions to ensure data integrity
 */

import { config } from "dotenv";
import path from "path";

// Load .env.local FIRST before any other imports
config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

// Create DynamoDB client with explicit local endpoint
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

// Helper function to create relationships with proper PK/SK format
async function createRelationshipDirect(
  userId: string,
  person1Id: string,
  person2Id: string,
  relationshipType: "Parent" | "Spouse" | "Sibling",
  treeId: string
) {
  const now = new Date().toISOString();
  const relationshipId = `rel-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Create primary relationship record
  const item1 = {
    PK: `PERSON#${person1Id}`,
    SK: `${
      relationshipType === "Parent" ? "PARENT" : relationshipType.toUpperCase()
    }#${person2Id}`,
    EntityType: "RELATIONSHIP",
    GSI2PK: `TREE#${treeId}`,
    GSI2SK: `REL#${relationshipId}`,
    RelationshipId: relationshipId,
    Person1Id: person1Id,
    Person2Id: person2Id,
    RelationshipType: relationshipType,
    TreeId: treeId,
    UserId: userId,
    CreatedAt: now,
  };

  // Create reverse relationship record
  let item2;
  if (relationshipType === "Parent") {
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `CHILD#${person1Id}`,
      EntityType: "RELATIONSHIP",
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `REL#${relationshipId}`,
      RelationshipId: relationshipId,
      Person1Id: person2Id,
      Person2Id: person1Id,
      RelationshipType: "Child",
      TreeId: treeId,
      UserId: userId,
      CreatedAt: now,
    };
  } else if (relationshipType === "Spouse" || relationshipType === "Sibling") {
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `${relationshipType.toUpperCase()}#${person1Id}`,
      EntityType: "RELATIONSHIP",
      GSI2PK: `TREE#${treeId}`,
      GSI2SK: `REL#${relationshipId}`,
      RelationshipId: relationshipId,
      Person1Id: person2Id,
      Person2Id: person1Id,
      RelationshipType: relationshipType,
      TreeId: treeId,
      UserId: userId,
      CreatedAt: now,
    };
  }

  // Write both records
  const putRequests = [{ PutRequest: { Item: item1 } }];
  if (item2) {
    putRequests.push({ PutRequest: { Item: item2 } });
  }

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    })
  );
}

const DEMO_USER_ID = "user-demo-001";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
const TREE_ID = "tree-smith-family";

// Person IDs
const PERSONS = {
  // Grandparents
  JOHN_SR: "person-john-smith-sr",
  MARY: "person-mary-johnson",
  // Parents generation
  JOHN_JR: "person-john-smith-jr",
  SARAH: "person-sarah-williams",
  ROBERT: "person-robert-smith",
  JENNIFER: "person-jennifer-smith",
  // Children generation
  MICHAEL: "person-michael-smith",
  EMILY: "person-emily-smith",
  DANIEL: "person-daniel-smith",
  JESSICA: "person-jessica-davis",
};

async function createSampleTree() {
  console.log("\n=== Creating The Smith Family Tree ===\n");

  const now = new Date().toISOString();

  // 1. Create the tree
  console.log("📝 Creating tree...");
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${DEMO_USER_ID}`,
        SK: `TREE#${TREE_ID}`,
        EntityType: "Tree",
        treeId: TREE_ID,
        userId: DEMO_USER_ID,
        treeName: "The Smith Family",
        description:
          "A complete three-generation family tree showcasing parents, grandparents, siblings, and cousins.",
        isPublic: false,
        personCount: 10,
        sharedWith: [],
        generationCount: 0,
        GSI1PK: `TREE#${TREE_ID}`,
        GSI1SK: "METADATA",
        GSI3PK: DEMO_USER_ID,
        GSI3SK: `TREE#${now}`,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  // 2. Create all persons
  console.log("👥 Creating persons...");

  const persons = [
    // Grandparents
    {
      personId: PERSONS.JOHN_SR,
      firstName: "John",
      middleName: "William",
      lastName: "Smith",
      gender: "MALE",
      birthDate: "1945-03-15",
      birthPlace: "Boston, Massachusetts, USA",
      deathDate: "2020-11-22",
      deathPlace: "Boston, Massachusetts, USA",
      isLiving: false,
      occupation: "Retired Engineer",
      biography:
        "World War II veteran who worked as a civil engineer for 40 years.",
    },
    {
      personId: PERSONS.MARY,
      firstName: "Mary",
      middleName: "Elizabeth",
      lastName: "Johnson",
      maidenName: "Johnson",
      gender: "FEMALE",
      birthDate: "1948-07-08",
      birthPlace: "Portland, Maine, USA",
      isLiving: true,
      occupation: "Retired Teacher",
      biography:
        "Elementary school teacher for 35 years. Passionate about literature and gardening.",
    },
    // Parents generation
    {
      personId: PERSONS.JOHN_JR,
      firstName: "John",
      middleName: "Robert",
      lastName: "Smith",
      nickname: "Jack",
      gender: "MALE",
      birthDate: "1975-05-12",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Software Architect",
      biography: "Works at a major tech company in Boston.",
    },
    {
      personId: PERSONS.SARAH,
      firstName: "Sarah",
      middleName: "Anne",
      lastName: "Williams",
      maidenName: "Williams",
      gender: "FEMALE",
      birthDate: "1978-09-24",
      birthPlace: "Providence, Rhode Island, USA",
      isLiving: true,
      occupation: "Physician",
      biography: "Emergency room doctor at Boston General Hospital.",
    },
    {
      personId: PERSONS.ROBERT,
      firstName: "Robert",
      middleName: "James",
      lastName: "Smith",
      nickname: "Rob",
      gender: "MALE",
      birthDate: "1977-11-30",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Chef",
      biography: "Owner of a popular Italian restaurant in Boston's North End.",
    },
    {
      personId: PERSONS.JENNIFER,
      firstName: "Jennifer",
      middleName: "Lynn",
      lastName: "Smith",
      maidenName: "Smith",
      nickname: "Jen",
      gender: "FEMALE",
      birthDate: "1980-04-18",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Marketing Director",
      biography: "Works for a tech startup in Cambridge.",
    },
    // Children generation
    {
      personId: PERSONS.MICHAEL,
      firstName: "Michael",
      middleName: "John",
      lastName: "Smith",
      gender: "MALE",
      birthDate: "2005-01-20",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "College Student",
      biography: "Currently studying Computer Science at MIT.",
    },
    {
      personId: PERSONS.EMILY,
      firstName: "Emily",
      middleName: "Rose",
      lastName: "Smith",
      gender: "FEMALE",
      birthDate: "2008-06-15",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "High School Student",
      biography: "High school junior with a passion for art and photography.",
    },
    {
      personId: PERSONS.DANIEL,
      firstName: "Daniel",
      middleName: "Thomas",
      lastName: "Smith",
      nickname: "Danny",
      gender: "MALE",
      birthDate: "2012-03-08",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Middle School Student",
      biography: "Loves sports, especially soccer and basketball.",
    },
    {
      personId: PERSONS.JESSICA,
      firstName: "Jessica",
      middleName: "Marie",
      lastName: "Davis",
      gender: "FEMALE",
      birthDate: "2010-08-22",
      birthPlace: "Cambridge, Massachusetts, USA",
      isLiving: true,
      occupation: "Middle School Student",
      biography: "Talented dancer and aspiring ballerina.",
    },
  ];

  for (const person of persons) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${DEMO_USER_ID}`,
          SK: `PERSON#${person.personId}`,
          EntityType: "Person",
          userId: DEMO_USER_ID,
          treeId: TREE_ID,
          GSI1PK: `TREE#${TREE_ID}`,
          GSI1SK: `PERSON#${person.personId}`,
          GSI2PK: TREE_ID,
          GSI2SK: now,
          GSI3PK: DEMO_USER_ID,
          GSI3SK: now,
          createdAt: now,
          updatedAt: now,
          ...person,
        },
      })
    );
    console.log(`  ✓ ${person.firstName} ${person.lastName}`);
  }

  // 3. Create relationships using the service functions
  console.log("\n🔗 Creating relationships...");

  const relationships = [
    // Grandparents are spouses
    { p1: PERSONS.JOHN_SR, p2: PERSONS.MARY, type: "Spouse" as const },

    // Grandparents -> Children (3 children)
    { p1: PERSONS.JOHN_SR, p2: PERSONS.JOHN_JR, type: "Parent" as const },
    { p1: PERSONS.MARY, p2: PERSONS.JOHN_JR, type: "Parent" as const },
    { p1: PERSONS.JOHN_SR, p2: PERSONS.ROBERT, type: "Parent" as const },
    { p1: PERSONS.MARY, p2: PERSONS.ROBERT, type: "Parent" as const },
    { p1: PERSONS.JOHN_SR, p2: PERSONS.JENNIFER, type: "Parent" as const },
    { p1: PERSONS.MARY, p2: PERSONS.JENNIFER, type: "Parent" as const },

    // Siblings in parents generation
    { p1: PERSONS.JOHN_JR, p2: PERSONS.ROBERT, type: "Sibling" as const },
    { p1: PERSONS.JOHN_JR, p2: PERSONS.JENNIFER, type: "Sibling" as const },
    { p1: PERSONS.ROBERT, p2: PERSONS.JENNIFER, type: "Sibling" as const },

    // John Jr and Sarah are spouses
    { p1: PERSONS.JOHN_JR, p2: PERSONS.SARAH, type: "Spouse" as const },

    // John Jr & Sarah -> Three children
    { p1: PERSONS.JOHN_JR, p2: PERSONS.MICHAEL, type: "Parent" as const },
    { p1: PERSONS.SARAH, p2: PERSONS.MICHAEL, type: "Parent" as const },
    { p1: PERSONS.JOHN_JR, p2: PERSONS.EMILY, type: "Parent" as const },
    { p1: PERSONS.SARAH, p2: PERSONS.EMILY, type: "Parent" as const },
    { p1: PERSONS.JOHN_JR, p2: PERSONS.DANIEL, type: "Parent" as const },
    { p1: PERSONS.SARAH, p2: PERSONS.DANIEL, type: "Parent" as const },

    // Siblings among children
    { p1: PERSONS.MICHAEL, p2: PERSONS.EMILY, type: "Sibling" as const },
    { p1: PERSONS.MICHAEL, p2: PERSONS.DANIEL, type: "Sibling" as const },
    { p1: PERSONS.EMILY, p2: PERSONS.DANIEL, type: "Sibling" as const },

    // Jennifer -> Jessica (cousin)
    { p1: PERSONS.JENNIFER, p2: PERSONS.JESSICA, type: "Parent" as const },
  ];

  let count = 0;
  for (const rel of relationships) {
    try {
      await createRelationshipDirect(
        DEMO_USER_ID,
        rel.p1,
        rel.p2,
        rel.type,
        TREE_ID
      );
      count++;
      process.stdout.write(".");
    } catch (error) {
      const err = error as Error;
      console.error(`\n❌ Error: ${err.message}`);
    }
  }

  console.log(` ${count} relationships created`);

  console.log("\n✅ Sample family tree created successfully!");
  console.log("\nTree Details:");
  console.log(`  Name: The Smith Family`);
  console.log(`  Persons: ${persons.length}`);
  console.log(`  Relationships: ${count}`);
  console.log("\nSign in as demo@yggdrasil.local to view the tree!\n");
}

createSampleTree().catch(console.error);
