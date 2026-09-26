export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });
  const data = await readResponse(response);

  if (!data.csrfToken) {
    throw new Error("The CSRF endpoint did not return a token.");
  }

  return data.csrfToken;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  return readResponse(response);
}
