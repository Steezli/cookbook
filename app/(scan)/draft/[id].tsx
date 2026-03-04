import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { DraftReview } from "@/features/scans/DraftReview";
import { DraftEditor } from "@/features/scans/DraftEditor";

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <DraftEditor
        draftId={id!}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <DraftReview
      draftId={id!}
      onEdit={() => setIsEditing(true)}
    />
  );
}
