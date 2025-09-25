"use client";

import { useParams } from 'next/navigation';
import ProcessStatusViewer from '@/components/ProcessStatusViewer';

export default function StatusPage() {
  const params = useParams();
  const statusId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-6">Process Status</h1>
      {statusId ? (
        <ProcessStatusViewer statusId={statusId} />
      ) : (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          No status ID provided
        </div>
      )}
    </div>
  );
} 