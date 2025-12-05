/**
 * TreeVisualization Component
 *
 * Interactive family tree visualization using ReactFlow
 * Displays persons as nodes and relationships as edges
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Position,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person } from "@/types/person";
import { SimpleRelationship } from "@/types/relationship";
import PersonNode from "./PersonNode";

interface TreeVisualizationProps {
  persons: Person[];
  relationships: SimpleRelationship[];
  onPersonClick?: (personId: string) => void;
  onConnectionCreate?: (
    person1Id: string,
    person2Id: string,
    relationshipType: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => void;
  onRelationshipDelete?: (
    relationshipId: string,
    person1Id: string,
    person2Id: string,
    relationshipType: string
  ) => void;
}

const nodeTypes = {
  person: PersonNode,
};

// Calculate hierarchical layout for family tree
function calculateTreeLayout(
  persons: Person[],
  relationships: SimpleRelationship[]
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Build relationship map
  const parentChildMap = new Map<string, string[]>(); // parent -> children
  const childParentMap = new Map<string, string[]>(); // child -> parents

  relationships.forEach((rel) => {
    if (rel.RelationshipType === "Parent") {
      // Person1Id is parent, Person2Id is child
      const children = parentChildMap.get(rel.Person1Id) || [];
      children.push(rel.Person2Id);
      parentChildMap.set(rel.Person1Id, children);

      const parents = childParentMap.get(rel.Person2Id) || [];
      parents.push(rel.Person1Id);
      childParentMap.set(rel.Person2Id, parents);
    }
  });

  // Find root persons (those without parents)
  const rootPersons = persons.filter((p) => !childParentMap.has(p.personId));

  // If no roots found, use all persons at root level
  const roots = rootPersons.length > 0 ? rootPersons : persons;

  // Track visited persons to avoid cycles
  const visited = new Set<string>();
  const levels = new Map<string, number>(); // personId -> level

  // BFS to assign levels
  const queue: { personId: string; level: number }[] = [];
  roots.forEach((person) => {
    queue.push({ personId: person.personId, level: 0 });
  });

  while (queue.length > 0) {
    const { personId, level } = queue.shift()!;

    if (visited.has(personId)) continue;
    visited.add(personId);
    levels.set(personId, level);

    // Add children to queue
    const children = parentChildMap.get(personId) || [];
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ personId: childId, level: level + 1 });
      }
    });
  }

  // Group persons by level
  const levelGroups = new Map<number, string[]>();
  persons.forEach((person) => {
    const level = levels.get(person.personId) ?? 0;
    const group = levelGroups.get(level) || [];
    group.push(person.personId);
    levelGroups.set(level, group);
  });

  // Calculate node positions
  const nodeWidth = 220;
  const nodeHeight = 120;
  const horizontalSpacing = 80;
  const verticalSpacing = 150;

  persons.forEach((person) => {
    const level = levels.get(person.personId) ?? 0;
    const groupMembers = levelGroups.get(level) || [];
    const indexInGroup = groupMembers.indexOf(person.personId);
    const groupWidth = groupMembers.length * (nodeWidth + horizontalSpacing);

    const x =
      indexInGroup * (nodeWidth + horizontalSpacing) - groupWidth / 2 + 400;
    const y = level * (nodeHeight + verticalSpacing) + 50;

    nodes.push({
      id: person.personId,
      type: "person",
      position: { x, y },
      data: { person },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  });

  // Create edges from relationships
  relationships.forEach((rel) => {
    const edgeId = `${rel.Person1Id}-${rel.Person2Id}`;

    // Base edge config
    const baseEdge: any = {
      id: edgeId,
      source: rel.Person1Id,
      target: rel.Person2Id,
      animated: false,
    };

    // Add handle positions if available (from drag connections)
    if ((rel as any).sourceHandle) {
      baseEdge.sourceHandle = (rel as any).sourceHandle;
    }
    if ((rel as any).targetHandle) {
      baseEdge.targetHandle = (rel as any).targetHandle;
    }

    if (rel.RelationshipType === "Parent") {
      edges.push({
        ...baseEdge,
        type: "smoothstep",
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });
    } else if (rel.RelationshipType === "Spouse") {
      edges.push({
        ...baseEdge,
        type: "straight",
        style: { stroke: "#ec4899", strokeWidth: 2, strokeDasharray: "5,5" },
      });
    } else if (rel.RelationshipType === "Sibling") {
      edges.push({
        ...baseEdge,
        type: "straight",
        style: { stroke: "#10b981", strokeWidth: 2, strokeDasharray: "3,3" },
      });
    }
  });

  return { nodes, edges };
}

export default function TreeVisualization({
  persons,
  relationships,
  onPersonClick,
  onConnectionCreate,
  onRelationshipDelete,
}: TreeVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateTreeLayout(persons, relationships),
    [persons, relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Connection mode state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRelationsMenu, setShowRelationsMenu] = useState(false);
  const [firstSelectedPerson, setFirstSelectedPerson] = useState<string | null>(
    null
  );
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    person1Id: string;
    person2Id: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    relationshipId: string;
    person1Id: string;
    person2Id: string;
    relationshipType: string;
  } | null>(null);

  // Update nodes when persons change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = calculateTreeLayout(
      persons,
      relationships
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [persons, relationships, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isConnecting) {
        // Connection mode
        if (!firstSelectedPerson) {
          // Select first person
          setFirstSelectedPerson(node.id);
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              selected: n.id === node.id,
            }))
          );
        } else if (firstSelectedPerson !== node.id) {
          // Select second person - show relationship modal
          setPendingConnection({
            person1Id: firstSelectedPerson,
            person2Id: node.id,
          });
          setShowRelationshipModal(true);
        }
      } else {
        // Normal mode
        if (onPersonClick) {
          onPersonClick(node.id);
        }
      }
    },
    [isConnecting, firstSelectedPerson, onPersonClick, setNodes]
  );

  const handleRelationshipSelect = (relationshipType: string) => {
    if (pendingConnection && onConnectionCreate) {
      onConnectionCreate(
        pendingConnection.person1Id,
        pendingConnection.person2Id,
        relationshipType,
        pendingConnection.sourceHandle,
        pendingConnection.targetHandle
      );
      setShowRelationshipModal(false);
      setPendingConnection(null);
      setFirstSelectedPerson(null);
      setIsConnecting(false);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    }
  };

  const handleCancelConnection = () => {
    setShowRelationshipModal(false);
    setPendingConnection(null);
    setFirstSelectedPerson(null);
    setIsConnecting(false);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  };

  const handleAddRelation = () => {
    setIsConnecting(true);
    setIsRemoving(false);
    setShowRelationsMenu(false);
    setFirstSelectedPerson(null);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  };

  const handleRemoveRelation = () => {
    setIsRemoving(true);
    setIsConnecting(false);
    setShowRelationsMenu(false);
    setFirstSelectedPerson(null);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  };

  const handleCancelMode = () => {
    setIsConnecting(false);
    setIsRemoving(false);
    setFirstSelectedPerson(null);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  };

  // Handle drag-and-drop connections
  const onConnect = useCallback((connection: any) => {
    // Show relationship selection modal with handle information
    setPendingConnection({
      person1Id: connection.source,
      person2Id: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });
    setShowRelationshipModal(true);
  }, []);

  // Handle edge click for deletion
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (isRemoving && onRelationshipDelete) {
        // Extract relationship data from edge
        const relationship = relationships.find(
          (r) =>
            (r.Person1Id === edge.source && r.Person2Id === edge.target) ||
            (r.Person1Id === edge.target && r.Person2Id === edge.source)
        );

        if (relationship) {
          setPendingDelete({
            relationshipId: relationship.RelationshipId,
            person1Id: relationship.Person1Id,
            person2Id: relationship.Person2Id,
            relationshipType: relationship.RelationshipType,
          });
          setShowDeleteConfirm(true);
        }
      }
    },
    [isRemoving, relationships, onRelationshipDelete]
  );

  const handleConfirmDelete = () => {
    if (pendingDelete && onRelationshipDelete) {
      onRelationshipDelete(
        pendingDelete.relationshipId,
        pendingDelete.person1Id,
        pendingDelete.person2Id,
        pendingDelete.relationshipType
      );
      setShowDeleteConfirm(false);
      setPendingDelete(null);
      setIsRemoving(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPendingDelete(null);
  };

  if (persons.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
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
          <p className="mt-2 text-sm text-gray-600">
            Add people to see your family tree
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px]">
      {/* Relations Menu */}
      <div className="absolute top-4 right-4 z-10">
        {isConnecting || isRemoving ? (
          <button
            onClick={handleCancelMode}
            className="px-4 py-2 rounded-lg font-medium shadow-lg transition-all bg-red-600 text-white hover:bg-red-700"
          >
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
            Cancel
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowRelationsMenu(!showRelationsMenu)}
              className="px-4 py-2 rounded-lg font-medium shadow-lg transition-all bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 flex items-center gap-2"
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
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Relations
              <svg
                className={`w-4 h-4 transition-transform ${
                  showRelationsMenu ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showRelationsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1">
                <button
                  onClick={handleAddRelation}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-gray-700"
                >
                  <svg
                    className="w-5 h-5 text-blue-600"
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
                  Add Relation
                </button>
                <button
                  onClick={handleRemoveRelation}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-gray-700"
                >
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
                  Remove Relation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status message when connecting or removing */}
      {isConnecting && (
        <div className="absolute top-20 right-4 z-10 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-lg max-w-xs">
          {firstSelectedPerson ? (
            <p className="text-sm">
              <strong>Step 2:</strong> Click another person to connect with{" "}
              <strong>
                {
                  persons.find((p) => p.personId === firstSelectedPerson)
                    ?.firstName
                }
              </strong>
            </p>
          ) : (
            <p className="text-sm">
              <strong>Step 1:</strong> Click a person to start the connection
            </p>
          )}
        </div>
      )}
      {isRemoving && (
        <div className="absolute top-20 right-4 z-10 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm">
            <strong>Click on a relationship line</strong> to delete it
          </p>
        </div>
      )}

      <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-white border border-gray-200"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-xs">
          <div className="font-semibold text-gray-900 mb-2">Relationships</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500" />
              <span className="text-gray-700">Parent-Child</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-pink-500"
                style={{ borderTop: "2px dashed" }}
              />
              <span className="text-gray-700">Spouse</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-green-500"
                style={{ borderTop: "2px dashed" }}
              />
              <span className="text-gray-700">Sibling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Type Selection Modal */}
      {showRelationshipModal && pendingConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Relationship Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              How is{" "}
              <strong>
                {
                  persons.find(
                    (p) => p.personId === pendingConnection.person1Id
                  )?.firstName
                }
              </strong>{" "}
              related to{" "}
              <strong>
                {
                  persons.find(
                    (p) => p.personId === pendingConnection.person2Id
                  )?.firstName
                }
              </strong>
              ?
            </p>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => handleRelationshipSelect("Parent")}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Parent</div>
                  <div className="text-xs text-gray-600">
                    {
                      persons.find(
                        (p) => p.personId === pendingConnection.person1Id
                      )?.firstName
                    }{" "}
                    is the parent of{" "}
                    {
                      persons.find(
                        (p) => p.personId === pendingConnection.person2Id
                      )?.firstName
                    }
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleRelationshipSelect("Child")}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-0.5 bg-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Child</div>
                  <div className="text-xs text-gray-600">
                    {
                      persons.find(
                        (p) => p.personId === pendingConnection.person1Id
                      )?.firstName
                    }{" "}
                    is the child of{" "}
                    {
                      persons.find(
                        (p) => p.personId === pendingConnection.person2Id
                      )?.firstName
                    }
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleRelationshipSelect("Spouse")}
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
                onClick={() => handleRelationshipSelect("Sibling")}
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
              onClick={handleCancelConnection}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && pendingDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Relationship?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the{" "}
              <strong>{pendingDelete.relationshipType}</strong> relationship
              between{" "}
              <strong>
                {
                  persons.find((p) => p.personId === pendingDelete.person1Id)
                    ?.firstName
                }
              </strong>{" "}
              and{" "}
              <strong>
                {
                  persons.find((p) => p.personId === pendingDelete.person2Id)
                    ?.firstName
                }
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
