export function saveSession(token: string, userId: string, email: string) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("user_id", userId);
  localStorage.setItem("user_email", email);
}

export function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  localStorage.removeItem("kb_id");
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");
  const email = localStorage.getItem("user_email");
  if (!token || !userId) return null;
  return { token, userId, email: email || "" };
}
