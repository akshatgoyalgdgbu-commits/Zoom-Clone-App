const API_BASE = ""; // Relative path proxied by Next.js rewrites to http://127.0.0.1:8000

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zoom_token");
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("zoom_token", token);
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("zoom_token");
    localStorage.removeItem("zoom_user");
  }
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("zoom_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("zoom_user", JSON.stringify(user));
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
    }),
};

export function getWebSocketUrl(
  meetingCode: string,
  clientId: string,
  displayName: string,
  isHost: boolean
): string {
  const cleanCode = meetingCode.replace(/\D/g, "");
  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // Use port 8000 on the same host (works for localhost, 127.0.0.1, or LAN IP)
  const host = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `${window.location.hostname}:8000`
    : `${window.location.hostname}:8000`;

  return `${wsProto}//${host}/ws/meeting/${cleanCode}?client_id=${encodeURIComponent(
    clientId
  )}&display_name=${encodeURIComponent(displayName)}&is_host=${isHost}`;
}
