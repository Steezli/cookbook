import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PageContainer } from '@/components/nav/PageContainer';
import { DraftReview } from '@/features/scans/DraftReview';
import { DraftEditor } from '@/features/scans/DraftEditor';

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <PageContainer>
        <DraftEditor
          draftId={id!}
          onCancel={() => setIsEditing(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DraftReview
        draftId={id!}
        onEdit={() => setIsEditing(true)}
      />
    </PageContainer>
  );
}
