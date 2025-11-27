/**
 * Relationship Form Component
 *
 * Form for creating relationships between persons
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Person } from "@/types/person";

export interface RelationshipFormData {
  person1Id: string;
  person2Id: string;
  relationshipType: "Parent" | "Child" | "Spouse" | "Sibling";
}

interface RelationshipFormProps {
  persons: Person[];
  selectedPersonId?: string;
  onSubmit: (data: RelationshipFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RelationshipForm({
  persons,
  selectedPersonId,
  onSubmit,
  onCancel,
  isLoading,
}: RelationshipFormProps) {
  const [formData, setFormData] = useState<RelationshipFormData>({
    person1Id: selectedPersonId || "",
    person2Id: "",
    relationshipType: "Parent",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateField = (field: keyof RelationshipFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get display name for person
  const getPersonName = (person: Person) => {
    return `${person.firstName} ${person.lastName || ""}`.trim();
  };

  // Filter out already selected persons
  const availablePersons = persons.filter(
    (p) => p.personId !== formData.person1Id
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Select
          label="First Person *"
          value={formData.person1Id}
          onChange={(e) => updateField("person1Id", e.target.value)}
          options={[
            { value: "", label: "Select person" },
            ...persons.map((p) => ({
              value: p.personId,
              label: getPersonName(p),
            })),
          ]}
          required
          disabled={!!selectedPersonId}
        />

        <Select
          label="Relationship Type *"
          value={formData.relationshipType}
          onChange={(e) =>
            updateField(
              "relationshipType",
              e.target.value as RelationshipFormData["relationshipType"]
            )
          }
          options={[
            { value: "Parent", label: "Parent" },
            { value: "Child", label: "Child" },
            { value: "Spouse", label: "Spouse" },
            { value: "Sibling", label: "Sibling" },
          ]}
          required
        />

        <Select
          label="Second Person *"
          value={formData.person2Id}
          onChange={(e) => updateField("person2Id", e.target.value)}
          options={[
            { value: "", label: "Select person" },
            ...availablePersons.map((p) => ({
              value: p.personId,
              label: getPersonName(p),
            })),
          ]}
          required
        />
      </div>

      {/* Relationship explanation */}
      {formData.person1Id && formData.person2Id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Relationship Summary:</p>
          <p>
            {persons.find((p) => p.personId === formData.person1Id)?.firstName}{" "}
            is the <strong>{formData.relationshipType}</strong> of{" "}
            {persons.find((p) => p.personId === formData.person2Id)?.firstName}
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Creating..." : "Create Relationship"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
