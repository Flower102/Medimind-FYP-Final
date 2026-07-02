// frontend/src/app/api/backend/[...path]/route.ts

/* -------------------------------------------------------------------------- */
/* Next.js Backend Proxy Imports                                               */
/* These imports provide the request and response tools used by the route.      */
/* The proxy depends on them to forward browser requests to FastAPI safely.     */
/* -------------------------------------------------------------------------- */

import { NextRequest, NextResponse } from "next/server";

/* -------------------------------------------------------------------------- */
/* Route Runtime Configuration                                                 */
/* These settings force this API route to run dynamically in the Node.js runtime.*/
/* This is needed because the route forwards live requests and cookies.         */
/* -------------------------------------------------------------------------- */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* Backend URL Configuration                                                   */
/* This value decides where the proxy sends API requests. It uses the deployed  */
/* backend URL when available, otherwise it falls back to local FastAPI.        */
/* -------------------------------------------------------------------------- */

const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

/* -------------------------------------------------------------------------- */
/* Route Parameter Types                                                       */
/* This type describes the catch-all path that Next.js passes into the proxy.   */
/* It allows one route file to handle every /api/backend/... request.           */
/* -------------------------------------------------------------------------- */

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

/* -------------------------------------------------------------------------- */
/* Cookie Forwarding Helper                                                    */
/* FastAPI may return authentication cookies. This helper copies those cookies  */
/* onto the Next.js response so the browser receives the updated login session. */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Backend Proxy Handler                                                       */
/* This function builds the FastAPI URL, forwards the request body and headers, */
/* then converts the backend response into a Next.js response for the browser.  */
/* -------------------------------------------------------------------------- */

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  /* ------------------------------------------------------------------------ */
  /* Backend Request URL                                                       */
  /* The catch-all route path is joined back together and combined with query  */
  /* parameters so the backend receives the same endpoint the frontend called. */
  /* ------------------------------------------------------------------------ */

  const backendPath = path.join("/");
  const backendUrl = `${BACKEND_URL}/${backendPath}${request.nextUrl.search}`;

  /* ------------------------------------------------------------------------ */
  /* Request Method and Body                                                   */
  /* Requests such as POST, PUT, PATCH, and DELETE may include a body. GET and */
  /* HEAD requests do not send a body to avoid invalid fetch behaviour.        */
  /* ------------------------------------------------------------------------ */

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  const requestBody = hasBody ? await request.arrayBuffer() : undefined;

  /* ------------------------------------------------------------------------ */
  /* Forwarded Request Headers                                                 */
  /* Important browser headers are copied to FastAPI so cookies, auth headers, */
  /* form uploads, and accepted response types continue to work.               */
  /* ------------------------------------------------------------------------ */

  const cookieHeader = request.headers.get("cookie");
  const authorizationHeader = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  /* ------------------------------------------------------------------------ */
  /* FastAPI Request                                                           */
  /* The proxy calls FastAPI without caching. Redirects are kept manual so     */
  /* Google OAuth redirects can be passed back to the browser correctly.       */
  /* ------------------------------------------------------------------------ */

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

    /*
     * Google OAuth Redirect Handling
     * Server-side fetch must not follow FastAPI's redirect. The browser needs
     * to receive the redirect response so it can continue the Google login flow.
     */
    redirect: "manual",
  });

  /* ------------------------------------------------------------------------ */
  /* Response Header Setup                                                     */
  /* The proxy preserves the backend content type and any authentication       */
  /* cookies before sending the response back to the frontend.                 */
  /* ------------------------------------------------------------------------ */

  const headers = new Headers();

  const responseContentType = backendRes.headers.get("content-type");
  if (responseContentType) {
    headers.set("Content-Type", responseContentType);
  }

  copySetCookieHeaders(backendRes, headers);

  /* ------------------------------------------------------------------------ */
  /* Redirect Response Handling                                                */
  /* OAuth and similar flows may return a Location header. This block passes   */
  /* the redirect to the browser instead of reading it as a normal response.   */
  /* ------------------------------------------------------------------------ */

  const location = backendRes.headers.get("location");

  if (location && backendRes.status >= 300 && backendRes.status < 400) {
    headers.set("Location", location);

    return new NextResponse(null, {
      status: backendRes.status,
      headers,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Backend Error Forwarding                                                  */
  /* Failed FastAPI responses are logged for debugging and passed through so   */
  /* the frontend can show the backend's error message.                        */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Empty Response Handling                                                   */
  /* Some backend responses deliberately have no body. Returning null keeps    */
  /* those HTTP responses valid and avoids unnecessary body parsing.           */
  /* ------------------------------------------------------------------------ */

  if (backendRes.status === 204 || backendRes.status === 304) {
    return new NextResponse(null, {
      status: backendRes.status,
      headers,
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Successful Response Forwarding                                            */
  /* Normal successful responses are copied as raw bytes so JSON, files, and   */
  /* other response formats can pass through the proxy unchanged.              */
  /* ------------------------------------------------------------------------ */

  const responseBody = await backendRes.arrayBuffer();

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers,
  });
}

/* -------------------------------------------------------------------------- */
/* HTTP Method Exports                                                         */
/* Each exported method sends the request through the same proxy handler. This */
/* keeps all backend communication consistent across the frontend app.         */
/* -------------------------------------------------------------------------- */

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
