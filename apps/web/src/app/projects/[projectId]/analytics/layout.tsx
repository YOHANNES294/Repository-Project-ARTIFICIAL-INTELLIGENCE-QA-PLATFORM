'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AnalyticsNav } from './analytics-nav';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AnalyticsNav projectId={projectId} />
      <div>{children}</div>
    </div>
  );
}
