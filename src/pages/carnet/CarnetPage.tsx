import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookUser, Plus, Search, UserPlus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useDebounced } from "../../hooks/useDebounced";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { Input } from "../../components/ui/Input";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { CarnetEntryModal } from "../../components/carnet/CarnetEntryModal";
import { CustomerFormModal } from "../../components/carnet/CustomerFormModal";
import type { CarnetCustomer } from "../../lib/types";
import { fmtDate, fmtMoneyShort } from "../../lib/format";
import { PAGE_SIZE } from "../../lib/constants";
import { t } from "../../i18n";

function balanceTone(balance: number): BadgeTone {
  if (balance > 0) return "danger";
  if (balance < 0) return "info";
  return "success";
}

function balanceText(customer: CarnetCustomer): string {
  const b = Number(customer.balance);
  if (b > 0) return t("carnet.balance.owed", { amount: fmtMoneyShort(b) });
  if (b < 0) return t("carnet.balance.advance");
  return t("carnet.balance.settled");
}

export default function CarnetPage() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [rows, setRows] = useState<CarnetCustomer[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      let query = supabase
        .from("carnet_customers")
        .select("*", { count: "exact" })
        .eq("store_id", store.id)
        .is("archived_at", null)
        .order("balance", { ascending: false })
        .order("full_name");
      if (search.trim()) {
        const q = search.trim().replace(/[%,()]/g, "");
        query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
      }
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count: total } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      setRows(data ?? []);
      setCount(total ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [store, search, page, showToast]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("carnet.title")}
        description={t("carnet.subtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setNewCustomerOpen(true)}>
              <UserPlus className="h-4 w-4" />
              {t("carnet.newCustomer")}
            </Button>
            <Button onClick={() => setEntryOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("carnet.newEntry")}
            </Button>
          </>
        }
      />

      <Input
        placeholder={t("common.search")}
        prefixIcon={<Search className="h-4 w-4" />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        aria-label={t("common.search")}
        className="max-w-md"
      />

      <Card bodyClassName={loading ? "" : "px-0 pb-0"}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          count === 0 && !search ? (
            <EmptyState
              icon={BookUser}
              title={t("carnet.empty.title")}
              body={t("carnet.empty.body")}
              action={
                <Button onClick={() => setEntryOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("carnet.newEntry")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title={t("carnet.emptyFiltered.title")}
              body={t("carnet.emptyFiltered.body")}
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3 text-start">{t("carnet.table.customer")}</th>
                    <th className="px-3 py-3 text-start hidden sm:table-cell">{t("common.phone")}</th>
                    <th className="px-3 py-3 text-start">{t("carnet.table.balance")}</th>
                    <th className="px-5 py-3 text-end">{t("carnet.table.lastActivity")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/60">
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/carnet/${c.id}`}
                          className="font-medium text-neutral-900 hover:text-primary-700"
                        >
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="tnum px-3 py-3.5 text-neutral-500 hidden sm:table-cell">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge tone={balanceTone(Number(c.balance))} dot>
                          {balanceText(c)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-end text-neutral-500">
                        {fmtDate(c.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4 pt-1">
              <Pagination
                page={page}
                totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      <CarnetEntryModal open={entryOpen} onClose={() => setEntryOpen(false)} onSaved={load} />
      <CustomerFormModal open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} onSaved={load} />
    </div>
  );
}
