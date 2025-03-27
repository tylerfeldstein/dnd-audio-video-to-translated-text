import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextFetchEvent, NextRequest } from 'next/server'

// This function combines Clerk middleware with our custom header setting
export async function middleware(req: NextRequest, evt: NextFetchEvent) {
  // Get the response from the Clerk middleware
  const response = await clerkMiddleware()(req, evt);
  
  // If response is null or not a NextResponse, return it as is
  if (!response || !(response instanceof NextResponse)) {
    return response;
  }
  
  // Clone the response so we can modify headers
  const newResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  
  // Copy all headers from the original response
  response.headers.forEach((value, key) => {
    newResponse.headers.set(key, value);
  });
  
  // Add security headers required for SharedArrayBuffer support
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  newResponse.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  return newResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};