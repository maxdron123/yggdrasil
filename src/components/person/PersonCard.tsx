/**
 * Person Card Component
 *
 * Display card for a person with basic info
 */

"use client";

import { Person } from "@/types/person";
import { Card, CardContent } from "@/components/ui/Card";

export interface PersonCardProps {
  person: Person;
  onClick?: () => void;
  onEdit?: (person: Person) => void;
  onDelete?: (person: Person) => void;
  showActions?: boolean;
}

export function PersonCard({
  person,
  onClick,
  onEdit,
  onDelete,
  showActions,
}: PersonCardProps) {
  const fullName = [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");

  const lifeYears = () => {
    const birth = person.birthDate
      ? new Date(person.birthDate).getFullYear()
      : "?";
    if (person.isLiving) {
      return `${birth} - Present`;
    }
    const death = person.deathDate
      ? new Date(person.deathDate).getFullYear()
      : "?";
    return `${birth} - ${death}`;
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(person);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(person);
  };

  return (
    <Card
      hover={!!onClick}
      className={onClick ? "cursor-pointer" : ""}
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {person.firstName[0]}
            {person.lastName?.[0] || ""}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{fullName}</h3>
            {person.nickname && (
              <p className="text-sm text-gray-600">
                &ldquo;{person.nickname}&rdquo;
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">{lifeYears()}</p>
            {person.birthPlace && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                📍 {person.birthPlace}
              </p>
            )}
          </div>

          {/* Gender Icon */}
          <div className="flex-shrink-0">
            {person.gender === "Male" && (
              <svg
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            )}
            {person.gender === "Female" && (
              <svg
                className="w-5 h-5 text-pink-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
