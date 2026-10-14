import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/react";
import { t } from "../../i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught UI error:", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReload = (): void => {
    window.location.assign("/");
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-tint">
            <AlertTriangle className="h-7 w-7 text-error-fg" />
          </span>
          <h1 className="text-lg font-semibold text-body">
            {t("errorBoundary.title")}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-body-muted">
            {t("errorBoundary.body")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="h-11 rounded-lg bg-primary-solid px-4 text-sm font-medium text-onPrimary hover:opacity-90"
            >
              {t("errorBoundary.backHome")}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-lg border border-line-hi bg-surface px-4 text-sm font-medium text-body-soft hover:bg-surface-mid"
            >
              {t("errorBoundary.reload")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}