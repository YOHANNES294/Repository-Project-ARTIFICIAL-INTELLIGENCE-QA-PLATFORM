'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bug, ArrowRight, FolderGit2 } from 'lucide-react';

export default function DefectsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/projects');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-100 dark:bg-red-900/40 p-4 rounded-2xl mb-4">
        <Bug className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Defects & Bugs are Managed Inside Projects
      </h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Bug tracking, severity triage, and execution linkages are project-scoped. Redirecting you to your Projects Hub...
      </p>
      <Link
        href="/projects"
        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
      >
        <FolderGit2 className="h-4 w-4 mr-2" />
        Select a Project Now
        <ArrowRight className="h-4 w-4 ml-2" />
      </Link>
    </div>
  );
}
