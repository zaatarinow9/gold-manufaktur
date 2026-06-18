import clsx from "clsx";

type PhoneInlineProps = {
  children: React.ReactNode;
  className?: string;
};

export function PhoneInline({ children, className }: PhoneInlineProps) {
  return (
    <span dir="ltr" className={clsx("phone-inline", className)}>
      {children}
    </span>
  );
}
