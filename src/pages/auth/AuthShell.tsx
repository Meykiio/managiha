import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { ThemeToggle } from "../../components/layout/ThemeToggle";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg p-4">
      {/* The toggle belongs here too, not only in the authenticated topbar.
          Someone who needs light to read the login form should not have to sign
          in first to get it. */}
      <div className="absolute end-2 top-2 sm:end-4 sm:top-4">
        <ThemeToggle />
      </div>

      <Link to="/login" className="mb-6" aria-label="Managiha">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        {children}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-body-muted">{footer}</div>}
    </div>
  );
}
