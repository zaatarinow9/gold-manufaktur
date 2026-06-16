import clsx from "clsx";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Link } from "@/i18n/navigation";
import { companyInfo } from "@/lib/site";

type AdminBrandProps = {
  alt: string;
  className?: string;
  href?: string;
  logoClassName?: string;
  onClick?: () => void;
  priority?: boolean;
  subtitle?: string;
};

export function AdminBrand({
  alt,
  className,
  href = "/admin",
  logoClassName,
  onClick,
  priority = false,
  subtitle,
}: AdminBrandProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx("admin-brand", className)}
    >
      <span className="sr-only">{companyInfo.name}</span>
      <BrandLogo
        alt={alt}
        priority={priority}
        className={clsx("h-[2.85rem] w-auto shrink-0", logoClassName)}
      />
      {subtitle ? <span className="admin-brand-subtitle">{subtitle}</span> : null}
    </Link>
  );
}
