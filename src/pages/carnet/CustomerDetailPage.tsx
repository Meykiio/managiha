import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookX, MessageCircle, Pencil, Plus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Skeleton } from "../../components/ui/Spinner";
import { CarnetEntryModal } from "../../components/carnet/CarnetEntryModal";
import { CustomerFormModal } from "../../components/carnet/CustomerFormModal";
import { TransactionHistory } from "../../components/carnet/TransactionHistory";
import type { CarnetCustomer, CarnetTransaction } from "../../lib/types";
import { fmtMoneyShort, waLink } from "../../lib/format";
import { t } from "../../i18n";

function balanceTone(balance: number): BadgeTone {
  if (balance > 0) return "danger";
  if (balance < 0) return "info";
  return "success";
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { store } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<CarnetCustomer | null>(null);
  const [transactions, setTransactions] = useState<CarnetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [custRes, txRes] = await Promise.all([
        supabase.from("carnet_customers").select("*").eq("id", customerId).maybeSingle(),
        supabase
          .from("carnet_transactions")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (custRes.error) throw new Error(custRes.error.message);
      if (txRes.error) throw new Error(txRes.error.message);
      setCustomer(custRes.data);
      setTransactions(txRes.data ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [customerId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="h-40 animate-pulse rounded-xl bg-neutral-200/70" />
      </div>
    );
  }

  if (!customer || !store) {
    return (
      <EmptyState
        icon={BookX}
        title={t("carnet.emptyFiltered.title")}
        body={t("notFound.body")}
        action={
          <Link to="/carnet">
            <Button variant="secondary">{t("customerDetail.back")}</Button>
          </Link>
        }
      />
    );
  }

  const balance = Number(customer.balance);

  const handleArchiveToggle = async () => {
    setArchiving(true);
    try {
      const archived_at = customer.archived_at ? null : new Date().toISOString();
      const res = await supabase
        .from("carnet_customers")
        .update({ archived_at })
        .eq("id", customer.id);
      if (res.error) throw new Error(res.error.message);
      showToast(archived_at ? t("toast.customerArchived") : t("toast.customerRestored"));
      setArchiveOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setArchiving(false);
    }
  };

  const waMessage = t("customerDetail.whatsappMessage", {
    name: customer.full_name,
    store: store.name,
    balance: fmtMoneyShort(Math.max(balance, 0)),
  });
  const waUrl = waLink(customer.phone, waMessage);

  return (
    <div className="space-y-5">
      <Link
        to="/carnet"
        className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("customerDetail.back")}
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-500">{t("customerDetail.balanceLabel")}</p>
            <p className="tnum mt-1 text-4xl font-semibold tracking-tight text-neutral-900">
              {fmtMoneyShort(Math.abs(balance))}
            </p>
            <div className="mt-2">
              <Badge tone={balanceTone(balance)} dot>
                {balance > 0
                  ? t("customerDetail.owed")
                  : balance < 0
                    ? t("carnet.balance.advance")
                    : t("carnet.balance.settled")}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button onClick={() => setEntryOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("customerDetail.recordPayment")}
            </Button>
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">
                  <MessageCircle className="h-4 w-4" />
                  {t("customerDetail.shareWhatsApp")}
                </Button>
              </a>
            ) : (
              <Button
                variant="secondary"
                onClick={() => showToast(t("customerDetail.noPhoneWarning"), "error")}
              >
                <MessageCircle className="h-4 w-4" />
                {t("customerDetail.shareWhatsApp")}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-2 border-t border-neutral-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <dt className="text-neutral-500">{t("customerForm.phone")} :</dt>
            <dd className="tnum font-medium text-neutral-900">{customer.phone ?? "—"}</dd>
          </div>
          {customer.notes && (
            <div className="col-span-full">
              <dt className="text-neutral-500">{t("common.notes")} :</dt>
              <dd className="mt-0.5 text-neutral-800">{customer.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <TransactionHistory transactions={transactions} />

      <CarnetEntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        presetCustomerId={customer.id}
        presetType="payment"
        onSaved={load}
      />
      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSaved={load} />

      <button
        type="button"
        onClick={() => setArchiveOpen(true)}
        className="mx-auto block h-11 px-4 text-sm font-medium text-red-600 hover:text-red-700"
      >
        {customer.archived_at ? t("common.restore") : t("common.archive")}
      </button>

      <ConfirmDialog
        open={archiveOpen}
        loading={archiving}
        title={
          customer.archived_at ? t("common.restore") : t("customerDetail.archiveConfirm.title")
        }
        body={
          customer.archived_at
            ? `${customer.full_name} réapparaîtra dans le carnet.`
            : t("customerDetail.archiveConfirm.body")
        }
        confirmLabel={customer.archived_at ? t("common.restore") : undefined}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}
