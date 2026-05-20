"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { clearAuthSession, getStoredApiKey, storeAuthSession, subscribeToAuthChanges, API_KEY_STORAGE_KEY } from "@/lib/auth";
import { TEAM_MEMBERS } from "@/lib/users";
import { profileApi } from "@/lib/api";

export function AuthStatusPill() {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshKey = () => {
      setSelectedKey(getStoredApiKey() || "");
    };
    refreshKey();
    return subscribeToAuthChanges(refreshKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUserChange = async (apiKey: string) => {
    setSelectedKey(apiKey);
    setIsOpen(false);
    if (apiKey) {
      try {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        const profileData = await profileApi.me({});
        const user = {
          id: profileData.profile?.id || 0,
          username: profileData.profile?.username || "",
          display_name: profileData.profile?.display_name || profileData.profile?.username || ""
        };
        storeAuthSession({ api_key: apiKey, user });
      } catch (err) {
        console.error("Failed to switch user in topbar", err);
        clearAuthSession();
        router.push("/login");
      }
    } else {
      clearAuthSession();
      router.push("/login");
    }
  };

  const activeMember = TEAM_MEMBERS.find((member) => member.apiKey === selectedKey) || TEAM_MEMBERS[TEAM_MEMBERS.length - 1];

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: "1px solid #a9d55d",
          borderRadius: "var(--radius)",
          color: "var(--success)",
          background: "rgb(71 104 0 / 0.1)",
          fontSize: "12px",
          fontWeight: "600",
          padding: "6px 12px",
          cursor: "pointer",
          outline: "none",
          transition: "background 0.2s, border-color 0.2s"
        }}
        type="button"
      >
        <span>{activeMember.name === "Unauthenticated User" ? "Sign in" : activeMember.name}</span>
        <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--outline)",
            borderRadius: "var(--radius)",
            boxShadow: "0 6px 20px rgb(0 0 0 / 0.15)",
            padding: "6px",
            minWidth: "180px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}
        >
          <div style={{ padding: "4px 8px 6px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            Switch Profile
          </div>
          {TEAM_MEMBERS.map((member) => {
            if (member.apiKey === "") return null; // Handle signout separately at bottom
            const isActive = member.apiKey === selectedKey;
            return (
              <button
                key={member.name}
                onClick={() => handleUserChange(member.apiKey)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
                  border: 0,
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "rgb(71 104 0 / 0.1)" : "transparent",
                  color: isActive ? "var(--success)" : "var(--text)",
                  fontSize: "12px",
                  fontWeight: isActive ? "700" : "500",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s"
                }}
                className="dropdown-item"
                type="button"
              >
                <User size={12} style={{ color: isActive ? "var(--success)" : "var(--text-muted)" }} />
                <span>{member.name}</span>
              </button>
            );
          })}
          
          <div style={{ height: "1px", background: "var(--outline)", margin: "4px 0" }} />

          <button
            onClick={() => handleUserChange("")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px 10px",
              border: 0,
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--danger)",
              fontSize: "12px",
              fontWeight: "600",
              textAlign: "left",
              cursor: "pointer",
              transition: "background 0.15s"
            }}
            className="dropdown-item danger"
            type="button"
          >
            <LogOut size={12} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
