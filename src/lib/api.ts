const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/+$/, "");

export function apiUrl(path: string) {
  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_API_URL is not configured");
  }

  const backendPath = path.replace(/^\/api(?=\/|$)/, "");
  return `${backendUrl}${backendPath.startsWith("/") ? backendPath : `/${backendPath}`}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
