import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PropsWithChildren } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeSync } from "../features/theme/ThemeSync";

export function AppProviders({ children }: PropsWithChildren) {
  const client = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
