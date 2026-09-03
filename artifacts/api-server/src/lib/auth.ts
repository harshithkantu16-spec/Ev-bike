import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.CLERK_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getSignedInEmail(req: Request): Promise<string | null> {
  const { userId } = getAuth(req);
  if (!userId) return null;

  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  );
  return (primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null);
}

export async function requireSignedIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign-in required" });
    return;
  }
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const email = await getSignedInEmail(req);
  if (!email) {
    res.status(401).json({ error: "Sign-in required" });
    return;
  }

  if (!configuredAdminEmails().has(email.toLowerCase())) {
    req.log.warn({ email }, "Rejected non-admin catalog mutation");
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

export function isAdminEmail(email: string | null): boolean {
  return email ? configuredAdminEmails().has(email.toLowerCase()) : false;
}