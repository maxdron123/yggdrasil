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
}

export function PersonCard({ person, onClick }: PersonCardProps) {
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
      </CardContent>
    </Card>
  );
}
