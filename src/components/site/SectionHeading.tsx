import clsx from "clsx";

import { trimDisplayHeading } from "@/lib/displayText";

type SectionHeadingProps = {
  align?: "center" | "start";
  className?: string;
  description?: string;
  descriptionClassName?: string;
  /** Retained for call-site compatibility; decorative section labels are not rendered. */
  eyebrow?: string;
  title: string;
  titleClassName?: string;
};

export function SectionHeading({
  align = "start",
  className,
  description,
  descriptionClassName,
  title,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto items-center text-center" : "items-start text-start",
        className
      )}
    >
      <h2
        className={clsx(
          "balanced-title section-heading site-heading max-w-full text-foreground",
          titleClassName
        )}
      >
        {trimDisplayHeading(title)}
      </h2>
      {description ? (
        <p
          className={clsx(
            "balanced-copy max-w-3xl text-sm sm:text-base",
            descriptionClassName
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
