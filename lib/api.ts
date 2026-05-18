import { getStoredApiKey, getStoredUser, type AuthSession } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
export const OAUTH_LOGIN_URL =
  process.env.NEXT_PUBLIC_OAUTH_LOGIN_URL?.replace(/\/$/, "") || `${API_ORIGIN}/accounts/github/login/`;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type SortDirection = "asc" | "desc";

export type CatalogItem = {
  id: number;
  key?: string;
  label?: string;
  name?: string;
  color?: string;
  is_closed?: boolean;
  days?: number | null;
  before_after?: "before" | "after" | "";
  created_at?: string;
  [key: string]: unknown;
};

export type UserSummary = {
  id?: number;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
};

export type Issue = {
  id: number;
  subject: string;
  description?: string;
  issue_type?: string;
  issue_type_label?: string;
  issue_type_color?: string;
  severity?: string;
  severity_label?: string;
  severity_color?: string;
  priority?: string;
  priority_label?: string;
  priority_color?: string;
  status?: string;
  status_label?: string;
  status_color?: string;
  assigned_to?: UserSummary | null;
  creator?: UserSummary;
  tags?: string[] | string;
  watchers?: UserSummary[];
  deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  attachments?: Attachment[];
  [key: string]: unknown;
};

export type IssueInput = {
  subject?: string;
  description?: string;
  issue_type?: string;
  status?: string;
  priority?: string;
  severity?: string;
  assigned_to?: number | null;
  deadline?: string | null;
  tags?: string | string[];
};

export type IssueDeadline = {
  deadline?: string | null;
};

export type IssueBulkCreateInput = {
  rows: string;
  issue_type: string;
  severity: string;
  priority: string;
  status: string;
  assigned_to?: number | null;
  tags?: string;
};

export type IssueComment = {
  id: number;
  creator?: UserSummary;
  issue?: { id?: number; subject?: string };
  body?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type Attachment = {
  id: number;
  creator?: UserSummary;
  original_name?: string;
  content_type?: string;
  size?: number;
  url?: string | null;
  extension?: string;
  uploaded_at?: string;
  [key: string]: unknown;
};

export type UserMeProfile = {
  id?: number;
  username?: string;
  display_name?: string;
  bio?: string;
  initials?: string;
  avatar_url?: string | null;
  api_key?: string;
};

export type UserMeStats = {
  open_assigned_count?: number;
  watched_count?: number;
  comments_count?: number;
};

export type UserMeIssueSummary = Pick<
  Issue,
  | "id"
  | "subject"
  | "issue_type"
  | "issue_type_label"
  | "issue_type_color"
  | "severity"
  | "severity_label"
  | "severity_color"
  | "priority"
  | "priority_label"
  | "priority_color"
  | "status"
  | "status_label"
  | "status_color"
  | "updated_at"
>;

export type UserProfile = {
  profile?: UserMeProfile;
  stats?: UserMeStats;
  assigned_issues?: UserMeIssueSummary[];
  watched_issues?: UserMeIssueSummary[];
  comments?: IssueComment[];
};

export type UserProfileInput = {
  bio?: string;
  avatar?: File | null;
  remove_avatar?: boolean;
};

export type LoginInput = {
  login: string;
  password: string;
};

export type LoginResponse = AuthSession;

export type SignupInput = {
  username: string;
  email: string;
  password1: string;
  password2: string;
};

export type SignupResponse = AuthSession;

type QueryValue = string | number | boolean | null | undefined;

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  new Headers(getAuthHeaders()).forEach((value, key) => headers.set(key, value));

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await readResponse(response);
    const message =
      typeof details === "object" && details && "detail" in details
        ? String((details as { detail: unknown }).detail)
        : `Request failed with ${response.status}`;
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  return (await readResponse(response)) as T;
}

