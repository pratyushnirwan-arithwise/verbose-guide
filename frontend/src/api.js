const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "string" ? data : data.message || data.error || "Request failed";
    throw new Error(message);
  }

  return data;
}

export function postJson(path, body) {
  return api(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
