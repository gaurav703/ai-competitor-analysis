import { WorkspaceForm } from './workspace-form';

export default function NewWorkspacePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create a workspace</h1>
        <p className="text-sm text-muted">
          Tell us about your business. You can add competitors next.
        </p>
      </div>
      <WorkspaceForm />
    </div>
  );
}
