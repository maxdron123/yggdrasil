/**
 * TreeVisualization Component
 *
 * Interactive family tree visualization using ReactFlow
 * Displays persons as nodes and relationships as edges
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person } from "@/types/person";
import { SimpleRelationship } from "@/types/relationship";
import PersonNode from "./PersonNode";

interface TreeVisualizationProps {
  persons: Person[];
  relationships: SimpleRelationship[];
  onPersonClick?: (personId: string) => void;
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

    if (rel.RelationshipType === "Parent") {
      edges.push({
        id: edgeId,
        source: rel.Person1Id,
        target: rel.Person2Id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#3b82f6", strokeWidth: 2 },
      });
    } else if (rel.RelationshipType === "Spouse") {
      edges.push({
        id: edgeId,
        source: rel.Person1Id,
        target: rel.Person2Id,
        type: "straight",
        animated: false,
        style: { stroke: "#ec4899", strokeWidth: 2, strokeDasharray: "5,5" },
      });
    } else if (rel.RelationshipType === "Sibling") {
      edges.push({
        id: edgeId,
        source: rel.Person1Id,
        target: rel.Person2Id,
        type: "straight",
        animated: false,
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
}: TreeVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateTreeLayout(persons, relationships),
    [persons, relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
      if (onPersonClick) {
        onPersonClick(node.id);
      }
    },
    [onPersonClick]
  );

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
    <div className="w-full h-[600px] bg-gray-50 rounded-lg border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
  );
}
