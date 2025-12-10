/**
 * PersonNode Component
 *
 * Custom ReactFlow node for displaying a person in the tree
 */

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Person, Gender } from "@/types/person";

interface PersonNodeProps {
  data: {
    person: Person;
  };
  selected?: boolean;
}

function PersonNode({ data, selected }: PersonNodeProps) {
  const { person } = data;

  // Generate initials
  const initials = `${person.firstName?.[0] || ""}${
    person.lastName?.[0] || ""
  }`.toUpperCase();

  // Calculate age or years
  const birthYear = person.birthDate
    ? new Date(person.birthDate).getFullYear()
    : null;
  const deathYear = person.deathDate
    ? new Date(person.deathDate).getFullYear()
    : null;
  const yearsText = birthYear
    ? `${birthYear}${deathYear ? `-${deathYear}` : "-Present"}`
    : "Unknown";

  // Get gender color
  const getGenderColor = () => {
    switch (person.gender) {
      case Gender.MALE:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case Gender.FEMALE:
        return "bg-pink-100 text-pink-700 border-pink-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div
      className={`
        w-[200px] bg-white rounded-lg shadow-md border-2 transition-all
        ${selected ? "border-blue-500 shadow-xl" : "border-gray-200"}
        hover:shadow-lg hover:border-blue-300
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-2 h-2"
      />

      <div className="p-3">
        {/* Avatar and Gender */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className={`
            w-12 h-12 rounded-full flex items-center justify-center
            font-semibold text-sm flex-shrink-0 border-2
            ${getGenderColor()}
          `}
          >
            {initials || "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {person.firstName} {person.lastName}
            </div>
            {person.nickname && (
              <div className="text-xs text-gray-600 truncate">
                &ldquo;{person.nickname}&rdquo;
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">{yearsText}</div>
          </div>
        </div>

        {/* Additional Info */}
        {person.birthPlace && (
          <div className="text-xs text-gray-600 truncate flex items-center gap-1 mt-2">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{person.birthPlace}</span>
          </div>
        )}

        {person.occupation && (
          <div className="text-xs text-gray-600 truncate flex items-center gap-1 mt-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{person.occupation}</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2 h-2"
      />
    </div>
  );
}

export default memo(PersonNode);
