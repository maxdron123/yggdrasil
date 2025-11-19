/**
 * React Query Hooks for Person Data
 *
 * Client-side data fetching hooks using TanStack Query
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Person, PersonCreateInput, PersonUpdateInput } from "@/types/person";

// API helper functions
async function fetchPersons(treeId: string): Promise<Person[]> {
  const res = await fetch(`/api/persons?treeId=${treeId}`);
  if (!res.ok) throw new Error("Failed to fetch persons");
  const data = await res.json();
  return data.persons;
}

async function fetchPerson(personId: string): Promise<Person> {
  const res = await fetch(`/api/persons/${personId}`);
  if (!res.ok) throw new Error("Failed to fetch person");
  const data = await res.json();
  return data.person;
}

async function createPersonApi(
  input: PersonCreateInput & { treeId: string }
): Promise<Person> {
  const res = await fetch("/api/persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create person");
  }
  const data = await res.json();
  return data.person;
}

async function updatePersonApi(
  personId: string,
  input: PersonUpdateInput
): Promise<Person> {
  const res = await fetch(`/api/persons/${personId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update person");
  }
  const data = await res.json();
  return data.person;
}

async function deletePersonApi(personId: string): Promise<void> {
  const res = await fetch(`/api/persons/${personId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete person");
  }
}

// React Query Hooks

/**
 * Fetch all persons in a tree
 */
export function usePersons(treeId: string | null) {
  return useQuery({
    queryKey: ["persons", treeId],
    queryFn: () => fetchPersons(treeId!),
    enabled: !!treeId,
  });
}

/**
 * Fetch a single person by ID
 */
export function usePerson(personId: string | null) {
  return useQuery({
    queryKey: ["persons", "detail", personId],
    queryFn: () => fetchPerson(personId!),
    enabled: !!personId,
  });
}

/**
 * Create a new person
 */
export function useCreatePerson(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPersonApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons", treeId] });
      queryClient.invalidateQueries({ queryKey: ["trees", treeId] });
    },
  });
}

/**
 * Update a person
 */
export function useUpdatePerson(personId: string, treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PersonUpdateInput) => updatePersonApi(personId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons", treeId] });
      queryClient.invalidateQueries({
        queryKey: ["persons", "detail", personId],
      });
    },
  });
}

/**
 * Delete a person
 */
export function useDeletePerson(treeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePersonApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons", treeId] });
      queryClient.invalidateQueries({ queryKey: ["trees", treeId] });
    },
  });
}
