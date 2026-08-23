import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-4">
      <Link to="/login" className="mb-6" aria-label="Managiha">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        {children}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-neutral-500">{footer}</div>}
    </div>
  );
}
