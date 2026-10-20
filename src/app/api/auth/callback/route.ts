import { resolveRosterLoginDestination } from "@/lib/auth/postLogin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  checkIsAdmin,
  discoverEndpoints,
  exchangeAuthorizationCode,
  fetchUserInfo,
  getOidcConfig,
  resolveShellShiftRole,
  verifyIdToken,
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
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oidc_state")?.value;
  const storedNonce = cookieStore.get("oidc_nonce")?.value;
  const storedVerifier = cookieStore.get("oidc_code_verifier")?.value;
  const rawTarget = cookieStore.get("oidc_redirect_target")?.value;
  const redirectTarget = sanitizeRedirectTarget(rawTarget);

  // Strictly clean up transient authentication cookies immediately
  cookieStore.delete("oidc_state");
  cookieStore.delete("oidc_nonce");
  cookieStore.delete("oidc_code_verifier");
  cookieStore.delete("oidc_redirect_target");

  // Handle provider-reported errors gracefully
  if (error) {
    console.warn(
      `OIDC provider returned error: ${error} (${errorDescription || "no description"})`,
    );
    if (error === "access_denied") {
      return NextResponse.redirect(
        new URL(
          "/?error=Access+was+denied+by+the+identity+provider",
          request.url,
        ),
      );
    }
    return NextResponse.redirect(
      new URL(
        "/?error=Authentication+was+cancelled+or+failed+at+provider",
        request.url,
      ),
    );
  }

  // Validate state and PKCE verifier
  if (!state || !storedState || state !== storedState) {
    console.error("OIDC state mismatch or state expired");
    return NextResponse.redirect(
      new URL(
        "/?error=Authentication+state+validation+failed.+Please+try+again.",
        request.url,
      ),
    );
  }

  if (!code || !storedVerifier || !storedNonce) {
    console.error("Missing authorization code, verifier, or nonce");
    return NextResponse.redirect(
      new URL("/?error=Missing+authentication+parameters", request.url),
    );
  }

  const config = getOidcConfig();

  try {
    // 1. Discover endpoints
    const metadata = await discoverEndpoints(config.issuer);

    // 2. Exchange authorization code for tokens with PKCE verifier
    const tokenData = await exchangeAuthorizationCode(
      config,
      code,
      storedVerifier,
      metadata,
    );

    if (!tokenData.id_token) {
      console.error("Token response missing id_token");
      return NextResponse.redirect(
        new URL(
          "/?error=Provider+failed+to+return+identity+token",
          request.url,
        ),
      );
    }

    // 3. Validate ID token cryptographically with RS256 and discovered JWKS
    const validatedClaims = await verifyIdToken(
      tokenData.id_token,
      config,
      storedNonce,
      metadata,
    );

    // 4. Optionally fetch userinfo if userinfo_endpoint exists and access_token was returned
    let userInfo: Record<string, unknown> = {};
    if (tokenData.access_token && metadata.userinfo_endpoint) {
      try {
        userInfo = await fetchUserInfo(
          tokenData.access_token,
          metadata.userinfo_endpoint,
        );
        // Verify subject binding if userinfo returns sub
        if (userInfo.sub && userInfo.sub !== validatedClaims.sub) {
          console.error("UserInfo subject does not match ID token subject");
          return NextResponse.redirect(
            new URL("/?error=Identity+binding+mismatch", request.url),
          );
        }
      } catch (uiErr) {
        // Log userinfo fetch failure but continue with verified ID token claims
        console.warn("UserInfo endpoint fetch optional warning:", uiErr);
      }
    }

    // 5. Resolve stable identity
    const oidcSub = validatedClaims.sub;
    const email: string | null =
      (typeof validatedClaims.email === "string" && validatedClaims.email) ||
      (typeof userInfo.email === "string" && userInfo.email) ||
      null;

    const rawName =
      (typeof validatedClaims.name === "string" && validatedClaims.name) ||
      (typeof userInfo.name === "string" && userInfo.name) ||
      (typeof validatedClaims.preferred_username === "string" &&
        validatedClaims.preferred_username) ||
      (typeof userInfo.preferred_username === "string" &&
        userInfo.preferred_username) ||
      (email ? email.split("@")[0] : "Competitor");

    const name = rawName.trim() || "Competitor";

    // 6. Check administrator authorization
    const isAdmin = checkIsAdmin(email, { ...validatedClaims, ...userInfo });

    // 7. Find or create local ShellShift user by stable (oidcIssuer, oidcSub) pair
    let user = await prisma.user.findUnique({
      where: {
        oidcIssuer_oidcSub: {
          oidcIssuer: config.issuer,
          oidcSub,
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
          oidcSub,
          oidcIssuer: config.issuer,
          email,
          name,
          role: isAdmin ? "ADMIN" : "USER",
        },
        include: {
          memberships: {
            include: { team: true },
          },
        },
      });
    } else {
      // User exists - preserve memberships, progress, and history while synchronizing
      // access with the latest verified website role or local administrator allowlist.
      const updateData: {
        email?: string | null;
        name?: string;
        role?: string;
      } = {};

      if (email && email !== user.email) {
        updateData.email = email;
      }

      const resolvedRole = resolveShellShiftRole(isAdmin);
      if (user.role !== resolvedRole) {
        updateData.role = resolvedRole;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            memberships: {
              include: { team: true },
            },
          },
        });
      }
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

    // 8. Redirect to contestant registration if no team yet, else destination
    const destination = await resolveRosterLoginDestination(
      sessionUser.role,
      sessionUser.id,
      redirectTarget,
    );
    const response = NextResponse.redirect(new URL(destination, request.url));
    await setSessionCookie(sessionUser, response);
    return response;
  } catch (err) {
    console.error("OIDC callback exception:", err);
    const msg = (err as Error)?.message || "Authentication processing failure";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(msg)}`, request.url),
    );
  }
}
