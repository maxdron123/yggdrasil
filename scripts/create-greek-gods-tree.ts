/**
 * Add Greek Gods Family Tree to Demo User
 *
 * Creates a second tree showing the Greek pantheon relationships
 * Run with: npx tsx scripts/create-greek-gods-tree.ts
 */

import { config } from "dotenv";
import path from "path";

// Load production environment for AWS access
config({ path: path.join(process.cwd(), ".env.production") });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const DEMO_USER_ID = "user-demo-001";
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil-Production";
const TREE_ID = "tree-greek-gods";

// Create DynamoDB client for AWS (not local)
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.DYNAMODB_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
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

// Helper function to create relationships
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

  const item1 = {
    PK: `PERSON#${person1Id}`,
    SK: `${
      relationshipType === "Parent" ? "PARENT" : relationshipType.toUpperCase()
    }#${person2Id}#${relationshipId}`,
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

  let item2;
  if (relationshipType === "Parent") {
    item2 = {
      PK: `PERSON#${person2Id}`,
      SK: `CHILD#${person1Id}#${relationshipId}`,
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
      SK: `${relationshipType.toUpperCase()}#${person1Id}#${relationshipId}`,
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

const GODS = {
  // Primordial/Titans
  CHAOS: "person-chaos",
  GAIA: "person-gaia",
  URANUS: "person-uranus",
  CRONUS: "person-cronus",
  RHEA: "person-rhea",
  // Olympians
  ZEUS: "person-zeus",
  HERA: "person-hera",
  POSEIDON: "person-poseidon",
  HADES: "person-hades",
  DEMETER: "person-demeter",
  HESTIA: "person-hestia",
  // Zeus's children
  ATHENA: "person-athena",
  APOLLO: "person-apollo",
  ARTEMIS: "person-artemis",
  ARES: "person-ares",
  HEPHAESTUS: "person-hephaestus",
  HERMES: "person-hermes",
  DIONYSUS: "person-dionysus",
};

async function createGreekGodsTree() {
  console.log("\n=== Creating Greek Gods Family Tree ===\n");

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
        treeName: "Greek Gods Family Tree",
        description:
          "The legendary family tree of the Greek gods and goddesses of Mount Olympus.",
        isPublic: true,
        personCount: 17,
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

  // 2. Create all gods
  console.log("👥 Creating gods and goddesses...");

  const gods = [
    // Primordial
    {
      personId: GODS.CHAOS,
      firstName: "Chaos",
      lastName: "",
      gender: "OTHER",
      isLiving: false,
      biography:
        "The primordial void from which all existence emerged. The first entity in Greek mythology.",
    },
    {
      personId: GODS.GAIA,
      firstName: "Gaia",
      lastName: "",
      gender: "FEMALE",
      isLiving: false,
      biography:
        "Mother Earth, the personification of Earth and one of the primordial deities. Mother of the Titans.",
    },
    {
      personId: GODS.URANUS,
      firstName: "Uranus",
      lastName: "",
      gender: "MALE",
      isLiving: false,
      biography:
        "Personification of the sky and heavens. Father of the Titans with Gaia.",
    },
    // Titans
    {
      personId: GODS.CRONUS,
      firstName: "Cronus",
      lastName: "",
      gender: "MALE",
      isLiving: false,
      occupation: "Titan King",
      biography:
        "Leader of the Titans who overthrew his father Uranus. Father of the first generation Olympians.",
    },
    {
      personId: GODS.RHEA,
      firstName: "Rhea",
      lastName: "",
      gender: "FEMALE",
      isLiving: false,
      occupation: "Titan Queen",
      biography:
        "Titaness and mother of the first generation of Olympian gods.",
    },
    // Olympians - First Generation
    {
      personId: GODS.ZEUS,
      firstName: "Zeus",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "King of the Gods",
      biography:
        "King of the gods, ruler of Mount Olympus, and god of the sky, lightning, and thunder.",
    },
    {
      personId: GODS.HERA,
      firstName: "Hera",
      lastName: "",
      maidenName: "",
      gender: "FEMALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "Queen of the Gods",
      biography:
        "Queen of the gods, goddess of marriage, women, and family. Wife and sister of Zeus.",
    },
    {
      personId: GODS.POSEIDON,
      firstName: "Poseidon",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "God of the Sea",
      biography:
        "God of the sea, earthquakes, and horses. One of the three most powerful Olympians.",
    },
    {
      personId: GODS.HADES,
      firstName: "Hades",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "God of the Underworld",
      biography:
        "God of the underworld and the dead. Rules the realm beneath the earth.",
    },
    {
      personId: GODS.DEMETER,
      firstName: "Demeter",
      lastName: "",
      gender: "FEMALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "Goddess of Agriculture",
      biography:
        "Goddess of agriculture, harvest, and the fertility of the earth.",
    },
    {
      personId: GODS.HESTIA,
      firstName: "Hestia",
      lastName: "",
      gender: "FEMALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "Goddess of the Hearth",
      biography:
        "Goddess of the hearth, home, and family. The eldest of the Olympians.",
    },
    // Zeus's Children
    {
      personId: GODS.ATHENA,
      firstName: "Athena",
      lastName: "",
      gender: "FEMALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "Goddess of Wisdom",
      biography:
        "Goddess of wisdom, warfare, and strategy. Born from Zeus's forehead fully grown and armored.",
    },
    {
      personId: GODS.APOLLO,
      firstName: "Apollo",
      lastName: "",
      gender: "MALE",
      birthPlace: "Delos, Greece",
      isLiving: true,
      occupation: "God of the Sun",
      biography:
        "God of the sun, music, poetry, prophecy, and healing. Twin brother of Artemis.",
    },
    {
      personId: GODS.ARTEMIS,
      firstName: "Artemis",
      lastName: "",
      gender: "FEMALE",
      birthPlace: "Delos, Greece",
      isLiving: true,
      occupation: "Goddess of the Hunt",
      biography:
        "Goddess of the hunt, wilderness, and the moon. Twin sister of Apollo.",
    },
    {
      personId: GODS.ARES,
      firstName: "Ares",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "God of War",
      biography: "God of war, violence, and bloodshed. Son of Zeus and Hera.",
    },
    {
      personId: GODS.HEPHAESTUS,
      firstName: "Hephaestus",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Olympus, Greece",
      isLiving: true,
      occupation: "God of Fire and Forge",
      biography:
        "God of fire, metalworking, and crafts. The divine blacksmith who forged weapons for the gods.",
    },
    {
      personId: GODS.HERMES,
      firstName: "Hermes",
      lastName: "",
      gender: "MALE",
      birthPlace: "Mount Cyllene, Greece",
      isLiving: true,
      occupation: "Messenger of the Gods",
      biography:
        "God of travel, trade, communication, and thieves. Messenger of the gods with winged sandals.",
    },
    {
      personId: GODS.DIONYSUS,
      firstName: "Dionysus",
      lastName: "",
      gender: "MALE",
      birthPlace: "Thebes, Greece",
      isLiving: true,
      occupation: "God of Wine",
      biography: "God of wine, festivity, and theater. The youngest Olympian.",
    },
  ];

  for (const god of gods) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${DEMO_USER_ID}`,
          SK: `PERSON#${god.personId}`,
          EntityType: "Person",
          userId: DEMO_USER_ID,
          treeId: TREE_ID,
          GSI1PK: `PERSON#${god.personId}`,
          GSI1SK: "METADATA",
          GSI2PK: `TREE#${TREE_ID}`,
          GSI2SK: `PERSON#${god.personId}`,
          GSI3PK: DEMO_USER_ID,
          GSI3SK: `PERSON#${now}`,
          createdAt: now,
          updatedAt: now,
          ...god,
        },
      })
    );
    console.log(`  ✓ ${god.firstName}`);
  }

  // 3. Create relationships
  console.log("\n🔗 Creating divine relationships...");

  const relationships = [
    // Chaos -> Gaia (primordial origin)
    { p1: GODS.CHAOS, p2: GODS.GAIA, type: "Parent" as const },

    // Primordial -> Titans
    { p1: GODS.GAIA, p2: GODS.URANUS, type: "Spouse" as const },
    { p1: GODS.GAIA, p2: GODS.CRONUS, type: "Parent" as const },
    { p1: GODS.URANUS, p2: GODS.CRONUS, type: "Parent" as const },
    { p1: GODS.GAIA, p2: GODS.RHEA, type: "Parent" as const },
    { p1: GODS.URANUS, p2: GODS.RHEA, type: "Parent" as const },

    // Titans siblings
    { p1: GODS.CRONUS, p2: GODS.RHEA, type: "Sibling" as const },

    // Titans married
    { p1: GODS.CRONUS, p2: GODS.RHEA, type: "Spouse" as const },

    // Titans -> First Generation Olympians
    { p1: GODS.CRONUS, p2: GODS.ZEUS, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.ZEUS, type: "Parent" as const },
    { p1: GODS.CRONUS, p2: GODS.HERA, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.HERA, type: "Parent" as const },
    { p1: GODS.CRONUS, p2: GODS.POSEIDON, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.POSEIDON, type: "Parent" as const },
    { p1: GODS.CRONUS, p2: GODS.HADES, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.HADES, type: "Parent" as const },
    { p1: GODS.CRONUS, p2: GODS.DEMETER, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.DEMETER, type: "Parent" as const },
    { p1: GODS.CRONUS, p2: GODS.HESTIA, type: "Parent" as const },
    { p1: GODS.RHEA, p2: GODS.HESTIA, type: "Parent" as const },

    // Olympian siblings (complete set)
    { p1: GODS.ZEUS, p2: GODS.HERA, type: "Sibling" as const },
    { p1: GODS.ZEUS, p2: GODS.POSEIDON, type: "Sibling" as const },
    { p1: GODS.ZEUS, p2: GODS.HADES, type: "Sibling" as const },
    { p1: GODS.ZEUS, p2: GODS.DEMETER, type: "Sibling" as const },
    { p1: GODS.ZEUS, p2: GODS.HESTIA, type: "Sibling" as const },
    { p1: GODS.HERA, p2: GODS.POSEIDON, type: "Sibling" as const },
    { p1: GODS.HERA, p2: GODS.HADES, type: "Sibling" as const },
    { p1: GODS.HERA, p2: GODS.DEMETER, type: "Sibling" as const },
    { p1: GODS.HERA, p2: GODS.HESTIA, type: "Sibling" as const },
    { p1: GODS.POSEIDON, p2: GODS.HADES, type: "Sibling" as const },
    { p1: GODS.POSEIDON, p2: GODS.DEMETER, type: "Sibling" as const },
    { p1: GODS.POSEIDON, p2: GODS.HESTIA, type: "Sibling" as const },
    { p1: GODS.HADES, p2: GODS.DEMETER, type: "Sibling" as const },
    { p1: GODS.HADES, p2: GODS.HESTIA, type: "Sibling" as const },
    { p1: GODS.DEMETER, p2: GODS.HESTIA, type: "Sibling" as const },

    // Zeus married to Hera
    { p1: GODS.ZEUS, p2: GODS.HERA, type: "Spouse" as const },

    // Zeus -> His children
    { p1: GODS.ZEUS, p2: GODS.ATHENA, type: "Parent" as const },
    { p1: GODS.ZEUS, p2: GODS.APOLLO, type: "Parent" as const },
    { p1: GODS.ZEUS, p2: GODS.ARTEMIS, type: "Parent" as const },
    { p1: GODS.ZEUS, p2: GODS.ARES, type: "Parent" as const },
    { p1: GODS.ZEUS, p2: GODS.HERMES, type: "Parent" as const },
    { p1: GODS.ZEUS, p2: GODS.DIONYSUS, type: "Parent" as const },

    // Hera -> Her children (Ares and Hephaestus with Zeus)
    { p1: GODS.HERA, p2: GODS.ARES, type: "Parent" as const },
    { p1: GODS.HERA, p2: GODS.HEPHAESTUS, type: "Parent" as const },

    // Zeus's children - siblings (all children of Zeus are half-siblings)
    { p1: GODS.ATHENA, p2: GODS.APOLLO, type: "Sibling" as const },
    { p1: GODS.ATHENA, p2: GODS.ARTEMIS, type: "Sibling" as const },
    { p1: GODS.ATHENA, p2: GODS.ARES, type: "Sibling" as const },
    { p1: GODS.ATHENA, p2: GODS.HEPHAESTUS, type: "Sibling" as const },
    { p1: GODS.ATHENA, p2: GODS.HERMES, type: "Sibling" as const },
    { p1: GODS.ATHENA, p2: GODS.DIONYSUS, type: "Sibling" as const },
    { p1: GODS.APOLLO, p2: GODS.ARTEMIS, type: "Sibling" as const },
    { p1: GODS.APOLLO, p2: GODS.ARES, type: "Sibling" as const },
    { p1: GODS.APOLLO, p2: GODS.HEPHAESTUS, type: "Sibling" as const },
    { p1: GODS.APOLLO, p2: GODS.HERMES, type: "Sibling" as const },
    { p1: GODS.APOLLO, p2: GODS.DIONYSUS, type: "Sibling" as const },
    { p1: GODS.ARTEMIS, p2: GODS.ARES, type: "Sibling" as const },
    { p1: GODS.ARTEMIS, p2: GODS.HEPHAESTUS, type: "Sibling" as const },
    { p1: GODS.ARTEMIS, p2: GODS.HERMES, type: "Sibling" as const },
    { p1: GODS.ARTEMIS, p2: GODS.DIONYSUS, type: "Sibling" as const },
    { p1: GODS.ARES, p2: GODS.HEPHAESTUS, type: "Sibling" as const },
    { p1: GODS.ARES, p2: GODS.HERMES, type: "Sibling" as const },
    { p1: GODS.ARES, p2: GODS.DIONYSUS, type: "Sibling" as const },
    { p1: GODS.HEPHAESTUS, p2: GODS.HERMES, type: "Sibling" as const },
    { p1: GODS.HEPHAESTUS, p2: GODS.DIONYSUS, type: "Sibling" as const },
    { p1: GODS.HERMES, p2: GODS.DIONYSUS, type: "Sibling" as const },
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

  console.log("\n✅ Greek Gods family tree created successfully!");
  console.log("\nTree Details:");
  console.log(`  Name: Greek Gods Family Tree`);
  console.log(`  Gods: ${gods.length}`);
  console.log(`  Relationships: ${count}`);
  console.log("\nSign in as demo@yggdrasil.local to view the pantheon!\n");
}

createGreekGodsTree().catch(console.error);
