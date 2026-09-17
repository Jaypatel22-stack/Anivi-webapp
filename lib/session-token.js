// Pure JWT sign/verify helpers with no dependency on `next/headers`, so this
// file is safe to import from Next.js middleware (Edge runtime) as well as
// from Server Components / Server Actions.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set (or too short). Set a long random string in your environment.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user) {
  return new SignJWT({
    sub: user.id,
    orgId: user.orgId,
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
