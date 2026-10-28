const tokenKey = "campus_auction_token";

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function setToken(token) {
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function dollars(cents) {
  const rupees = (Number(cents || 0) / 100) * 83;
  return `Rs. ${rupees.toFixed(2)}`;
}

export function toCents(n) {
  return Math.round(Number(n) * 100);
}
