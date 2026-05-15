import { Suspense } from "react";
import LearningWorkspaceClient from "./LearningWorkspaceClient";

export const dynamic = "force-dynamic";

function LearningWorkspaceLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        Loading learning workspace...
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LearningWorkspaceLoading />}>
      <LearningWorkspaceClient />
    </Suspense>
  );
}