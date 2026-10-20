import { resolveRosterLoginDestination } from "@/lib/auth/postLogin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  buildAuthorizationUrl,
  generateNonce,
  generatePkcePair,
  generateRandomState,
  getOidcConfig,
  isMockAuthAllowed,
  isMockAdminAllowed,
  validateOidcConfig,
} from "@/lib/auth/oidc";
import { SessionUser, setSessionCookie } from "@/lib/auth/session";

function sanitizeRedirectTarget(target?: string | null): string {
  if (!target || typeof target !== "string") {
    return "/games";
  }
  if (
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("://") &&
    !/[\\\u0000-\u0020]/.test(target)
  ) {
    return target;
  }
  return "/games";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isMock = searchParams.get("mock") === "true";
  const roleParam = searchParams.get("role") || "user";
  const rawRedirect = searchParams.get("redirect") || "/games";
  const redirectTarget = sanitizeRedirectTarget(rawRedirect);

  // Check Mock Auth Mode
  if (isMock) {
    if (!isMockAuthAllowed()) {
      return NextResponse.json(
        {
          error: "Mock authentication is disabled in production environments.",
        },
        { status: 403 },
      );
    }

    const requestedAdmin = roleParam.toLowerCase() === "admin";
    if (requestedAdmin && !isMockAdminAllowed()) {
      return NextResponse.json(
        { error: "Mock administrator authentication is disabled." },
        { status: 403 },
      );
    }

    const isAdmin = requestedAdmin && isMockAdminAllowed();
    const mockEmail = isAdmin ? "admin@shellshift.io" : "player1@shellshift.io";
    const mockName = isAdmin ? "Admin Cipher Master" : "Cipher Runner 01";
    const mockSub = isAdmin ? "mock-sub-admin-001" : "mock-sub-user-001";
    const mockIssuer = "https://auth.shellshift.mock";

    let user = await prisma.user.findUnique({
      where: {
        oidcIssuer_oidcSub: {
          oidcIssuer: mockIssuer,
          oidcSub: mockSub,
        },
      },
      include: {
        memberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          oidcSub: mockSub,
          oidcIssuer: mockIssuer,
          email: mockEmail,
          name: mockName,
          role: isAdmin ? "ADMIN" : "USER",
        },
        include: {
          memberships: {
            include: { team: true },
          },
        },
      });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      oidcSub: user.oidcSub,
      oidcIssuer: user.oidcIssuer,
      email: user.email,
      name: user.name,
      role: (user.role as "USER" | "ADMIN") || (isAdmin ? "ADMIN" : "USER"),
      teamId: null,
      teamName: null,
      teamRole: null,
    };

    const destination = await resolveRosterLoginDestination(
      sessionUser.role,
      sessionUser.id,
      redirectTarget,
    );
    const response = NextResponse.redirect(new URL(destination, request.url));
    await setSessionCookie(sessionUser, response);
    return response;
  }

  // Real OIDC Flow with Dynamic Discovery & PKCE
  const config = getOidcConfig();
  const validation = validateOidcConfig(config);
  if (!validation.valid) {
    console.error("OIDC configuration error:", validation.error);
    return NextResponse.redirect(
      new URL(
        "/?error=OIDC+configuration+is+incomplete+or+invalid",
        request.url,
      ),
    );
  }

  const state = generateRandomState();
  const nonce = generateNonce();
  const { codeVerifier, codeChallenge } = generatePkcePair();

  let authUrl: string;
  try {
    authUrl = await buildAuthorizationUrl(config, state, codeChallenge, nonce);
  } catch (err) {
    console.error("Failed to construct authorization URL:", err);
    return NextResponse.redirect(
      new URL("/?error=Unable+to+reach+USAR+FOSS+OIDC+provider", request.url),
    );
  }

  // Store PKCE verifier, state, nonce, and target in secure cookies for callback validation
  const cookieStore = await cookies();
  const isSecure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false");

  const cookieOpts = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    maxAge: 600, // 10 minutes
    path: "/",
  };

  cookieStore.set("oidc_state", state, cookieOpts);
  cookieStore.set("oidc_nonce", nonce, cookieOpts);
  cookieStore.set("oidc_code_verifier", codeVerifier, cookieOpts);
  cookieStore.set("oidc_redirect_target", redirectTarget, cookieOpts);

  return NextResponse.redirect(authUrl);
}
