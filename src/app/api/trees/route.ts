/**
 * Trees API Route
 *
 * GET /api/trees - Get all trees for the current user
 * POST /api/trees - Create a new tree
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createTree, getUserTrees } from "@/lib/services/tree-service";
import { TreeCreateInput } from "@/types/tree";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/trees
 * Get all trees for the authenticated user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trees = await getUserTrees(user.user!.id);

    return NextResponse.json({ trees });
  } catch (error) {
    console.error("Error in GET /api/trees:", error);
    return NextResponse.json({ error: "Failed to get trees" }, { status: 500 });
  }
}

/**
 * POST /api/trees
 * Create a new tree
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input: TreeCreateInput = {
      treeName: body.treeName || body.name,
      description: body.description,
      isPublic: body.isPublic ?? false,
      sharedWith: body.sharedWith ?? [],
    };

    const tree = await createTree(user.user!.id, input);

    return NextResponse.json({ tree }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/trees:", error);
    return NextResponse.json(
      { error: "Failed to create tree" },
      { status: 500 }
    );
  }
}
