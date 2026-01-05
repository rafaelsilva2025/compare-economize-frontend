const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  // ✅ fallback inteligente em produção (mesmo domínio do site -> usa api.<domínio>)
  (typeof window !== "undefined"
    ? `${window.location.protocol}//api.${window.location.hostname.replace(/^www\./, "")}`
    : "http://localhost:8000");

// ✅ NOVO: limpa espaços/quebra de linha e normaliza a base
let API_BASE = String(RAW_API_BASE).trim().replace(/\/+$/, "");

// ✅ NOVO: evita loop de redirect em produção por http -> https
// (se o site está em https e a API_BASE veio http, força https, exceto localhost)
if (typeof window !== "undefined") {
  const isLocal =
    API_BASE.includes("localhost") ||
    API_BASE.includes("127.0.0.1") ||
    API_BASE.includes("0.0.0.0");

  if (!isLocal && window.location.protocol === "https:" && API_BASE.startsWith("http://")) {
    API_BASE = API_BASE.replace(/^http:\/\//i, "https://");
  }
}

/**
 * ✅ apiRequest compatível com 2 usos:
 *
 * 1) apiRequest("/api/auth/me", { method: "GET" })
 *
 * 2) apiRequest({ method: "GET", url: "/api/auth/me", data: {...}, params: {...} })
 */
export async function apiRequest(pathOrConfig, options = {}) {
  // ✅ NOVO: helper pra montar URL sem // duplicado
  const joinUrl = (base, path) => {
    const b = String(base || "").trim().replace(/\/+$/, "");
    const p = String(path || "").trim();
    if (!p) return b;
    return p.startsWith("/") ? `${b}${p}` : `${b}/${p}`;
  };

  // --------- MODO 2: objeto config ----------
  if (typeof pathOrConfig === "object" && pathOrConfig !== null) {
    const { method = "GET", url, data, params, headers } = pathOrConfig;

    let finalUrl = joinUrl(API_BASE, url);

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
      // ✅ mantém como você já tinha (não removi)
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

  // ✅ NOVO: monta URL sem // duplicado e sem espaço
  const url = joinUrl(API_BASE, path);

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
