/**
 * Tree Detail Page
 *
 * View and manage a specific family tree with persons and relationships
 */

"use client";

import { useState } from "react";
import { use } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PersonForm, PersonFormData } from "@/components/person/PersonForm";
import { PersonCard } from "@/components/person/PersonCard";
import TreeVisualization from "@/components/tree/TreeVisualization";
import { useTree } from "@/lib/hooks/useTrees";
import { usePersons, useCreatePerson } from "@/lib/hooks/usePersons";
import { useTreeRelationships } from "@/lib/hooks/useRelationships";
import Link from "next/link";

export default function TreeDetailPage({
  params,
}: {
  params: Promise<{ treeId: string }>;
}) {
  const { treeId } = use(params);
  const { data: tree, isLoading: treeLoading } = useTree(treeId);
  const { data: persons, isLoading: personsLoading } = usePersons(treeId);
  const { data: relationships } = useTreeRelationships(treeId);
  const createPerson = useCreatePerson(treeId);

  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);

  const handleCreatePerson = async (data: PersonFormData) => {
    try {
      await createPerson.mutateAsync({
        ...data,
        treeId,
      });
      setIsAddPersonModalOpen(false);
    } catch (error) {
      console.error("Failed to create person:", error);
    }
  };

  if (treeLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!tree) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Tree not found</p>
            <Link href="/trees">
              <Button className="mt-4">Back to Trees</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/trees" className="hover:text-blue-600">
                Trees
              </Link>
              <span>/</span>
              <span>{tree.treeName}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {tree.treeName}
            </h1>
            {tree.description && (
              <p className="mt-1 text-gray-600">{tree.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>{tree.personCount || 0} persons</span>
              {tree.isPublic && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Public
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Button>
            <Button onClick={() => setIsAddPersonModalOpen(true)}>
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Add Person
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setShowVisualization(true)}
            className={`
              px-4 py-2 font-medium text-sm border-b-2 transition-colors
              ${
                showVisualization
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }
            `}
          >
            Tree View
          </button>
          <button
            onClick={() => setShowVisualization(false)}
            className={`
              px-4 py-2 font-medium text-sm border-b-2 transition-colors
              ${
                !showVisualization
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }
            `}
          >
            List View
          </button>
        </div>

        {/* Tree Visualization */}
        {showVisualization && (
          <div>
            <TreeVisualization
              persons={persons || []}
              relationships={relationships || []}
            />
          </div>
        )}

        {/* Persons List */}
        {!showVisualization && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Family Members
            </h2>

            {personsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-gray-300 border-t-blue-600" />
              </div>
            ) : persons && persons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {persons.map((person) => (
                  <PersonCard key={person.personId} person={person} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No family members yet
                  </h3>
                  <p className="mt-1 text-gray-600">
                    Start building your family tree by adding people.
                  </p>
                  <Button
                    onClick={() => setIsAddPersonModalOpen(true)}
                    className="mt-4"
                  >
                    Add First Person
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      <Modal
        isOpen={isAddPersonModalOpen}
        onClose={() => setIsAddPersonModalOpen(false)}
        title="Add Family Member"
        size="lg"
      >
        <PersonForm
          onSubmit={handleCreatePerson}
          onCancel={() => setIsAddPersonModalOpen(false)}
          isLoading={createPerson.isPending}
        />
      </Modal>
    </DashboardLayout>
  );
}
