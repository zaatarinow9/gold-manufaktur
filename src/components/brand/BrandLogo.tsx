import { twMerge } from "tailwind-merge";
import Image from "next/image";

type BrandLogoProps = {
  alt: string;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  alt,
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/goldhelwah-logo.svg"
      alt={alt}
      width={273}
      height={198}
      priority={priority}
      className={twMerge("brand-logo-image h-auto w-auto", className)}
    />
  );
}
