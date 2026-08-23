import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { t } from "../../i18n";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {t("auth.forgot.sentTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500">
            {t("auth.forgot.sentBody")}
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {t("auth.forgot.title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("auth.forgot.subtitle")}</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={t("auth.signup.email")}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {t("auth.forgot.submit")}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
