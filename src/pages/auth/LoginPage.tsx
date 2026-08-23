import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { t } from "../../i18n";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
            {t("auth.login.createAccount")}
          </Link>
        </>
      }
    >
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        {t("auth.login.title")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{t("auth.login.subtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label={t("auth.signup.email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <Input
            label={t("auth.signup.password")}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {t("auth.login.forgot")}
            </Link>
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {t("auth.login.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
