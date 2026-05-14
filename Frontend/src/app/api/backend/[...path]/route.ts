// frontend/src/app/api/backend/[...path]/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FastAPI backend URL.
 *
 * Browser calls:
 *   /api/backend/...
 *
 * Proxy forwards to:
 *   http://127.0.0.1:8000/...
 */
const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

/**
 * Copies cookies returned by FastAPI back to the browser.
 */
function copySetCookieHeaders(backendRes: Response, headers: Headers) {
  const backendHeaders = backendRes.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const cookies = backendHeaders.getSetCookie?.() ?? [];

  if (cookies.length > 0) {
    cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    return;
  }

  const singleCookie = backendRes.headers.get("set-cookie");

  if (singleCookie) {
    headers.append("Set-Cookie", singleCookie);
  }
}

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  const backendPath = path.join("/");
  const backendUrl = `${BACKEND_URL}/${backendPath}${request.nextUrl.search}`;

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  const requestBody = hasBody ? await request.arrayBuffer() : undefined;

  const cookieHeader = request.headers.get("cookie");
  const authorizationHeader = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  const backendRes = await fetch(backendUrl, {
    method,
    body: requestBody,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(accept ? { Accept: accept } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(authorizationHeader ? { authorization: authorizationHeader } : {}),
    },
    cache: "no-store",

    /**
     * IMPORTANT FOR GOOGLE LOGIN:
     * Do not let server-side fetch follow FastAPI's 302 redirect.
     * The browser must receive the redirect to Google.
     */
    redirect: "manual",
  });

  const headers = new Headers();

  const responseContentType = backendRes.headers.get("content-type");
  if (responseContentType) {
    headers.set("Content-Type", responseContentType);
  }

  copySetCookieHeaders(backendRes, headers);

  /**
   * IMPORTANT FOR GOOGLE LOGIN:
   * If FastAPI returns 302 with a Location header, pass it back to the browser.
   */
  const location = backendRes.headers.get("location");

  if (location && backendRes.status >= 300 && backendRes.status < 400) {
    headers.set("Location", location);

    return new NextResponse(null, {
      status: backendRes.status,
      headers,
    });
  }

  if (!backendRes.ok) {
    const errorText = await backendRes.text().catch(() => "");

    console.warn("Backend proxy request failed:", {
      method,
      backendUrl,
      status: backendRes.status,
      responseText: errorText,
    });

    return new NextResponse(errorText || "{}", {
      status: backendRes.status,
      headers,
    });
  }

  if (backendRes.status === 204 || backendRes.status === 304) {
    return new NextResponse(null, {
      status: backendRes.status,
      headers,
    });
  }

  const responseBody = await backendRes.arrayBuffer();

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}