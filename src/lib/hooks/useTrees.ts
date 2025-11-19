/**
 * React Query Hooks for Tree Data
 *
 * Client-side data fetching hooks using TanStack Query
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tree, TreeCreateInput, TreeUpdateInput } from "@/types/tree";

// API helper functions
async function fetchTrees(): Promise<Tree[]> {
  const res = await fetch("/api/trees");
  if (!res.ok) throw new Error("Failed to fetch trees");
  const data = await res.json();
  return data.trees;
}

async function fetchTree(treeId: string): Promise<Tree> {
  const res = await fetch(`/api/trees/${treeId}`);
  if (!res.ok) throw new Error("Failed to fetch tree");
  const data = await res.json();
  return data.tree;
}

async function createTreeApi(input: TreeCreateInput): Promise<Tree> {
  const res = await fetch("/api/trees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create tree");
  }
  const data = await res.json();
  return data.tree;
}

async function updateTreeApi(
  treeId: string,
  input: TreeUpdateInput
): Promise<Tree> {
  const res = await fetch(`/api/trees/${treeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update tree");
  }
  const data = await res.json();
  return data.tree;
}

async function deleteTreeApi(treeId: string): Promise<void> {
  const res = await fetch(`/api/trees/${treeId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete tree");
  }
}

// React Query Hooks

/**
 * Fetch all trees for the current user
 */
export function useTrees() {
  return useQuery({
    queryKey: ["trees"],
    queryFn: fetchTrees,
  });
}

/**
 * Fetch a single tree by ID
 */
export function useTree(treeId: string | null) {
  return useQuery({
    queryKey: ["trees", treeId],
    queryFn: () => fetchTree(treeId!),
    enabled: !!treeId,
  });
}

/**
 * Create a new tree
 */
export function useCreateTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTreeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trees"] });
    },
  });
}

/**
 * Update a tree
 */
export function useUpdateTree(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TreeUpdateInput) => updateTreeApi(treeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trees"] });
      queryClient.invalidateQueries({ queryKey: ["trees", treeId] });
    },
  });
}

/**
 * Delete a tree
 */
export function useDeleteTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTreeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trees"] });
    },
  });
}
