import type { ReactNode } from "react";
import { ProtectedAppLayout } from "@/components/app/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
