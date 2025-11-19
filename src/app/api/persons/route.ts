/**
 * Persons API Route
 *
 * GET /api/persons?treeId=xxx - Get all persons in a tree
 * POST /api/persons - Create a new person
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPerson, getTreePersons } from "@/lib/services/person-service";
import { PersonCreateInput } from "@/types/person";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/persons?treeId=xxx
 * Get all persons in a specific tree
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const treeId = searchParams.get("treeId");

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId query parameter is required" },
        { status: 400 }
      );
    }

    const persons = await getTreePersons(treeId, user?.user?.id);

    return NextResponse.json({ persons });
  } catch (error) {
    console.error("Error in GET /api/persons:", error);
    return NextResponse.json(
      { error: "Failed to get persons" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/persons
 * Create a new person in a tree
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.treeId) {
      return NextResponse.json(
        { error: "treeId is required" },
        { status: 400 }
      );
    }

    const input: PersonCreateInput = body;

    const person = await createPerson(user.user.id, body.treeId, input);

    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/persons:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 }
    );
  }
}
