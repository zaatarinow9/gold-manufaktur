import clsx from "clsx";

export type AdminButtonVariant = "danger" | "ghost" | "primary" | "secondary";
export type AdminButtonSize = "md" | "sm";

type AdminButtonClassNameOptions = {
  block?: boolean;
  className?: string;
  size?: AdminButtonSize;
  variant?: AdminButtonVariant;
};

const variantClasses: Record<AdminButtonVariant, string> = {
  primary: "admin-button-primary",
  secondary: "admin-button-secondary",
  danger: "admin-button-danger",
  ghost: "admin-button-ghost",
};

const sizeClasses: Record<AdminButtonSize, string> = {
  md: "",
  sm: "admin-button-sm",
};

export function getAdminButtonClassName({
  block,
  className,
  size = "md",
  variant = "secondary",
}: AdminButtonClassNameOptions = {}) {
  return clsx(
    "admin-button",
    variantClasses[variant],
    sizeClasses[size],
    block && "w-full",
    className
  );
}

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  block?: boolean;
  size?: AdminButtonSize;
  variant?: AdminButtonVariant;
};

export function AdminButton({
  block,
  className,
  size,
  type = "button",
  variant,
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={getAdminButtonClassName({ block, className, size, variant })}
      {...props}
    />
  );
}