export function queryString(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function getAuthHeaders(): HeadersInit {
  const apiKey = getStoredApiKey();
  return apiKey ? { "X-API-Key": apiKey } : {};
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export const authApi = {
  async login(input: LoginInput) {
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await readResponse(response);
      const message =
        typeof details === "object" && details && "detail" in details
          ? String((details as { detail: unknown }).detail)
          : response.status === 400 || response.status === 401
            ? "Login failed"
            : `Request failed with ${response.status}`;
      throw new ApiError(response.status, message, details);
    }

    return (await readResponse(response)) as LoginResponse;
  },
  async signup(input: SignupInput) {
    const response = await fetch(`${API_BASE_URL}/signup/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await readResponse(response);
      const message =
        typeof details === "object" && details && "detail" in details
          ? String((details as { detail: unknown }).detail)
          : response.status === 400 || response.status === 401
            ? "Account creation failed"
            : `Request failed with ${response.status}`;
      throw new ApiError(response.status, message, details);
    }

    return (await readResponse(response)) as SignupResponse;
  }
};

export const issueApi = {
  list(params: Record<string, QueryValue>) {
    return apiFetch<Issue[]>(`/issues/${queryString(params)}`);
  },
  get(id: string | number) {
    return apiFetch<Issue>(`/issues/${id}/`);
  },
  create(input: IssueInput) {
    return apiFetch<Issue>("/issues/", { method: "POST", body: JSON.stringify(input) });
  },
  bulkCreate(input: IssueBulkCreateInput) {
    return apiFetch<Issue[]>("/issues/bulk/", { method: "POST", body: JSON.stringify(input) });
  },
  update(id: string | number, input: IssueInput) {
    return apiFetch<Issue>(`/issues/${id}/`, { method: "PUT", body: JSON.stringify(input) });
  },
  remove(id: string | number) {
    return apiFetch<void>(`/issues/${id}/`, { method: "DELETE" });
  },
  getDeadline(id: string | number) {
    return apiFetch<IssueDeadline>(`/issues/${id}/deadline/`);
  },
  saveDeadline(id: string | number, input: Partial<IssueDeadline>) {
    return apiFetch<IssueDeadline>(`/issues/${id}/deadline/`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },
  deleteDeadline(id: string | number) {
    return apiFetch<void>(`/issues/${id}/deadline/`, { method: "DELETE" });
  },
  comments(id: string | number) {
    return apiFetch<IssueComment[]>(`/issues/${id}/comments/`);
  },
  addComment(id: string | number, comment: string) {
    return apiFetch<IssueComment>(`/issues/${id}/comments/`, {
      method: "POST",
      body: JSON.stringify({ body: comment })
    });
  },
  updateComment(issueId: string | number, commentId: string | number, comment: string) {
    return apiFetch<IssueComment>(`/issues/${issueId}/comments/${commentId}/`, {
      method: "PATCH",
      body: JSON.stringify({ body: comment })
    });
  },
  deleteComment(issueId: string | number, commentId: string | number) {
    return apiFetch<void>(`/issues/${issueId}/comments/${commentId}/`, { method: "DELETE" });
  },
  watchers(id: string | number) {
    return apiFetch<UserSummary[]>(`/issues/${id}/watchers/`);
  },
  addWatcher(id: string | number, userId: number) {
    return apiFetch<UserSummary>(`/issues/${id}/watchers/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId })
    });
  },
  deleteWatcher(issueId: string | number, userId: string | number) {
    return apiFetch<void>(`/issues/${issueId}/watchers/${userId}/`, { method: "DELETE" });
  },
  assignee(id: string | number) {
    return apiFetch<UserSummary | null>(`/issues/${id}/assignee/`);
  },
  assignableMembers(id: string | number) {
    return apiFetch<UserSummary[]>(`/issues/${id}/assignable-members/`);
  },
  setAssignee(id: string | number, userId: number | null) {
    return apiFetch<UserSummary | null>(`/issues/${id}/assignee/`, {
      method: "PUT",
      body: JSON.stringify({ user_id: userId })
    });
  },
  deleteAssignee(id: string | number) {
    return apiFetch<void>(`/issues/${id}/assignee/`, { method: "DELETE" });
  },
  attachments(id: string | number) {
    return apiFetch<Attachment[]>(`/issues/${id}/attachments/`);
  },
  uploadAttachments(id: string | number, files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("file", file));
    return apiFetch<Issue | Attachment[]>(`/issues/${id}/attachments/`, {
      method: "POST",
      body: formData
    });
  },
  deleteAttachment(issueId: string | number, attachmentId: string | number) {
    return apiFetch<void>(`/issues/${issueId}/attachments/${attachmentId}/`, { method: "DELETE" });
  }
};

export const profileApi = {
  me(params: Record<string, QueryValue>) {
    return apiFetch<UserProfile>(`/users/me/${queryString(params)}`);
  },
  get(username: string, params: Record<string, QueryValue>) {
    return apiFetch<UserProfile>(`/users/${username}/${queryString(params)}`);
  },
  update(input: UserProfileInput) {
    if (input.avatar || input.remove_avatar) {
      const formData = new FormData();
      if (input.bio !== undefined) formData.append("bio", input.bio);
      if (input.avatar) formData.append("avatar", input.avatar);
      if (input.remove_avatar) formData.append("remove_avatar", "true");
      return apiFetch<UserProfile>("/users/me/", { method: "PATCH", body: formData });
    }
    return apiFetch<UserProfile>("/users/me/", { method: "PATCH", body: JSON.stringify(input) });
  }
};

export const catalogResources = [
  { key: "statuses", label: "Statuses", singular: "Status", path: "/statuses/" },
  { key: "priorities", label: "Priorities", singular: "Priority", path: "/priorities/" },
  { key: "types", label: "Types", singular: "Type", path: "/types/" },
  { key: "severities", label: "Severities", singular: "Severity", path: "/severities/" },
  { key: "tags", label: "Tags", singular: "Tag", path: "/tags/" },
  { key: "due-dates", label: "Due dates", singular: "Due date", path: "/due-dates/" }
] as const;

export type CatalogResourceKey = (typeof catalogResources)[number]["key"];

export function getCatalogResource(key: string) {
  return catalogResources.find((resource) => resource.key === key) || catalogResources[0];
}

export const catalogApi = {
  list(path: string) {
    return apiFetch<CatalogItem[]>(path);
  },
  create(path: string, input: Partial<CatalogItem>) {
    return apiFetch<CatalogItem>(path, { method: "POST", body: JSON.stringify(input) });
  },
  update(path: string, id: number, input: Partial<CatalogItem>) {
    return apiFetch<CatalogItem>(`${path}${id}/`, { method: "PUT", body: JSON.stringify(input) });
  },
  remove(path: string, id: number, params: Record<string, QueryValue> = {}) {
    return apiFetch<void>(`${path}${id}/${queryString(params)}`, { method: "DELETE" });
  }
};

export function displayName(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.label || record.name || record.display_name || record.username || record.key || record.slug || record.id || "Not set");
  }
  return "Not set";
}

export function issueNumber(issue: Issue) {
  return issue.id;
}

export function isCurrentUser(user?: UserSummary | null) {
  const current = getStoredUser();
  if (!current || !user) return false;
  if (typeof user.id === "number" && user.id === current.id) return true;
  return Boolean(user.username && user.username === current.username);
}

export function issueTags(value?: string[] | string) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
