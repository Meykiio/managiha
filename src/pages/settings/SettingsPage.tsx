import { useEffect, useState, type FormEvent } from "react";
import { Building2, CreditCard, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { PageHeader } from "../../components/ui/PageHeader";
import { t } from "../../i18n";
import { setLanguage } from "../../i18n";

export default function SettingsPage() {
  const { store, profile, refreshStore } = useAuth();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [language, setLanguageState] = useState("fr");
  const [savingStore, setSavingStore] = useState(false);

  const [fullName, setFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (store) {
      setStoreName(store.name);
      setStoreAddress(store.address ?? "");
      setStorePhone(store.phone ?? "");
      setLanguageState(store.language);
    }
    if (profile) {
      setFullName(profile.full_name ?? "");
      setProfilePhone(profile.phone ?? "");
    }
  }, [store, profile]);

  const handleSaveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSavingStore(true);
    try {
      const res = await supabase
        .from("stores")
        .update({
          name: storeName.trim(),
          address: storeAddress.trim() || null,
          phone: storePhone.trim() || null,
          language,
        })
        .eq("id", store.id);
      if (res.error) throw new Error(res.error.message);
      setLanguage(language);
      await refreshStore();
      showToast(t("toast.storeUpdated"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSavingStore(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const res = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: profilePhone.trim() || null,
        })
        .eq("id", profile.id);
      if (res.error) throw new Error(res.error.message);
      showToast(t("toast.profileUpdated"));
      window.location.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} />

      <Card title={t("settings.profile.title")} className="max-w-2xl">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <span className="flex h-9 w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            <UserRound className="h-4 w-4" />
          </span>
          <Input
            label={t("settings.profile.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label={t("settings.profile.phone")}
            type="tel"
            value={profilePhone}
            onChange={(e) => setProfilePhone(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t("settings.store.title")} className="max-w-2xl">
        <form onSubmit={handleSaveStore} className="space-y-4">
          <span className="flex h-9 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            <Building2 className="h-4 w-4" />
          </span>
          <Input
            label={t("settings.store.name")}
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <Input
            label={`${t("settings.store.address")} (${t("common.optional")})`}
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={t("settings.store.phone")}
              type="tel"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
            />
            <Input
              label={t("settings.store.currency")}
              value="DZD"
              disabled
              readOnly
              hint={t("settings.store.currencyFixed")}
            />
            <Select
              label={t("settings.store.language")}
              value={language}
              onChange={(e) => setLanguageState(e.target.value)}
            >
              <option value="fr">Français</option>
              <option value="ar" disabled>
                العربية ({t("settings.store.languageSoon")})
              </option>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingStore}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t("settings.plan.title")} className="max-w-2xl">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">{t("settings.plan.plan")}</dt>
            <dd className="font-medium text-neutral-900">{t("settings.plan.planValue")}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">{t("settings.plan.status")}</dt>
            <dd className="font-medium text-emerald-600">{t("settings.plan.statusValue")}</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-neutral-50 px-3.5 py-3 text-xs leading-relaxed text-neutral-500">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
          {t("settings.plan.note")}
        </p>
      </Card>
    </div>
  );
}
