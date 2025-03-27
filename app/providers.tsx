'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
// import { Toaster } from "@/components/ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProvider client={convex}>
        {children}
        {/* Temporarily commented out to fix duplicate key errors */}
        {/* <Toaster /> */}
      </ConvexProvider>
    </ClerkProvider>
  );
} 