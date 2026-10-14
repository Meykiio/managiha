import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { supabase } from "../../lib/supabaseClient";
import { t } from "../../i18n";

/**
 * Changing the password while already signed in.
 *
 * Until now the only way to change a password was the emailed reset link, which
 * means an owner who remembered theirs still had to go through their inbox — and
 * one who had lost access to the inbox could not do it at all.
 *
 * Re-authentication is not required by Supabase for `updateUser`, and the session
 * is already proof of possession. What is required is honesty about the minimum
 * length, which mirrors the signup form rather than inventing a second policy.
 */
export function PasswordCard() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (next.length < 6) nextErrors.next = t("settings.password.tooShort");
    if (next !== confirm) nextErrors.next = t("settings.password.mismatch");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      // Re-authenticate first. Supabase would accept the update without it, but
      // silently allowing a password change on an unattended unlocked device is
      // the failure mode worth closing.
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (signInError) {
          setErrors({ current: t("settings.password.currentWrong") });
          setSaving(false);
          return;
        }
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);
      showToast(t("toast.passwordChanged"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t("settings.password.title")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-body-soft">{t("settings.password.body")}</p>
        <Input
          label={t("settings.password.current")}
          type="password"
          autoComplete="current-password"
          value={current}
          error={errors.current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label={t("settings.password.new")}
          type="password"
          autoComplete="new-password"
          value={next}
          error={errors.next}
          hint={t("settings.password.hint")}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label={t("settings.password.confirm")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!current || !next || !confirm}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {t("settings.password.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
