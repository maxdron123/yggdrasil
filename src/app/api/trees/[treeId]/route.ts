/**
 * Individual Tree API Route
 *
 * GET /api/trees/[treeId] - Get a specific tree
 * PATCH /api/trees/[treeId] - Update a tree
 * DELETE /api/trees/[treeId] - Delete a tree
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getTree, updateTree, deleteTree } from "@/lib/services/tree-service";
import { TreeUpdateInput } from "@/types/tree";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ treeId: string }>;
};

/**
 * GET /api/trees/[treeId]
 * Get a specific tree by ID
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { treeId } = await params;
    const user = await getCurrentUser();

    const tree = await getTree(treeId, user?.user?.id);

    if (!tree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    return NextResponse.json({ tree });
  } catch (error) {
    console.error(`Error in GET /api/trees/${(await params).treeId}:`, error);
    return NextResponse.json({ error: "Failed to get tree" }, { status: 500 });
  }
}

/**
 * PATCH /api/trees/[treeId]
 * Update a tree
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { treeId } = await params;
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input: TreeUpdateInput = {
      treeName: body.treeName || body.name,
      description: body.description,
      isPublic: body.isPublic,
      rootPersonId: body.rootPersonId,
    };

    const tree = await updateTree(treeId, user.user.id, input);

    return NextResponse.json({ tree });
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

    console.error(`Error in PATCH /api/trees/${(await params).treeId}:`, error);
    return NextResponse.json(
      { error: "Failed to update tree" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trees/[treeId]
 * Delete a tree
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { treeId } = await params;
    const user = await getCurrentUser();

    if (!user?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteTree(treeId, user.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error(
      `Error in DELETE /api/trees/${(await params).treeId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete tree" },
      { status: 500 }
    );
  }
}
