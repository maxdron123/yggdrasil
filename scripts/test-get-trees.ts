/**
 * Test getUserTrees function directly
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { getUserTrees } from "../src/lib/services/tree-service";

async function testGetTrees() {
  const userId = "user-demo-001";

  console.log("Testing getUserTrees for:", userId);
  console.log("=".repeat(50));

  try {
    const trees = await getUserTrees(userId);

    console.log(`\nFound ${trees.length} trees:\n`);

    trees.forEach((tree, index) => {
      console.log(`${index + 1}. ${tree.treeName}`);
      console.log(`   ID: ${tree.treeId}`);
      console.log(`   Description: ${tree.description}`);
      console.log(`   Persons: ${tree.personCount}`);
      console.log(`   Public: ${tree.isPublic}`);
      console.log(`   Created: ${tree.createdAt}`);
      console.log(`   Updated: ${tree.updatedAt}`);
      console.log();
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

testGetTrees();
