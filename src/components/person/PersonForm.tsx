/**
 * Person Form Component
 *
 * Form for creating and editing persons
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Gender } from "@/types/person";

export interface PersonFormData {
  firstName: string;
  lastName?: string;
  middleName?: string;
  maidenName?: string;
  nickname?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving?: boolean;
  occupation?: string;
  biography?: string;
  notes?: string;
  profilePhotoUrl?: string;
}

export interface PersonFormProps {
  initialData?: Partial<PersonFormData>;
  onSubmit: (data: PersonFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PersonForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: PersonFormProps) {
  const [formData, setFormData] = useState<PersonFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    middleName: initialData?.middleName || "",
    maidenName: initialData?.maidenName || "",
    nickname: initialData?.nickname || "",
    gender: initialData?.gender,
    birthDate: initialData?.birthDate || "",
    birthPlace: initialData?.birthPlace || "",
    deathDate: initialData?.deathDate || "",
    deathPlace: initialData?.deathPlace || "",
    isLiving: initialData?.isLiving ?? true,
    occupation: initialData?.occupation || "",
    biography: initialData?.biography || "",
    notes: initialData?.notes || "",
    profilePhotoUrl: initialData?.profilePhotoUrl || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateField = (
    field: keyof PersonFormData,
    value: string | boolean | Gender | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
          <Input
            label="Middle Name"
            value={formData.middleName}
            onChange={(e) => updateField("middleName", e.target.value)}
          />
          <Input
            label="Maiden Name"
            value={formData.maidenName}
            onChange={(e) => updateField("maidenName", e.target.value)}
            helperText="Birth surname if changed"
          />
          <Input
            label="Nickname"
            value={formData.nickname}
            onChange={(e) => updateField("nickname", e.target.value)}
          />
          <Select
            label="Gender"
            value={formData.gender || ""}
            onChange={(e) => updateField("gender", e.target.value as Gender)}
            options={[
              { value: "", label: "Select gender" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
              { value: "Unknown", label: "Unknown" },
            ]}
          />
        </div>
      </div>

      {/* Life Events */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Life Events
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isLiving"
              checked={formData.isLiving}
              onChange={(e) => updateField("isLiving", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isLiving" className="text-sm text-gray-700">
              This person is still living
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Birth Date"
              type="date"
              value={formData.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />
            <Input
              label="Birth Place"
              value={formData.birthPlace}
              onChange={(e) => updateField("birthPlace", e.target.value)}
              placeholder="City, State, Country"
            />
          </div>

          {!formData.isLiving && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Death Date"
                type="date"
                value={formData.deathDate}
                onChange={(e) => updateField("deathDate", e.target.value)}
              />
              <Input
                label="Death Place"
                value={formData.deathPlace}
                onChange={(e) => updateField("deathPlace", e.target.value)}
                placeholder="City, State, Country"
              />
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Additional Information
        </h3>
        <div className="space-y-4">
          <Input
            label="Occupation"
            value={formData.occupation}
            onChange={(e) => updateField("occupation", e.target.value)}
          />
          <div>
            <label
              htmlFor="biography"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Biography
            </label>
            <textarea
              id="biography"
              rows={4}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.biography}
              onChange={(e) => updateField("biography", e.target.value)}
              placeholder="Brief life story..."
            />
          </div>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Research Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Additional notes or sources..."
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? "Update Person" : "Create Person"}
        </Button>
      </div>
    </form>
  );
}
