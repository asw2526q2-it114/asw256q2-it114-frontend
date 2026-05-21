"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { profileApi } from "@/lib/api";
import { useToast } from "@/components/feedback-provider";
import { getStoredApiKey, storeAuthSession, clearAuthSession, API_KEY_STORAGE_KEY } from "@/lib/auth";
import { TEAM_MEMBERS } from "@/lib/users";
import { CustomSelect } from "@/components/custom-select";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedKey, setSelectedKey] = useState<string>(() => getStoredApiKey() || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUserChange = async (apiKey: string) => {
    setSelectedKey(apiKey);
    setError(null);

    if (apiKey) {
      setLoading(true);
      try {
        // Temporarily set the api key in storage so that profileApi.me can use it
        window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);

        // Fetch profile
        const profileData = await profileApi.me({});
        const user = {
          id: profileData.profile?.id || 0,
          username: profileData.profile?.username || "",
          display_name: profileData.profile?.display_name || profileData.profile?.username || ""
        };

        // Store session
        storeAuthSession({ api_key: apiKey, user });
        toast.success("Signed in successfully.", `Welcome back, ${user.display_name}`);
        router.replace("/issues");
      } catch (err) {
        clearAuthSession();
        setError("Failed to authenticate user against Django API. Make sure the API key is valid and the backend is running.");
        toast.error(err, "Login failed");
      } finally {
        setLoading(false);
      }
    } else {
      clearAuthSession();
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel single" aria-labelledby="login-title">
        <form className="login-form" onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginBottom: "8px", textAlign: "center" }}>
            <span className="brand-mark" style={{ width: "40px", height: "40px", fontSize: "16px" }}>IH</span>
            <div>
              <h1 id="login-title" style={{ fontSize: "24px", margin: "0 0 4px" }}>Sign in to IssueHub</h1>
              <p className="muted" style={{ margin: 0, fontSize: "13px" }}>Select your profile to continue</p>
            </div>
          </div>

          <div className="auth-divider" style={{ margin: "8px 0" }}></div>

          <label className="field">
            <span>Active Profile</span>
            <CustomSelect
              value={selectedKey}
              onChange={handleUserChange}
              options={TEAM_MEMBERS.map((member) => ({
                value: member.apiKey,
                label: member.name,
              }))}
              disabled={loading}
              placeholder="Select active profile..."
            />
          </label>

          {loading ? (
            <div className="toolbar" style={{ justifyContent: "center", padding: "10px" }}>
              <LoaderCircle className="spin" size={24} aria-hidden="true" />
              <span>Signing you in...</span>
            </div>
          ) : null}

          {error ? (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
