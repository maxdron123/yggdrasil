/**
 * Create Sample Family Tree for Demo User
 *
 * Creates a complete 3-generation family tree with the Smith family
 */

import { config } from "dotenv";
import path from "path";

// Load .env.local explicitly FIRST
config({ path: path.join(process.cwd(), ".env.local") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

// Debug: Check if env vars loaded
console.log("Environment variables loaded:");
console.log("- DYNAMODB_ENDPOINT:", process.env.DYNAMODB_ENDPOINT);
console.log("- AWS_REGION:", process.env.AWS_REGION);
console.log("- AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
console.log(
  "- AWS_SECRET_ACCESS_KEY:",
  process.env.AWS_SECRET_ACCESS_KEY ? "***" : "NOT SET"
);
console.log("- TABLE_NAME:", process.env.DYNAMODB_TABLE_NAME);
console.log("");

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

const DEMO_USER_ID = "user-demo-001";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";

// Generate IDs
const TREE_ID = "tree-smith-family";
const GRANDPARENTS = {
  GRANDFATHER: "person-john-smith-sr",
  GRANDMOTHER: "person-mary-johnson-smith",
};
const PARENTS = {
  FATHER: "person-john-smith-jr",
  MOTHER: "person-sarah-williams-smith",
  UNCLE: "person-robert-smith",
  AUNT: "person-jennifer-smith-davis",
};
const CHILDREN = {
  ELDEST: "person-michael-smith",
  MIDDLE: "person-emily-smith",
  YOUNGEST: "person-daniel-smith",
  COUSIN: "person-jessica-davis",
};

async function createSampleTree() {
  console.log("\n=== Creating Sample Family Tree for Demo User ===\n");

  const now = new Date().toISOString();

  // 1. Create the tree
  const tree = {
    PK: `USER#${DEMO_USER_ID}`,
    SK: `TREE#${TREE_ID}`,
    EntityType: "Tree",
    treeId: TREE_ID,
    userId: DEMO_USER_ID,
    treeName: "The Smith Family",
    description:
      "A complete three-generation family tree showcasing parents, grandparents, siblings, and cousins.",
    isPublic: false,
    personCount: 8,
    GSI1PK: TREE_ID,
    GSI1SK: `TREE#${TREE_ID}`,
    GSI2PK: TREE_ID,
    GSI2SK: now,
    GSI3PK: DEMO_USER_ID,
    GSI3SK: now,
    createdAt: now,
    updatedAt: now,
  };

  console.log("📝 Creating tree: The Smith Family");
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: tree }));

  // 2. Create all persons
  const persons = [
    // Grandparents
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${GRANDPARENTS.GRANDFATHER}`,
      EntityType: "Person",
      personId: GRANDPARENTS.GRANDFATHER,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
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
        "World War II veteran who worked as a civil engineer for 40 years. Built bridges and highways across New England.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${GRANDPARENTS.GRANDFATHER}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${GRANDPARENTS.GRANDMOTHER}`,
      EntityType: "Person",
      personId: GRANDPARENTS.GRANDMOTHER,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
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
        "Elementary school teacher for 35 years. Passionate about literature and gardening. Still actively involved in community book club.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${GRANDPARENTS.GRANDMOTHER}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    // Parents Generation
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${PARENTS.FATHER}`,
      EntityType: "Person",
      personId: PARENTS.FATHER,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "John",
      middleName: "Robert",
      lastName: "Smith",
      nickname: "Jack",
      gender: "MALE",
      birthDate: "1975-05-12",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Software Architect",
      biography:
        "Following in his father's footsteps but with code instead of concrete. Works at a major tech company in Boston.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${PARENTS.FATHER}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${PARENTS.MOTHER}`,
      EntityType: "Person",
      personId: PARENTS.MOTHER,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Sarah",
      middleName: "Anne",
      lastName: "Williams",
      maidenName: "Williams",
      gender: "FEMALE",
      birthDate: "1978-09-24",
      birthPlace: "Providence, Rhode Island, USA",
      isLiving: true,
      occupation: "Physician",
      biography:
        "Emergency room doctor at Boston General Hospital. Met Jack in college and they've been together ever since.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${PARENTS.MOTHER}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${PARENTS.UNCLE}`,
      EntityType: "Person",
      personId: PARENTS.UNCLE,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Robert",
      middleName: "James",
      lastName: "Smith",
      nickname: "Rob",
      gender: "MALE",
      birthDate: "1977-11-30",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Chef",
      biography:
        "Owner of a popular Italian restaurant in Boston's North End. Known for his famous lasagna recipe.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${PARENTS.UNCLE}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${PARENTS.AUNT}`,
      EntityType: "Person",
      personId: PARENTS.AUNT,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
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
      biography:
        "Works for a tech startup in Cambridge. Married to Michael Davis and has one daughter.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${PARENTS.AUNT}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    // Children Generation
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${CHILDREN.ELDEST}`,
      EntityType: "Person",
      personId: CHILDREN.ELDEST,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Michael",
      middleName: "John",
      lastName: "Smith",
      gender: "MALE",
      birthDate: "2005-01-20",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "College Student",
      biography:
        "Currently studying Computer Science at MIT. Plays guitar and enjoys rock climbing.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${CHILDREN.ELDEST}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${CHILDREN.MIDDLE}`,
      EntityType: "Person",
      personId: CHILDREN.MIDDLE,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Emily",
      middleName: "Rose",
      lastName: "Smith",
      gender: "FEMALE",
      birthDate: "2008-06-15",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "High School Student",
      biography:
        "High school junior with a passion for art and photography. Aspiring graphic designer.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${CHILDREN.MIDDLE}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${CHILDREN.YOUNGEST}`,
      EntityType: "Person",
      personId: CHILDREN.YOUNGEST,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Daniel",
      middleName: "Thomas",
      lastName: "Smith",
      nickname: "Danny",
      gender: "MALE",
      birthDate: "2012-03-08",
      birthPlace: "Boston, Massachusetts, USA",
      isLiving: true,
      occupation: "Middle School Student",
      biography:
        "Loves sports, especially soccer and basketball. Member of the school robotics club.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${CHILDREN.YOUNGEST}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      PK: `USER#${DEMO_USER_ID}`,
      SK: `PERSON#${CHILDREN.COUSIN}`,
      EntityType: "Person",
      personId: CHILDREN.COUSIN,
      userId: DEMO_USER_ID,
      treeId: TREE_ID,
      firstName: "Jessica",
      middleName: "Marie",
      lastName: "Davis",
      gender: "FEMALE",
      birthDate: "2010-08-22",
      birthPlace: "Cambridge, Massachusetts, USA",
      isLiving: true,
      occupation: "Middle School Student",
      biography:
        "Talented dancer and aspiring ballerina. Performs with a local youth dance company.",
      GSI1PK: TREE_ID,
      GSI1SK: `PERSON#${CHILDREN.COUSIN}`,
      GSI2PK: TREE_ID,
      GSI2SK: now,
      GSI3PK: DEMO_USER_ID,
      GSI3SK: now,
      createdAt: now,
      updatedAt: now,
    },
  ];

  console.log(`👥 Creating ${persons.length} persons...`);
  for (const person of persons) {
    await docClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: person })
    );
    console.log(`  ✓ ${person.firstName} ${person.lastName}`);
  }

  // 3. Create relationships
  const relationships = [];

  // Grandparents married
  relationships.push(
    {
      RelationshipId: "rel-grandparents-spouse",
      Person1Id: GRANDPARENTS.GRANDFATHER,
      Person2Id: GRANDPARENTS.GRANDMOTHER,
      RelationshipType: "Spouse",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-grandparents-spouse-rev",
      Person1Id: GRANDPARENTS.GRANDMOTHER,
      Person2Id: GRANDPARENTS.GRANDFATHER,
      RelationshipType: "Spouse",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    }
  );

  // Grandparents -> Children
  const grandchildren = [PARENTS.FATHER, PARENTS.UNCLE, PARENTS.AUNT];
  for (const childId of grandchildren) {
    // Grandfather -> Child
    relationships.push({
      RelationshipId: `rel-gf-${childId}`,
      Person1Id: GRANDPARENTS.GRANDFATHER,
      Person2Id: childId,
      RelationshipType: "Parent",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Grandmother -> Child
    relationships.push({
      RelationshipId: `rel-gm-${childId}`,
      Person1Id: GRANDPARENTS.GRANDMOTHER,
      Person2Id: childId,
      RelationshipType: "Parent",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Child -> Grandfather
    relationships.push({
      RelationshipId: `rel-${childId}-gf`,
      Person1Id: childId,
      Person2Id: GRANDPARENTS.GRANDFATHER,
      RelationshipType: "Child",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Child -> Grandmother
    relationships.push({
      RelationshipId: `rel-${childId}-gm`,
      Person1Id: childId,
      Person2Id: GRANDPARENTS.GRANDMOTHER,
      RelationshipType: "Child",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
  }

  // Siblings in parents generation
  relationships.push(
    // Father-Uncle
    {
      RelationshipId: "rel-father-uncle-sib",
      Person1Id: PARENTS.FATHER,
      Person2Id: PARENTS.UNCLE,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-uncle-father-sib",
      Person1Id: PARENTS.UNCLE,
      Person2Id: PARENTS.FATHER,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    // Father-Aunt
    {
      RelationshipId: "rel-father-aunt-sib",
      Person1Id: PARENTS.FATHER,
      Person2Id: PARENTS.AUNT,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-aunt-father-sib",
      Person1Id: PARENTS.AUNT,
      Person2Id: PARENTS.FATHER,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    // Uncle-Aunt
    {
      RelationshipId: "rel-uncle-aunt-sib",
      Person1Id: PARENTS.UNCLE,
      Person2Id: PARENTS.AUNT,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-aunt-uncle-sib",
      Person1Id: PARENTS.AUNT,
      Person2Id: PARENTS.UNCLE,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    }
  );

  // Father and Mother married
  relationships.push(
    {
      RelationshipId: "rel-parents-spouse",
      Person1Id: PARENTS.FATHER,
      Person2Id: PARENTS.MOTHER,
      RelationshipType: "Spouse",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-parents-spouse-rev",
      Person1Id: PARENTS.MOTHER,
      Person2Id: PARENTS.FATHER,
      RelationshipType: "Spouse",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    }
  );

  // Father/Mother -> Three Children
  const children = [CHILDREN.ELDEST, CHILDREN.MIDDLE, CHILDREN.YOUNGEST];
  for (const childId of children) {
    // Father -> Child
    relationships.push({
      RelationshipId: `rel-father-${childId}`,
      Person1Id: PARENTS.FATHER,
      Person2Id: childId,
      RelationshipType: "Parent",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Mother -> Child
    relationships.push({
      RelationshipId: `rel-mother-${childId}`,
      Person1Id: PARENTS.MOTHER,
      Person2Id: childId,
      RelationshipType: "Parent",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Child -> Father
    relationships.push({
      RelationshipId: `rel-${childId}-father`,
      Person1Id: childId,
      Person2Id: PARENTS.FATHER,
      RelationshipType: "Child",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
    // Child -> Mother
    relationships.push({
      RelationshipId: `rel-${childId}-mother`,
      Person1Id: childId,
      Person2Id: PARENTS.MOTHER,
      RelationshipType: "Child",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    });
  }

  // Siblings among children
  relationships.push(
    // Michael-Emily
    {
      RelationshipId: "rel-michael-emily-sib",
      Person1Id: CHILDREN.ELDEST,
      Person2Id: CHILDREN.MIDDLE,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-emily-michael-sib",
      Person1Id: CHILDREN.MIDDLE,
      Person2Id: CHILDREN.ELDEST,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    // Michael-Daniel
    {
      RelationshipId: "rel-michael-daniel-sib",
      Person1Id: CHILDREN.ELDEST,
      Person2Id: CHILDREN.YOUNGEST,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-daniel-michael-sib",
      Person1Id: CHILDREN.YOUNGEST,
      Person2Id: CHILDREN.ELDEST,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    // Emily-Daniel
    {
      RelationshipId: "rel-emily-daniel-sib",
      Person1Id: CHILDREN.MIDDLE,
      Person2Id: CHILDREN.YOUNGEST,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-daniel-emily-sib",
      Person1Id: CHILDREN.YOUNGEST,
      Person2Id: CHILDREN.MIDDLE,
      RelationshipType: "Sibling",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    }
  );

  // Aunt -> Cousin
  relationships.push(
    {
      RelationshipId: "rel-aunt-cousin",
      Person1Id: PARENTS.AUNT,
      Person2Id: CHILDREN.COUSIN,
      RelationshipType: "Parent",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    },
    {
      RelationshipId: "rel-cousin-aunt",
      Person1Id: CHILDREN.COUSIN,
      Person2Id: PARENTS.AUNT,
      RelationshipType: "Child",
      TreeId: TREE_ID,
      UserId: DEMO_USER_ID,
      CreatedAt: now,
    }
  );

  console.log(`\n🔗 Creating ${relationships.length} relationships...`);

  // Batch write relationships (25 at a time)
  for (let i = 0; i < relationships.length; i += 25) {
    const batch = relationships.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((rel) => ({
            PutRequest: { Item: rel },
          })),
        },
      })
    );
    console.log(
      `  ✓ Batch ${Math.floor(i / 25) + 1} (${batch.length} relationships)`
    );
  }

  console.log("\n==================================================");
  console.log("✅ Sample family tree created successfully!");
  console.log("==================================================");
  console.log("\nTree Details:");
  console.log(`  Name: The Smith Family`);
  console.log(`  Tree ID: ${TREE_ID}`);
  console.log(`  Persons: ${persons.length}`);
  console.log(`  Relationships: ${relationships.length}`);
  console.log("\nYou can now:");
  console.log("  1. Sign in as demo@yggdrasil.local");
  console.log("  2. Go to Dashboard");
  console.log("  3. Click on 'The Smith Family' tree");
  console.log("  4. See the complete 3-generation family!\n");
}

createSampleTree().catch(console.error);
