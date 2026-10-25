import clsx from "clsx";

/** Profile picture, or the person's initials when there is none. */
export function AdminAvatar({ label, size = "sm", url }: { label: string; size?: "sm" | "lg"; url?: string }) {
  const dimensions = size === "lg" ? "h-24 w-24 text-2xl" : "h-9 w-9 text-xs";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={clsx("shrink-0 rounded-full border border-gold/25 object-cover", dimensions)} />
  ) : (
    <span
      aria-hidden="true"
      className={clsx("flex shrink-0 items-center justify-center rounded-full bg-gold/15 font-semibold text-gold-soft", dimensions)}
    >
      {label}
    </span>
  );
}
