import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadProductImage, deleteProductImage, getProductImageUrl } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { t } from "../../i18n";

interface ProductImageUploadProps {
  storeId: string;
  productId: string;
  imagePath: string | null;
  onImageChange: (path: string | null) => void;
  readonly?: boolean;
}

export function ProductImageUpload({
  storeId,
  productId,
  imagePath,
  onImageChange,
  readonly,
}: ProductImageUploadProps) {
  const { showToast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    getProductImageUrl(storeId, productId)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, productId, imagePath]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast(t("imageUpload.tooLarge"), "error");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast(t("imageUpload.invalidType"), "error");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadProductImage(storeId, productId, file);
      onImageChange(path);
      const url = await getProductImageUrl(storeId, productId);
      setPreviewUrl(url);
      showToast(t("imageUpload.success"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      await deleteProductImage(storeId, productId);
      onImageChange(null);
      setPreviewUrl(null);
      showToast(t("imageUpload.removed"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={t("imageUpload.alt")}
            className="h-32 w-32 rounded-lg object-cover"
          />
          {!readonly && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="absolute -top-2 -end-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
              aria-label={t("imageUpload.remove")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : !readonly ? (
        <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-400 hover:text-primary-500">
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs">{uploading ? t("imageUpload.uploading") : t("imageUpload.add")}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      ) : null}
    </div>
  );
}