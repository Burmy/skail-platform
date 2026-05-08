import { Skeleton } from '@/components/ui/skeleton'

export default function CollectionLoading() {
  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col">
      <div className="flex items-center gap-1 border-b bg-sidebar/40 px-3 py-1.5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-32" />
      </div>
      <main className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-7 w-full" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </main>
    </div>
  )
}
