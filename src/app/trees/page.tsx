/**
 * Trees Dashboard Page
 *
 * Lists all user's family trees with create/edit capabilities
 */

"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useTrees, useCreateTree, useDeleteTree } from "@/lib/hooks/useTrees";
import { Tree } from "@/types/tree";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TreesPage() {
  const router = useRouter();
  const { data: trees, isLoading } = useTrees();
  const createTree = useCreateTree();
  const deleteTree = useDeleteTree();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [treeToDelete, setTreeToDelete] = useState<Tree | null>(null);
  const [formData, setFormData] = useState({
    treeName: "",
    description: "",
    isPublic: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTree.mutateAsync({
        treeName: formData.treeName,
        description: formData.description,
        isPublic: formData.isPublic,
        sharedWith: [],
      });
      setIsModalOpen(false);
      setFormData({ treeName: "", description: "", isPublic: false });
    } catch (error) {
      console.error("Failed to create tree:", error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, tree: Tree) => {
    e.preventDefault();
    e.stopPropagation();
    setTreeToDelete(tree);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteTree = async () => {
    if (!treeToDelete) return;

    try {
      await deleteTree.mutateAsync(treeToDelete.treeId);
      setIsDeleteConfirmOpen(false);
      setTreeToDelete(null);
    } catch (error) {
      console.error("Failed to delete tree:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Family Trees
            </h1>
            <p className="mt-1 text-gray-600">
              Create and manage your family trees
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Tree
          </Button>
        </div>

        {/* Trees Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
            <p className="mt-2 text-gray-600">Loading trees...</p>
          </div>
        ) : trees && trees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <div key={tree.treeId} className="relative">
                <Link href={`/trees/${tree.treeId}`}>
                  <Card hover className="h-full cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tree.treeName}
                        </h3>
                        <button
                          onClick={(e) => handleDeleteClick(e, tree)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete tree"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tree.description && (
                        <p className="text-sm text-gray-600 mb-4">
                          {tree.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
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
                      <p className="mt-2 text-xs text-gray-400">
                        Updated {new Date(tree.updatedAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
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
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No trees yet
              </h3>
              <p className="mt-1 text-gray-600">
                Get started by creating your first family tree.
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="mt-4">
                Create Your First Tree
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Tree Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tree"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Tree Name"
              placeholder="The Smith Family"
              value={formData.treeName}
              onChange={(e) =>
                setFormData({ ...formData, treeName: e.target.value })
              }
              required
            />
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A brief description of this family tree..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData({ ...formData, isPublic: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make this tree public (anyone can view)
              </label>
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createTree.isPending}>
              Create Tree
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && treeToDelete && (
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
                  Delete Tree
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete{" "}
              <strong>{treeToDelete.treeName}</strong>? This will permanently
              delete all persons, relationships, and data in this tree.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setTreeToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTree}
                disabled={deleteTree.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {deleteTree.isPending ? "Deleting..." : "Delete Tree"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
