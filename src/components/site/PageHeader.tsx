import clsx from "clsx";

import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type PageHeaderProps = {
  children?: React.ReactNode;
  className?: string;
  description?: string;
  /** Optional banner set in the dashboard; shown beside the title. */
  imageUrl?: string;
  title: string;
};

/** The quiet title band at the top of inner pages. */
export function PageHeader({ children, className, description, imageUrl, title }: PageHeaderProps) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <header className={clsx("border-b border-[var(--border)]", className)}>
      <div className="container-shell">
        <div
          className={clsx(
            "content-shell pb-10 pt-12 sm:pb-12 sm:pt-16",
            hasImage && "grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14"
          )}
        >
          <div>
            <h1 className="section-title text-foreground">{title}</h1>
            {description ? <p className="section-copy mt-4 max-w-2xl text-[1.0625rem]">{description}</p> : null}
            {children}
          </div>
          {hasImage ? (
            <div className="media-frame relative aspect-[16/9]">
              <LuxuryMedia src={imageUrl} alt="" sizes="(min-width: 1024px) 40vw, 100vw" priority />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
