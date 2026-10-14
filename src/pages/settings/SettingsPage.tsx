import { useEffect, useState, type FormEvent } from "react";
import { Building2, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PasswordCard } from "../../components/settings/PasswordCard";
import { PlanCard, LinksCard } from "../../components/settings/AboutCards";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { PageHeader } from "../../components/ui/PageHeader";
import { t } from "../../i18n";
import { availableLanguages, getLanguage, setLanguage } from "../../i18n";

export default function SettingsPage() {
  const { store, profile, refreshStore, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  // Seeded from the i18n module, not from `store.language`: AuthContext already
  // applied the store's language before this page renders, so getLanguage() is
  // the same value but cannot go stale when the tree remounts on a switch.
  const [language, setLanguageState] = useState(getLanguage());
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingStore, setSavingStore] = useState(false);

  const [fullName, setFullName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (store) {
      setStoreName(store.name);
      setStoreAddress(store.address ?? "");
      setStorePhone(store.phone ?? "");
    }
    if (profile) {
      setFullName(profile.full_name ?? "");
      setProfilePhone(profile.phone ?? "");
    }
  }, [store, profile]);

  /**
   * Language is persisted on change rather than on Save. Waiting for the save
   * button would mean a user who switches to Arabic and closes the tab loses the
   * setting, and it would also mean the interface stays in the old language for
   * as long as the user forgets to press Save.
   *
   * The write is awaited *before* setLanguage() on purpose. setLanguage() remounts
   * the subtree, so anything awaited afterwards would be writing to a component
   * that no longer exists. Doing it in this order also means a failed write leaves
   * the interface untouched instead of showing a language that was never saved.
   */
  const handleLanguageChange = async (code: string) => {
    if (code === language) return;
    setSavingLanguage(true);
    try {
      if (store) {
        const res = await supabase
          .from("stores")
          .update({ language: code })
          .eq("id", store.id);
        if (res.error) throw new Error(res.error.message);
        await refreshStore();
      }
      setLanguageState(code);
      setLanguage(code);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSavingLanguage(false);
    }
  };

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
        })
        .eq("id", store.id);
      if (res.error) throw new Error(res.error.message);
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
      await refreshProfile();
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
          <span className="flex h-9 w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wide text-body-muted">
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
          <span className="flex h-9 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-body-muted">
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
              disabled={savingLanguage}
              onChange={(e) => void handleLanguageChange(e.target.value)}
            >
              {availableLanguages().map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingStore}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>
      <PlanCard />

      <PasswordCard />

      <LinksCard />
    </div>
  );
}
