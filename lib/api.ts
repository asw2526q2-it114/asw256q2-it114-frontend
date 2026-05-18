export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";

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
  name: string;
  slug?: string;
  color?: string;
  order?: number;
  is_closed?: boolean;
  days_to_due?: number | null;
  by_default?: boolean;
  [key: string]: unknown;
};

export type UserSummary = {
  id?: number;
  username?: string;
  full_name?: string;
  full_name_display?: string;
  photo?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
};

export type Issue = {
  id: number;
  ref?: number;
  number?: number;
  subject: string;
  description?: string;
  status?: string | number | CatalogItem;
  status_extra_info?: CatalogItem;
  priority?: string | number | CatalogItem;
  priority_extra_info?: CatalogItem;
  severity?: string | number | CatalogItem;
  severity_extra_info?: CatalogItem;
  issue_type?: string | number | CatalogItem;
  type?: string | number | CatalogItem;
  type_extra_info?: CatalogItem;
  assigned_to?: number | null;
  assigned_to_extra_info?: UserSummary | null;
  tags?: string[] | CatalogItem[] | string;
  modified_date?: string;
  created_date?: string;
  finished_date?: string | null;
  version?: number;
  [key: string]: unknown;
};

export type IssueInput = {
  subject: string;
  description?: string;
  issue_type?: string | number;
  status?: string | number;
  priority?: string | number;
  severity?: string | number;
  assigned_to?: number | null;
  tags?: string[] | string;
};

export type IssueDeadline = {
  id?: number;
  issue?: number;
  deadline?: string;
  due_date?: string;
  reason?: string;
  color?: string;
  [key: string]: unknown;
};

export type IssueComment = {
  id: number;
  issue?: number;
  issue_extra_info?: { id?: number; subject?: string; ref?: number };
  comment?: string;
  text?: string;
  content?: string;
  created_date?: string;
  modified_date?: string;
  user?: UserSummary;
  owner?: UserSummary;
  [key: string]: unknown;
};

export type Attachment = {
  id: number;
  name?: string;
  filename?: string;
  url?: string;
  file?: string;
  created_date?: string;
  [key: string]: unknown;
};

export type UserProfile = UserSummary & {
  bio?: string;
  email?: string;
  assigned?: Issue[];
  watched?: Issue[];
  comments?: IssueComment[];
  [key: string]: unknown;
};

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
  return {};
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

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
      body: JSON.stringify({ comment })
    });
  },
  updateComment(issueId: string | number, commentId: string | number, comment: string) {
    return apiFetch<IssueComment>(`/issues/${issueId}/comments/${commentId}/`, {
      method: "PATCH",
      body: JSON.stringify({ comment })
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
  deleteAttachment(issueId: string | number, attachmentId: string | number) {
    return apiFetch<void>(`/issues/${issueId}/attachments/${attachmentId}/`, { method: "DELETE" });
  }
};

export const commentApi = {
  list() {
    return apiFetch<IssueComment[]>("/comments/");
  }
};

export const profileApi = {
  me(params: Record<string, QueryValue>) {
    return apiFetch<UserProfile>(`/users/me/${queryString(params)}`);
  },
  get(username: string, params: Record<string, QueryValue>) {
    return apiFetch<UserProfile>(`/users/${username}/${queryString(params)}`);
  },
  update(input: Partial<UserProfile>) {
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
  remove(path: string, id: number) {
    return apiFetch<void>(`${path}${id}/`, { method: "DELETE" });
  }
};

export function displayName(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.name || record.full_name_display || record.username || record.slug || record.id || "Unassigned");
  }
  return "Unassigned";
}

export function issueNumber(issue: Issue) {
  return issue.ref || issue.number || issue.id;
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
