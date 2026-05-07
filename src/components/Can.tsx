import { ReactNode } from "react";
import { useCan } from "@/hooks/usePermissions";

interface CanProps {
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ action, children, fallback = null }: CanProps) {
  const allowed = useCan(action);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
