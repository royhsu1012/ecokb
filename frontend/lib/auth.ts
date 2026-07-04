export function saveSession(token: string, userId: string, email: string, isAdmin = false) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user_id", userId);
  localStorage.setItem("user_email", email);
  localStorage.setItem("is_admin", isAdmin ? "1" : "0");
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  localStorage.removeItem("is_admin");
  localStorage.removeItem("kb_id");
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");
  const email = localStorage.getItem("user_email");
  if (!token || !userId) return null;
  return { token, userId, email: email || "", isAdmin: localStorage.getItem("is_admin") === "1" };
}

export function isDemo(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("access_token") === "demo-token";
}
