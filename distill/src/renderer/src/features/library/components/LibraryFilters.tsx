import { Search, Filter, Grid3X3, List } from "lucide-react"
import { Input } from "@renderer/components/ui/input"
import { Button } from "@renderer/components/ui/button"
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
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      <Tabs value={viewMode} onValueChange={(v) => onViewMode(v as "grid" | "list")}>
        <TabsList>
          <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
          <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
