import { AuthPending } from "@/components/auth-pending";
import { PageTitle } from "@/components/page-title";

export default function Page() {
  return (
    <main className="page">
      <PageTitle
        eyebrow="Authentication"
        title="GitHub OAuth pending"
        description="The frontend is ready to receive authenticated headers once the backend exposes the OAuth flow."
      />
      <AuthPending />
      <section className="panel grid" style={{ marginTop: 16 }}>
        <h2>Expected integration</h2>
        <p className="muted">
          Add the backend OAuth entrypoint, store the session through the future auth provider, and inject its
          headers from `getAuthHeaders()` in the API client.
        </p>
      </section>
    </main>
  );
}
