const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export const API_BASE = configuredBaseUrl.replace(/\/$/, "");

const TOKEN_KEY = "career-identity-access-token";

type RequestOptions = RequestInit & { skipAuth?: boolean };

function apiError(response: Response) {
  return response.json()
    .then((body) => new Error(body.detail || `Request failed (${response.status})`))
    .catch(() => new Error(`Request failed (${response.status})`));
}

async function getDevelopmentToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const storedToken = window.localStorage.getItem(TOKEN_KEY);
  if (storedToken) return storedToken;

  // The mock account is intentionally available only for local development.
  if (process.env.NODE_ENV !== "development") return null;

  const response = await fetch(`${API_BASE}/auth/mock`, { method: "POST" });
  if (!response.ok) throw await apiError(response);

  const data = await response.json();
  window.localStorage.setItem(TOKEN_KEY, data.access_token);
  return data.access_token;
}

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const { skipAuth, headers, ...requestOptions } = options;
  const token = skipAuth ? null : await getDevelopmentToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...requestOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) throw await apiError(response);
  return response;
}
