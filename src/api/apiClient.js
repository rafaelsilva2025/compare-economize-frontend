const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * ✅ apiRequest compatível com 2 usos:
 *
 * 1) apiRequest("/api/auth/me", { method: "GET" })
 *
 * 2) apiRequest({ method: "GET", url: "/api/auth/me", data: {...}, params: {...} })
 */
export async function apiRequest(pathOrConfig, options = {}) {
  // --------- MODO 2: objeto config ----------
  if (typeof pathOrConfig === "object" && pathOrConfig !== null) {
    const { method = "GET", url, data, params, headers } = pathOrConfig;

    let finalUrl = `${API_BASE}${url}`;

    // params -> querystring
    if (params && typeof params === "object") {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        qs.append(k, String(v));
      });
      const q = qs.toString();
      if (q) finalUrl += (finalUrl.includes("?") ? "&" : "?") + q;
    }

    const token = localStorage.getItem("token");

    const res = await fetch(finalUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      credentials: "include",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${txt}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json();
    return res.text();
  }

  // --------- MODO 1: path + options (seu jeito atual) ----------
  const path = pathOrConfig;
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem("token");

  // ✅ NOVO: se body for objeto, transforma em JSON string
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  // ✅ IMPORTANTE: espalha options ANTES, e monta headers por ÚLTIMO
  // (evita options.headers sobrescrever Authorization sem querer)
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}
