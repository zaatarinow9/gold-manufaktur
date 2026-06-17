import { AdminCard } from "./AdminCard";

type AdminAccessDeniedProps = {
  description: string;
  title: string;
};

export function AdminAccessDenied({
  description,
  title,
}: AdminAccessDeniedProps) {
  return <AdminCard title={title} description={description} />;
}
