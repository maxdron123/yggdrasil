/**
 * React Query Hooks for Relationship Data
 *
 * Client-side data fetching hooks using TanStack Query
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SimpleRelationship,
  RelationshipCreateInput,
  RelationshipType,
} from "@/types/relationship";

// API helper functions
async function fetchTreeRelationships(
  treeId: string
): Promise<SimpleRelationship[]> {
  const res = await fetch(`/api/relationships?treeId=${treeId}`);
  if (!res.ok) throw new Error("Failed to fetch relationships");
  const data = await res.json();
  return data.relationships;
}

async function fetchPersonRelationships(
  personId: string
): Promise<SimpleRelationship[]> {
  const res = await fetch(`/api/relationships?personId=${personId}`);
  if (!res.ok) throw new Error("Failed to fetch relationships");
  const data = await res.json();
  return data.relationships;
}

async function createRelationshipApi(
  input: RelationshipCreateInput
): Promise<SimpleRelationship> {
  const res = await fetch("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create relationship");
  }
  const data = await res.json();
  return data.relationship;
}

async function deleteRelationshipApi(params: {
  relationshipId: string;
  person1Id: string;
  person2Id: string;
  relationshipType: RelationshipType;
}): Promise<void> {
  const res = await fetch("/api/relationships", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete relationship");
  }
}

// React Query Hooks

/**
 * Fetch all relationships in a tree
 */
export function useTreeRelationships(treeId: string | null) {
  return useQuery({
    queryKey: ["relationships", "tree", treeId],
    queryFn: () => fetchTreeRelationships(treeId!),
    enabled: !!treeId,
  });
}

/**
 * Fetch all relationships for a person
 */
export function usePersonRelationships(personId: string | null) {
  return useQuery({
    queryKey: ["relationships", "person", personId],
    queryFn: () => fetchPersonRelationships(personId!),
    enabled: !!personId,
  });
}

/**
 * Create a new relationship
 */
export function useCreateRelationship(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRelationshipApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relationships", "tree", treeId],
      });
      queryClient.invalidateQueries({ queryKey: ["persons", treeId] });
    },
  });
}

/**
 * Delete a relationship
 */
export function useDeleteRelationship(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRelationshipApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relationships", "tree", treeId],
      });
      queryClient.invalidateQueries({ queryKey: ["persons", treeId] });
    },
  });
}
