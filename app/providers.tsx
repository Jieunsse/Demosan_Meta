"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "./_components/Toast";
import { CreativeProvider } from "./_components/CreativeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreativeProvider>{children}</CreativeProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
