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
import { Person } from "@/types/person";
import { PersonCard } from "@/components/person/PersonCard";
import {
  RelationshipForm,
  RelationshipFormData,
} from "@/components/relationship/RelationshipForm";
import TreeVisualization from "@/components/tree/TreeVisualization";
import { useTree } from "@/lib/hooks/useTrees";
import {
  usePersons,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
} from "@/lib/hooks/usePersons";
import {
  useTreeRelationships,
  useCreateRelationship,
  useDeleteRelationship,
} from "@/lib/hooks/useRelationships";
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
  const createRelationship = useCreateRelationship(treeId);
  const deleteRelationship = useDeleteRelationship(treeId);
  const deletePerson = useDeletePerson(treeId);

  // We'll manage update person mutation dynamically
  const [updatePersonId, setUpdatePersonId] = useState<string | null>(null);
  const updatePerson = useUpdatePerson(updatePersonId || "", treeId);

  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] =
    useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<
    string | undefined
  >();
  const [showVisualization, setShowVisualization] = useState(true);

  // List view connection mode
  const [isListConnecting, setIsListConnecting] = useState(false);
  const [listFirstPerson, setListFirstPerson] = useState<string | undefined>();
  const [showListRelationshipModal, setShowListRelationshipModal] =
    useState(false);
  const [listPendingConnection, setListPendingConnection] = useState<{
    person1Id: string;
    person2Id: string;
  } | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(
    null
  );
  const [isDeleteRelationshipModalOpen, setIsDeleteRelationshipModalOpen] =
    useState(false);
  const [isDeletingRelationship, setIsDeletingRelationship] = useState(false);

  const handleCreatePerson = async (data: PersonFormData) => {
    try {
      // Clean up form data - convert empty strings to undefined
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === "" ? undefined : value,
        ])
      ) as PersonFormData;

      await createPerson.mutateAsync({
        ...cleanedData,
        treeId,
      });
      setIsAddPersonModalOpen(false);
    } catch (error) {
      console.error("Failed to create person:", error);
    }
  };

  const handleCreateRelationship = async (data: RelationshipFormData) => {
    try {
      setRelationshipError(null);
      await createRelationship.mutateAsync({
        ...data,
        treeId,
      });
      setIsAddRelationshipModalOpen(false);
      setSelectedPersonId(undefined);
    } catch (error: any) {
      console.error("Failed to create relationship:", error);
      const errorMessage = error?.message || "Failed to create relationship";
      if (errorMessage.includes("already exists")) {
        setRelationshipError(
          "These two people already have a relationship. Each pair can only have one connection."
        );
      } else {
        setRelationshipError(errorMessage);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setRelationshipError(null), 5000);
    }
  };

  const handleAddRelationshipClick = (personId?: string) => {
    setSelectedPersonId(personId);
    setIsAddRelationshipModalOpen(true);
  };

  const handleConnectionCreate = async (
    person1Id: string,
    person2Id: string,
    relationshipType: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => {
    try {
      setRelationshipError(null);
      await createRelationship.mutateAsync({
        person1Id,
        person2Id,
        relationshipType: relationshipType as
          | "Parent"
          | "Child"
          | "Spouse"
          | "Sibling",
        treeId,
        sourceHandle,
        targetHandle,
      });
    } catch (error: any) {
      console.error("Failed to create relationship:", error);
      const errorMessage = error?.message || "Failed to create relationship";
      if (errorMessage.includes("already exists")) {
        setRelationshipError(
          "These two people already have a relationship. Each pair can only have one connection."
        );
      } else {
        setRelationshipError(errorMessage);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setRelationshipError(null), 5000);
    }
  };

  const handleRelationshipDelete = async (
    relationshipId: string,
    person1Id: string,
    person2Id: string,
    relationshipType: string
  ) => {
    setIsDeletingRelationship(true);
    try {
      await deleteRelationship.mutateAsync({
        relationshipId,
        person1Id,
        person2Id,
        relationshipType: relationshipType as
          | "Parent"
          | "Child"
          | "Spouse"
          | "Sibling",
      });
      // Success - relationship deleted
      console.log("Relationship deleted successfully");
      setIsDeleteRelationshipModalOpen(false);
    } catch (error) {
      console.error("Failed to delete relationship:", error);
      alert("Failed to delete relationship. Please try again.");
    } finally {
      setIsDeletingRelationship(false);
    }
  };

  const handleListRelationshipSelect = async (relationshipType: string) => {
    if (listPendingConnection) {
      await handleConnectionCreate(
        listPendingConnection.person1Id,
        listPendingConnection.person2Id,
        relationshipType
      );
      setShowListRelationshipModal(false);
      setListPendingConnection(null);
      setListFirstPerson(undefined);
      setIsListConnecting(false);
    }
  };

  const handleListPersonClick = (personId: string) => {
    if (!isListConnecting) return;

    if (!listFirstPerson) {
      // Select first person
      setListFirstPerson(personId);
    } else if (listFirstPerson !== personId) {
      // Select second person - show relationship modal
      setListPendingConnection({
        person1Id: listFirstPerson,
        person2Id: personId,
      });
      setShowListRelationshipModal(true);
    }
  };

  const toggleListConnectionMode = () => {
    setIsListConnecting(!isListConnecting);
    setListFirstPerson(undefined);
    setListPendingConnection(null);
    setShowListRelationshipModal(false);
  };

  const handleEditPerson = (person: Person) => {
    setPersonToEdit(person);
    setUpdatePersonId(person.personId);
    setIsEditPersonModalOpen(true);
  };

  const handleUpdatePerson = async (data: PersonFormData) => {
    if (!personToEdit || !updatePersonId) return;

    try {
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === "" ? undefined : value,
        ])
      ) as PersonFormData;

      await updatePerson.mutateAsync(cleanedData);
      setIsEditPersonModalOpen(false);
      setPersonToEdit(null);
      setUpdatePersonId(null);
    } catch (error) {
      console.error("Failed to update person:", error);
    }
  };

  const handleDeletePerson = (person: Person) => {
    setPersonToDelete(person);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeletePerson = async () => {
    if (!personToDelete) return;

    try {
      await deletePerson.mutateAsync(personToDelete.personId);
      setIsDeleteConfirmOpen(false);
      setPersonToDelete(null);
    } catch (error) {
      console.error("Failed to delete person:", error);
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
            <Button
              onClick={() => handleAddRelationshipClick()}
              variant="secondary"
            >
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
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Add Relationship
            </Button>
            <Button
              onClick={() => setIsDeleteRelationshipModalOpen(true)}
              variant="secondary"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Relationship
            </Button>
          </div>
        </div>

        {/* Error Toast */}
        {relationshipError && (
          <div className="fixed top-4 right-4 z-50 max-w-md bg-red-50 border-2 border-red-200 rounded-lg shadow-lg p-4 animate-slide-in">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Cannot Create Relationship
                </h3>
                <p className="text-sm text-red-800">{relationshipError}</p>
              </div>
              <button
                onClick={() => setRelationshipError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

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
              onConnectionCreate={handleConnectionCreate}
              onRelationshipDelete={handleRelationshipDelete}
            />
          </div>
        )}

        {/* Persons List */}
        {!showVisualization && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Family Members
              </h2>
              {persons && persons.length > 0 && (
                <button
                  onClick={toggleListConnectionMode}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${
                      isListConnecting
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    }
                  `}
                >
                  {isListConnecting ? (
                    <>
                      <svg
                        className="w-5 h-5 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Cancel Connecting
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Connect People
                    </>
                  )}
                </button>
              )}
            </div>

            {isListConnecting && (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <p className="text-sm">
                  {listFirstPerson ? (
                    <>
                      <strong>Step 2:</strong> Click another person to connect
                      with{" "}
                      <strong>
                        {
                          persons?.find((p) => p.personId === listFirstPerson)
                            ?.firstName
                        }
                      </strong>
                    </>
                  ) : (
                    <>
                      <strong>Step 1:</strong> Click a person to start the
                      connection
                    </>
                  )}
                </p>
              </div>
            )}

            {personsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-gray-300 border-t-blue-600" />
              </div>
            ) : persons && persons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {persons.map((person) => (
                  <div
                    key={person.personId}
                    className={`
                      ${
                        listFirstPerson === person.personId
                          ? "ring-4 ring-blue-500 rounded-lg"
                          : ""
                      }
                      ${
                        isListConnecting && listFirstPerson !== person.personId
                          ? "cursor-pointer hover:ring-2 hover:ring-blue-300 rounded-lg"
                          : ""
                      }
                    `}
                    onClick={() => handleListPersonClick(person.personId)}
                  >
                    <PersonCard
                      person={person}
                      showActions={!isListConnecting}
                      onEdit={handleEditPerson}
                      onDelete={handleDeletePerson}
                    />
                  </div>
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

      {/* Add Relationship Modal */}
      <Modal
        isOpen={isAddRelationshipModalOpen}
        onClose={() => {
          setIsAddRelationshipModalOpen(false);
          setSelectedPersonId(undefined);
        }}
        title="Add Relationship"
        size="md"
      >
        <RelationshipForm
          persons={persons || []}
          selectedPersonId={selectedPersonId}
          onSubmit={handleCreateRelationship}
          onCancel={() => {
            setIsAddRelationshipModalOpen(false);
            setSelectedPersonId(undefined);
          }}
          isLoading={createRelationship.isPending}
        />
      </Modal>

      {/* List View Relationship Selection Modal */}
      {showListRelationshipModal && listPendingConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Relationship Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              How is{" "}
              <strong>
                {
                  persons?.find(
                    (p) => p.personId === listPendingConnection.person1Id
                  )?.firstName
                }
              </strong>{" "}
              related to{" "}
              <strong>
                {
                  persons?.find(
                    (p) => p.personId === listPendingConnection.person2Id
                  )?.firstName
                }
              </strong>
              ?
            </p>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => handleListRelationshipSelect("Parent")}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Parent</div>
                  <div className="text-xs text-gray-600">
                    {
                      persons?.find(
                        (p) => p.personId === listPendingConnection.person1Id
                      )?.firstName
                    }{" "}
                    is the parent of{" "}
                    {
                      persons?.find(
                        (p) => p.personId === listPendingConnection.person2Id
                      )?.firstName
                    }
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleListRelationshipSelect("Child")}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Child</div>
                  <div className="text-xs text-gray-600">
                    {
                      persons?.find(
                        (p) => p.personId === listPendingConnection.person1Id
                      )?.firstName
                    }{" "}
                    is the child of{" "}
                    {
                      persons?.find(
                        (p) => p.personId === listPendingConnection.person2Id
                      )?.firstName
                    }
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleListRelationshipSelect("Spouse")}
                className="w-full flex items-center gap-3 p-3 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-pink-500 border-t-2 border-dashed flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Spouse</div>
                  <div className="text-xs text-gray-600">
                    Married or partners
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleListRelationshipSelect("Sibling")}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-green-500 border-t-2 border-dashed flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Sibling</div>
                  <div className="text-xs text-gray-600">
                    Brothers or sisters
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={() => {
                setShowListRelationshipModal(false);
                setListPendingConnection(null);
                setListFirstPerson(undefined);
                setIsListConnecting(false);
              }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      <Modal
        isOpen={isEditPersonModalOpen}
        onClose={() => {
          setIsEditPersonModalOpen(false);
          setPersonToEdit(null);
        }}
        title="Edit Family Member"
        size="lg"
      >
        {personToEdit && (
          <PersonForm
            initialData={personToEdit}
            onSubmit={handleUpdatePerson}
            onCancel={() => {
              setIsEditPersonModalOpen(false);
              setPersonToEdit(null);
            }}
            isLoading={false}
          />
        )}
      </Modal>

      {/* Delete Relationship Modal */}
      <Modal
        isOpen={isDeleteRelationshipModalOpen}
        onClose={() => setIsDeleteRelationshipModalOpen(false)}
        title="Delete Relationship"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a relationship to delete:
          </p>
          {relationships && relationships.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {relationships.map((rel) => {
                const person1 = persons?.find(
                  (p) => p.personId === rel.Person1Id
                );
                const person2 = persons?.find(
                  (p) => p.personId === rel.Person2Id
                );
                return (
                  <button
                    key={rel.RelationshipId}
                    onClick={() => {
                      handleRelationshipDelete(
                        rel.RelationshipId,
                        rel.Person1Id,
                        rel.Person2Id,
                        rel.RelationshipType
                      );
                    }}
                    disabled={isDeletingRelationship}
                    className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {person1?.firstName} {person1?.lastName} →{" "}
                          {person2?.firstName} {person2?.lastName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {rel.RelationshipType}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No relationships to delete
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && personToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Person
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete{" "}
              <strong>
                {personToDelete.firstName} {personToDelete.lastName}
              </strong>
              ? All relationships involving this person will be removed, but
              other family members will remain intact.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setPersonToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePerson}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete Person
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
