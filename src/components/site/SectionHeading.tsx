import clsx from "clsx";

type SectionHeadingProps = {
  align?: "center" | "start";
  className?: string;
  description?: string;
  descriptionClassName?: string;
  eyebrow?: string;
  title: string;
  titleClassName?: string;
};

export function SectionHeading({
  align = "start",
  className,
  description,
  descriptionClassName,
  eyebrow,
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
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2
        className={clsx(
          "balanced-title section-heading site-heading max-w-full text-foreground",
          titleClassName
        )}
      >
        {title}
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
