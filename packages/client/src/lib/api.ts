const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("zenku_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, data: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(data) }),

  put: <T>(path: string, data: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(data) }),

  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
