function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export function PublicRouteSkeleton() {
  return (
    <div className="section-shell" aria-busy="true">
      <div className="container-shell"><div className="content-shell space-y-8">
        <Skeleton className="h-[25rem] rounded-[2rem]" />
        <Skeleton className="h-8 w-48 rounded-full" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-[23rem] rounded-[1.5rem]" />)}
        </div>
      </div></div>
    </div>
  );
}

export function AdminRouteSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="space-y-3"><Skeleton className="h-4 w-28 rounded" /><Skeleton className="h-10 w-64 max-w-full rounded" /><Skeleton className="h-5 w-96 max-w-full rounded" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-32 rounded-[1rem]" />)}</div>
      <Skeleton className="h-12 w-full rounded-[1rem]" />
      <div className="overflow-hidden rounded-[1rem] border border-white/8"><Skeleton className="h-12 w-full" />{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="m-4 h-8 rounded" />)}</div>
    </div>
  );
}
