import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/admin",
  "/secretary",
];

const publicRoutes = [
  "/",
  "/auth/login",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  if (!isProtectedRoute && !isPublicRoute) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;

  // Redirect to login if trying to access protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isProtectedRoute && session) {
    try {
      // Verify the session token using Firebase Admin SDK (recommended)
      // You'll need to set up a Firebase Admin backend for this
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verifyToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: session }),
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const user = await response.json();
      
      // Role-based access control
      if (path.startsWith("/admin") && user.role !== "admin") {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      
      if (path.startsWith("/secretary") && user.role !== "secretary") {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }

      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL("/auth/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};