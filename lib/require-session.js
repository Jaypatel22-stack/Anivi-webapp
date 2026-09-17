import { redirect } from "next/navigation";
import { getSession } from "./auth.js";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
