/**
 * Individual Person API Route
 *
 * GET /api/persons/[personId] - Get a specific person
 * PATCH /api/persons/[personId] - Update a person
 * DELETE /api/persons/[personId] - Delete a person
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getPerson,
  updatePerson,
  deletePerson,
} from "@/lib/services/person-service";
import { PersonUpdateInput } from "@/types/person";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ personId: string }>;
};

/**
 * GET /api/persons/[personId]
 * Get a specific person by ID
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { personId } = await params;
    const user = await getCurrentUser();

    const person = await getPerson(personId, user?.user?.id);

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error(
      `Error in GET /api/persons/${(await params).personId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to get person" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/persons/[personId]
 * Update a person
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { personId } = await params;
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input: PersonUpdateInput = body;

    const person = await updatePerson(personId, user.user.id, input);

    return NextResponse.json({ person });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(
      `Error in PATCH /api/persons/${(await params).personId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to update person" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/persons/[personId]
 * Delete a person
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { personId } = await params;
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deletePerson(personId, user.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(
      `Error in DELETE /api/persons/${(await params).personId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete person" },
      { status: 500 }
    );
  }
}
