import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, PackagePlus, PackageX, Scale } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Spinner";
import {
  ProductFormFields,
  productFormErrors,
  type ProductFormValues,
} from "../../components/products/ProductFormFields";
import { ProductMovements } from "../../components/products/ProductMovements";
import { ProductLots } from "../../components/products/ProductLots";
import { ProductSummary } from "../../components/products/ProductSummary";
import { ProductDetailModals } from "../../components/products/ProductDetailModals";
import type { Product } from "../../lib/types";
import { t } from "../../i18n";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { store } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<ProductFormValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const prodRes = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      if (prodRes.error) throw new Error(prodRes.error.message);
      const p = prodRes.data as Product | null;
      setProduct(p);
      if (p) {
        setValues({
          name: p.name,
          categoryId: p.category_id,
          unit: p.unit,
          costPrice: String(p.cost_price ?? ""),
          sellPrice: String(p.sell_price ?? ""),
          currentStock: String(p.current_stock),
          threshold: p.low_stock_threshold != null ? String(p.low_stock_threshold) : "",
          barcode: p.barcode ?? "",
          sku: p.sku ?? "",
          expiryDate: p.expiry_date ?? "",
          supplierId: p.supplier_id ?? "",
          imagePath: p.image_path ?? null,
        });
        if (p.category_id) {
          const cat = await supabase
            .from("categories")
            .select("name")
            .eq("id", p.category_id)
            .maybeSingle();
          setCategoryName(cat.data?.name ?? null);
        } else {
          setCategoryName(null);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  if (!product || !values || !store) {
    return (
      <EmptyState
        icon={PackageX}
        title={t("products.empty.title")}
        body={t("notFound.body")}
        action={
          <Link to="/products">
            <Button variant="secondary">{t("productDetail.back")}</Button>
          </Link>
        }
      />
    );
  }

  const handleSave = async () => {
    const nextErrors = productFormErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const res = await supabase
        .from("products")
        .update({
          name: values.name.trim(),
          category_id: values.categoryId,
          supplier_id: values.supplierId || null,
          unit: values.unit,
          cost_price: values.costPrice === "" ? 0 : Number(values.costPrice.replace(",", ".")),
          sell_price: values.sellPrice === "" ? 0 : Number(values.sellPrice.replace(",", ".")),
          low_stock_threshold:
            values.threshold === "" ? null : Number(values.threshold.replace(",", ".")),
          barcode: values.barcode.trim() || null,
          sku: values.sku.trim() || null,
          expiry_date: values.expiryDate || null,
          image_path: values.imagePath,
        })
        .eq("id", product.id);
      if (res.error) throw new Error(res.error.message);
      showToast(t("toast.productUpdated"));
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    setArchiving(true);
    try {
      const archived_at = product.archived_at ? null : new Date().toISOString();
      const res = await supabase
        .from("products")
        .update({ archived_at })
        .eq("id", product.id);
      if (res.error) throw new Error(res.error.message);
      showToast(archived_at ? t("toast.productArchived") : t("toast.productRestored"));
      setArchiveOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/products"
        className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-body-muted hover:text-body"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("productDetail.back")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-body lg:text-2xl">
            {product.name}
          </h1>
          <p className="mt-0.5 text-sm text-body-muted">{categoryName ?? t("productDetail.none")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Stock actions live here because this is the screen where you notice the
              figure is wrong. Sending the owner to another page to fix the number
              they are looking at is the kind of detour that ends in not fixing it. */}
          <Button variant="secondary" onClick={() => setReceiveOpen(true)}>
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            {t("inventory.receive.title")}
          </Button>
          <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
            <Scale className="h-4 w-4" aria-hidden="true" />
            {t("inventory.adjust.title")}
          </Button>
          <Button variant={product.archived_at ? "secondary" : "dangerGhost"} onClick={() => setArchiveOpen(true)}>
            {product.archived_at ? t("common.restore") : t("common.archive")}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={t("productDetail.info")}>
            <ProductFormFields
              storeId={store.id}
              productId={product.id}
              values={values}
              onChange={setValues}
              errors={errors}
              isEdit
            />
            <div className="mt-5 flex justify-end">
              <Button onClick={handleSave} loading={saving}>
                {t("common.save")}
              </Button>
            </div>
          </Card>
        </div>

        <ProductSummary product={product} categoryName={categoryName} />
      </div>

      <ProductLots productId={product.id} unit={product.unit} />

      <ProductMovements productId={product.id} />

      <ProductDetailModals
        product={product}
        archiveOpen={archiveOpen}
        archiving={archiving}
        receiveOpen={receiveOpen}
        adjustOpen={adjustOpen}
        onCloseArchive={() => setArchiveOpen(false)}
        onCloseReceive={() => setReceiveOpen(false)}
        onCloseAdjust={() => setAdjustOpen(false)}
        onConfirmArchive={handleArchiveToggle}
        onChanged={load}
      />
    </div>
  );
}
