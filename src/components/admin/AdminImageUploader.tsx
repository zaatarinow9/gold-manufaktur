"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import {
  CatalogImageUploadFailure,
  uploadCatalogImage,
} from "@/lib/admin/imageUpload";
import { PRODUCT_IMAGE_ALLOWED_MIME_TYPES } from "@/lib/product-images";

type AdminImageUploaderProps = {
  /** Folder name in storage, e.g. the product slug or "categories". */
  folder: string;
  images: string[];
  /** Allow more than one image (product galleries). */
  multiple?: boolean;
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function AdminImageUploader({
  folder,
  images,
  multiple = false,
  onChange,
  onUploadingChange,
}: AdminImageUploaderProps) {
  const t = useTranslations("Admin.imageUploader");
  const inputId = useId();
  const [isUploading, startUpload] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList ?? []).slice(0, multiple ? 12 : 1);

    if (files.length === 0) {
      return;
    }

    setError(null);
    onUploadingChange?.(true);

    startUpload(async () => {
      const uploaded: string[] = [];

      for (const file of files) {
        try {
          uploaded.push(await uploadCatalogImage(file, folder));
        } catch (uploadError) {
          const code =
            uploadError instanceof CatalogImageUploadFailure
              ? uploadError.code
              : "upload_failed";
          setError(t(`errors.${code}`));
        }
      }

      if (uploaded.length > 0) {
        onChange(multiple ? [...images, ...uploaded] : [uploaded[0]]);
      }

      onUploadingChange?.(false);
    });
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;

    if (target < 0 || target >= images.length) {
      return;
    }

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const makeMain = (index: number) => {
    const next = [...images];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  };

  const remove = (index: number) => {
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const showDropzone = multiple || images.length === 0;

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <ul className={clsx("grid gap-3", multiple ? "grid-cols-2 sm:grid-cols-3" : "max-w-[14rem]")}>
          {images.map((imageUrl, index) => (
            <li key={imageUrl} className="admin-panel-raised overflow-hidden">
              <div className="relative aspect-[4/5] bg-black/40">
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 14rem, 45vw"
                  className="object-cover"
                />
                {multiple && index === 0 ? (
                  <span className="absolute start-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-gold-soft">
                    {t("mainPhoto")}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                {multiple ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="admin-icon-button admin-icon-button-quiet h-8 w-8"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={t("moveEarlier")}
                      title={t("moveEarlier")}
                    >
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-button admin-icon-button-quiet h-8 w-8"
                      onClick={() => move(index, 1)}
                      disabled={index === images.length - 1}
                      aria-label={t("moveLater")}
                      title={t("moveLater")}
                    >
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </button>
                    {index > 0 ? (
                      <button
                        type="button"
                        className="admin-icon-button admin-icon-button-quiet h-8 w-8"
                        onClick={() => makeMain(index)}
                        aria-label={t("makeMain")}
                        title={t("makeMain")}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <label
                    htmlFor={inputId}
                    className="admin-button admin-button-ghost admin-button-sm cursor-pointer"
                  >
                    {t("replace")}
                  </label>
                )}
                <button
                  type="button"
                  className="admin-icon-button admin-icon-button-quiet h-8 w-8 hover:!text-rose-300"
                  onClick={() => remove(index)}
                  aria-label={t("remove")}
                  title={t("remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={PRODUCT_IMAGE_ALLOWED_MIME_TYPES.join(",")}
        multiple={multiple}
        onChange={(event) => {
          upload(event.target.files);
          event.target.value = "";
        }}
      />

      {showDropzone ? (
        <label
          htmlFor={inputId}
          className="admin-dropzone"
          data-dragging={isDragging ? "true" : undefined}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            upload(event.dataTransfer.files);
          }}
        >
          {isUploading ? (
            <LoaderCircle className="h-6 w-6 animate-spin text-gold-soft" />
          ) : (
            <ImagePlus className="h-6 w-6 text-gold-soft" />
          )}
          <span className="text-sm font-medium text-foreground">
            {isUploading ? t("uploading") : multiple ? t("addPhotos") : t("addPhoto")}
          </span>
          <span className="text-xs">{t("hint")}</span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
