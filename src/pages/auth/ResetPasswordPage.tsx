import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { FullScreenSpinner } from "../../components/ui/Spinner";
import { useToast } from "../../contexts/ToastContext";
import { t } from "../../i18n";

export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenSpinner />;

  if (!user) {
    return (
      <AuthShell
        footer={
          <Link to="/login" className="font-semibold text-primary hover:opacity-80">
            {t("auth.backToLogin")}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-tint">
            <AlertCircle className="h-7 w-7 text-error-fg" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-body">
            {t("auth.reset.invalidLink")}
          </h1>
          <p className="text-sm leading-relaxed text-body-muted">
            {t("auth.reset.invalidLinkBody")}
          </p>
        </div>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      showToast(t("auth.reset.success"));
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      footer={
        <Link to="/login" className="font-semibold text-primary hover:opacity-80">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      <h1 className="text-xl font-semibold tracking-tight text-body">
        {t("auth.reset.title")}
      </h1>
      <p className="mt-1 text-sm text-body-muted">{t("auth.reset.subtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label={t("auth.reset.password")}
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          hint={t("auth.signup.passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t("auth.reset.confirm")}
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-error-tint px-3.5 py-2.5 text-sm font-medium text-error-fg">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {t("auth.reset.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
