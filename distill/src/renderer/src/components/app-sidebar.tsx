import { useEffect, useRef } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { animate, stagger } from "animejs"
import { gsap } from "gsap"
import { Home, Mic, FolderOpen, Settings, Search, Plus, Download } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@renderer/components/ui/sidebar"

const mainNavItems = [
  { title: "Home", to: "/" as const, icon: Home },
  { title: "Library", to: "/library" as const, icon: FolderOpen },
  { title: "Import", to: "/import" as const, icon: Download },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logoRef = useRef<HTMLDivElement>(null)
  const navItemsRef = useRef<HTMLLIElement[]>([])

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.8, rotate: -10 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: "back.out(1.7)" }
      )
    }
    animate(navItemsRef.current, {
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: stagger(50, { start: 200 }),
      duration: 400,
      easing: "easeOutCubic",
    })
  }, [])

  const handleNavHover = (index: number, isEntering: boolean) => {
    const item = navItemsRef.current[index]
    if (item) {
      gsap.to(item, { x: isEntering ? 4 : 0, duration: 0.2, ease: "power2.out" })
    }
  }

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3" ref={logoRef}>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Mic className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl text-foreground font-semibold">Distill</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <div className="px-2 pb-2">
          <Button asChild className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02]">
            <Link to={"/recording" as any}>
              <Plus className="size-4" />
              New Recording
            </Link>
          </Button>
        </div>

        <div className="px-2 pb-4">
          <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
            <Search className="size-4" />
            <span>Search recordings...</span>
          </Button>
        </div>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item, index) => (
                <SidebarMenuItem
                  key={item.title}
                  ref={(el) => { if (el) navItemsRef.current[index] = el }}
                  onMouseEnter={() => handleNavHover(index, true)}
                  onMouseLeave={() => handleNavHover(index, false)}
                >
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.title}>
                    <Link to={item.to as any}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button variant="ghost" size="icon" asChild className="hover:bg-accent transition-colors">
          <Link to={"/settings" as any}>
            <Settings className="size-4 text-muted-foreground" />
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
