import { Search, Grid3X3, List } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"

interface Props {
  search: string
  onSearch: (v: string) => void
  viewMode: "grid" | "list"
  onViewMode: (v: "grid" | "list") => void
}

export function LibraryFilters({ search, onSearch, viewMode, onViewMode }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search recordings…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>
      <Tabs value={viewMode} onValueChange={(v) => onViewMode(v as "grid" | "list")}>
        <TabsList className="h-9">
          <TabsTrigger value="grid" className="px-2.5"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="list" className="px-2.5"><List className="h-4 w-4" /></TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
