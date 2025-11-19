/**
 * Relationships API Route
 *
 * GET /api/relationships?treeId=xxx - Get all relationships in a tree
 * GET /api/relationships?personId=xxx - Get all relationships for a person
 * POST /api/relationships - Create a new relationship
 * DELETE /api/relationships - Delete a relationship
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createRelationship,
  getTreeRelationships,
  getPersonRelationships,
  deleteRelationship,
} from "@/lib/services/relationship-service";
import {
  RelationshipCreateInput,
  RelationshipType,
} from "@/types/relationship";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/relationships?treeId=xxx OR ?personId=xxx
 * Get relationships by tree or by person
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const treeId = searchParams.get("treeId");
    const personId = searchParams.get("personId");

    if (!treeId && !personId) {
      return NextResponse.json(
        { error: "Either treeId or personId query parameter is required" },
        { status: 400 }
      );
    }

    let relationships;
    if (personId) {
      relationships = await getPersonRelationships(personId);
    } else if (treeId) {
      relationships = await getTreeRelationships(treeId);
    }

    return NextResponse.json({ relationships });
  } catch (error) {
    console.error("Error in GET /api/relationships:", error);
    return NextResponse.json(
      { error: "Failed to get relationships" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/relationships
 * Create a new relationship between two persons
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input: RelationshipCreateInput = {
      person1Id: body.person1Id,
      person2Id: body.person2Id,
      relationshipType: body.relationshipType,
      treeId: body.treeId,
    };

    const relationship = await createRelationship(user.user.id, input);

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error in POST /api/relationships:", error);
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/relationships
 * Delete a relationship
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (
      !body.relationshipId ||
      !body.person1Id ||
      !body.person2Id ||
      !body.relationshipType
    ) {
      return NextResponse.json(
        {
          error:
            "relationshipId, person1Id, person2Id, and relationshipType are required",
        },
        { status: 400 }
      );
    }

    await deleteRelationship(
      body.relationshipId,
      body.person1Id,
      body.person2Id,
      body.relationshipType as RelationshipType,
      user.user.id
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error in DELETE /api/relationships:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
}
