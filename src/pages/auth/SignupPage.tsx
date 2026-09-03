import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AuthShell } from "./AuthShell";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { t } from "../../i18n";

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        storeName: storeName.trim(),
        fullName: fullName.trim(),
      });
      if (result.needsConfirmation) {
        setCheckEmail(true);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <AuthShell
        footer={
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            {t("auth.backToLogin")}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {t("auth.signup.checkEmailTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500">
            {t("auth.signup.checkEmailBody")}
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <>
          {t("auth.signup.hasAccount")}{" "}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            {t("auth.signup.signIn")}
          </Link>
        </>
      }
    >
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        {t("auth.signup.title")}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{t("auth.signup.subtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label={t("auth.signup.storeName")}
          required
          autoComplete="organization"
          placeholder={t("auth.signup.storeNamePlaceholder")}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
        <Input
          label={`${t("auth.signup.fullName")} (${t("common.optional")})`}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label={t("auth.signup.email")}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("auth.signup.password")}
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          hint={t("auth.signup.passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {t("auth.signup.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
