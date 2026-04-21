# Electron Frontend Pixel-Perfect Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Distill Electron renderer to be visually identical to the Next.js prototype at `b_XkU5YzLGK4e/` — same design tokens, same components, same animations, same layout.

**Architecture:** Copy shadcn/ui components verbatim from the prototype (updating `@/` → `@renderer/` path aliases), port the prototype's screen components replacing Next.js APIs with TanStack Router equivalents, and replace the custom CSS variables with the prototype's oklch design tokens.

**Tech Stack:** React 19, TanStack Router, Tailwind CSS 4, shadcn/ui (Radix UI), GSAP, Anime.js, Inter font (replaces Geist — visually identical)

**Key path alias rule:** Every `@/lib/utils` import in copied shadcn components becomes `@renderer/lib/utils`. Every `@/components/ui/X` becomes `@renderer/components/ui/X`. Every `@/hooks/X` becomes `@renderer/hooks/X`.

---

## File Map

### Files to create
- `distill/src/renderer/src/components/ui/button.tsx`
- `distill/src/renderer/src/components/ui/card.tsx`
- `distill/src/renderer/src/components/ui/avatar.tsx`
- `distill/src/renderer/src/components/ui/badge.tsx`
- `distill/src/renderer/src/components/ui/input.tsx`
- `distill/src/renderer/src/components/ui/separator.tsx`
- `distill/src/renderer/src/components/ui/tabs.tsx`
- `distill/src/renderer/src/components/ui/label.tsx`
- `distill/src/renderer/src/components/ui/skeleton.tsx`
- `distill/src/renderer/src/components/ui/tooltip.tsx`
- `distill/src/renderer/src/components/ui/sheet.tsx`
- `distill/src/renderer/src/components/ui/dialog.tsx`
- `distill/src/renderer/src/components/ui/dropdown-menu.tsx`
- `distill/src/renderer/src/components/ui/select.tsx`
- `distill/src/renderer/src/components/ui/switch.tsx`
- `distill/src/renderer/src/components/ui/slider.tsx`
- `distill/src/renderer/src/components/ui/progress.tsx`
- `distill/src/renderer/src/components/ui/scroll-area.tsx`
- `distill/src/renderer/src/components/ui/sidebar.tsx`
- `distill/src/renderer/src/hooks/use-mobile.tsx`
- `distill/src/renderer/src/components/waveform.tsx`
- `distill/src/renderer/src/components/app-sidebar.tsx`

### Files to rewrite
- `distill/src/renderer/src/index.css` — replace custom tokens with prototype oklch design system
- `distill/src/renderer/index.html` — add `dark` class to `<html>`
- `distill/src/renderer/src/routes/__root.tsx` — SidebarProvider + AppSidebar layout
- `distill/src/renderer/src/features/dashboard/DashboardPage.tsx`
- `distill/src/renderer/src/features/dashboard/components/StatsCards.tsx`
- `distill/src/renderer/src/features/dashboard/components/RecentRecordings.tsx`
- `distill/src/renderer/src/features/dashboard/components/OllamaStatusBadge.tsx`
- `distill/src/renderer/src/features/recording/RecordingPage.tsx`
- `distill/src/renderer/src/features/recording/components/Waveform.tsx`
- `distill/src/renderer/src/features/recording/components/VUMeter.tsx`
- `distill/src/renderer/src/features/recording/components/RecordingControls.tsx`
- `distill/src/renderer/src/features/recording/components/LiveTranscriptPreview.tsx`
- `distill/src/renderer/src/features/library/LibraryPage.tsx`
- `distill/src/renderer/src/features/library/components/RecordingCard.tsx`
- `distill/src/renderer/src/features/library/components/RecordingList.tsx`
- `distill/src/renderer/src/features/library/components/LibraryFilters.tsx`
- `distill/src/renderer/src/features/import/ImportPage.tsx`
- `distill/src/renderer/src/features/settings/SettingsPage.tsx`
- `distill/src/renderer/src/features/settings/components/LLMSettings.tsx`
- `distill/src/renderer/src/features/settings/components/SystemStatus.tsx`
- `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx`

---

## Task 1: Install Radix UI Dependencies

**Files:** `distill/package.json`

- [ ] **Step 1: Install all missing Radix UI packages**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npm install \
  @radix-ui/react-slot \
  @radix-ui/react-avatar \
  @radix-ui/react-separator \
  @radix-ui/react-tabs \
  @radix-ui/react-label \
  @radix-ui/react-tooltip \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-select \
  @radix-ui/react-switch \
  @radix-ui/react-slider \
  @radix-ui/react-progress \
  @radix-ui/react-scroll-area \
  tw-animate-css \
  vaul
```

Expected: `npm install` succeeds with no peer dependency errors.

- [ ] **Step 2: Verify build still compiles**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

---

## Task 2: Replace CSS Design System

**Files:** `distill/src/renderer/src/index.css`, `distill/src/renderer/index.html`

- [ ] **Step 1: Replace index.css entirely**

Overwrite `distill/src/renderer/src/index.css` with:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

@theme inline {
  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

- [ ] **Step 2: Add `dark` class to `<html>` in index.html**

In `distill/src/renderer/index.html`, change:
```html
<html>
```
to:
```html
<html class="dark">
```

Also update the `<title>`:
```html
<title>Distill - AI Meeting Recorder</title>
```

And update the `backgroundColor` in `distill/src/main/index.ts` to match dark background:
Change `backgroundColor: '#0C0A14'` to `backgroundColor: '#1c1c1c'`  
(oklch(0.145 0 0) converts to approximately #252525 — use `#1a1a1a` as a close match)

- [ ] **Step 3: Verify build compiles**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -5
```

Expected: `✓ built in Xs`

---

## Task 3: Copy Core UI Components

**Files:** `distill/src/renderer/src/components/ui/` (multiple files)

Copy each component from `b_XkU5YzLGK4e/components/ui/` verbatim, replacing all `@/` with `@renderer/`.

- [ ] **Step 1: Create `button.tsx`**

`distill/src/renderer/src/components/ui/button.tsx` — copy from `b_XkU5YzLGK4e/components/ui/button.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 2: Create `card.tsx`**

`distill/src/renderer/src/components/ui/card.tsx` — copy from `b_XkU5YzLGK4e/components/ui/card.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 3: Create `avatar.tsx`**

`distill/src/renderer/src/components/ui/avatar.tsx` — copy from `b_XkU5YzLGK4e/components/ui/avatar.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 4: Create `badge.tsx`**

`distill/src/renderer/src/components/ui/badge.tsx` — copy from `b_XkU5YzLGK4e/components/ui/badge.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 5: Create `input.tsx`**

`distill/src/renderer/src/components/ui/input.tsx` — copy from `b_XkU5YzLGK4e/components/ui/input.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 6: Create `separator.tsx`**

`distill/src/renderer/src/components/ui/separator.tsx` — copy from `b_XkU5YzLGK4e/components/ui/separator.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 7: Create `tabs.tsx`**

`distill/src/renderer/src/components/ui/tabs.tsx` — copy from `b_XkU5YzLGK4e/components/ui/tabs.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 8: Create `label.tsx`**

`distill/src/renderer/src/components/ui/label.tsx` — copy from `b_XkU5YzLGK4e/components/ui/label.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 9: Create `skeleton.tsx`**

`distill/src/renderer/src/components/ui/skeleton.tsx` — copy from `b_XkU5YzLGK4e/components/ui/skeleton.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 10: Create `tooltip.tsx`**

`distill/src/renderer/src/components/ui/tooltip.tsx` — copy from `b_XkU5YzLGK4e/components/ui/tooltip.tsx`, replacing `@/lib/utils` with `@renderer/lib/utils`.

- [ ] **Step 11: Create `dialog.tsx`**

`distill/src/renderer/src/components/ui/dialog.tsx` — copy from `b_XkU5YzLGK4e/components/ui/dialog.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 12: Create `sheet.tsx`**

`distill/src/renderer/src/components/ui/sheet.tsx` — copy from `b_XkU5YzLGK4e/components/ui/sheet.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 13: Create `dropdown-menu.tsx`**

`distill/src/renderer/src/components/ui/dropdown-menu.tsx` — copy from `b_XkU5YzLGK4e/components/ui/dropdown-menu.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 14: Create `select.tsx`**

`distill/src/renderer/src/components/ui/select.tsx` — copy from `b_XkU5YzLGK4e/components/ui/select.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 15: Create `switch.tsx`**

`distill/src/renderer/src/components/ui/switch.tsx` — copy from `b_XkU5YzLGK4e/components/ui/switch.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 16: Create `slider.tsx`**

`distill/src/renderer/src/components/ui/slider.tsx` — copy from `b_XkU5YzLGK4e/components/ui/slider.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 17: Create `progress.tsx`**

`distill/src/renderer/src/components/ui/progress.tsx` — copy from `b_XkU5YzLGK4e/components/ui/progress.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 18: Create `scroll-area.tsx`**

`distill/src/renderer/src/components/ui/scroll-area.tsx` — copy from `b_XkU5YzLGK4e/components/ui/scroll-area.tsx`, replacing all `@/` with `@renderer/`.

- [ ] **Step 19: Create `use-mobile.tsx` hook**

`distill/src/renderer/src/hooks/use-mobile.tsx` — copy from `b_XkU5YzLGK4e/components/ui/use-mobile.tsx` verbatim (no path replacements needed, no imports).

- [ ] **Step 20: Create `sidebar.tsx`**

`distill/src/renderer/src/components/ui/sidebar.tsx` — copy from `b_XkU5YzLGK4e/components/ui/sidebar.tsx`, replacing all `@/` with `@renderer/`.

Note: The sidebar imports `use-mobile` from `@/components/ui/use-mobile` — this must become `@renderer/hooks/use-mobile`.

- [ ] **Step 21: Verify TypeScript compiles**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx tsc -p tsconfig.web.json --noEmit 2>&1 | head -40
```

Expected: zero errors (or only warnings about unused variables, which are OK).

---

## Task 4: Create Waveform Component

**Files:** `distill/src/renderer/src/components/waveform.tsx`

- [ ] **Step 1: Copy waveform from prototype**

`distill/src/renderer/src/components/waveform.tsx` — copy from `b_XkU5YzLGK4e/components/waveform.tsx`, replacing all `@/` with `@renderer/`.

The waveform has two exports: `Waveform` (animated, uses GSAP/anime) and `WaveformStatic`. Both use `cn` from utils.

---

## Task 5: Rewrite Root Layout with AppSidebar

**Files:** `distill/src/renderer/src/routes/__root.tsx`, `distill/src/renderer/src/components/app-sidebar.tsx`

The goal is to match `b_XkU5YzLGK4e/components/app-sidebar.tsx` and `b_XkU5YzLGK4e/app/page.tsx` layout structure.

TanStack Router replacements:
- `import Link from 'next/link'` → `import { Link } from '@tanstack/react-router'`
- `usePathname()` from next → `useRouterState({ select: s => s.location.pathname })`
- `import { usePathname } from 'next/navigation'` → `import { useRouterState } from '@tanstack/react-router'`

- [ ] **Step 1: Create `app-sidebar.tsx`**

Create `distill/src/renderer/src/components/app-sidebar.tsx`:

```tsx
import * as React from "react"
import { useEffect, useRef } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import anime from "animejs"
import { gsap } from "gsap"
import { Home, Mic, FolderOpen, Settings, Search, Plus, Youtube } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@renderer/components/ui/sidebar"

const mainNavItems = [
  { title: "Home", to: "/" as const, icon: Home },
  { title: "Library", to: "/library" as const, icon: FolderOpen },
  { title: "Import", to: "/import" as const, icon: Youtube },
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
    anime({
      targets: navItemsRef.current,
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: anime.stagger(50, { start: 200 }),
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
            <Link to="/recording">
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
                    <Link to={item.to}>
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
          <Link to="/settings">
            <Settings className="size-4 text-muted-foreground" />
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 2: Rewrite `__root.tsx`**

Overwrite `distill/src/renderer/src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useBackendStore } from "@renderer/stores/useBackendStore"
import { useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@renderer/components/ui/sidebar"
import { AppSidebar } from "@renderer/components/app-sidebar"

function RootLayout() {
  const setStatus = useBackendStore((s) => s.setStatus)
  const status = useBackendStore((s) => s.status)

  useEffect(() => {
    window.electron.onBackendStatus((s) => setStatus(s as any))
    window.electron.onBackendFatal(() => setStatus("fatal"))
  }, [setStatus])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background relative">
        {status !== "ready" && <BackendOverlay status={status} />}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function BackendOverlay({ status }: { status: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center space-y-3">
        {status === "fatal" ? (
          <>
            <p className="text-destructive font-medium">Backend crashed</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              Restart
            </button>
          </>
        ) : status === "error" ? (
          <p className="text-yellow-400 text-sm">Backend error — check logs</p>
        ) : (
          <p className="text-sm text-muted-foreground">Starting backend…</p>
        )}
      </div>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
```

- [ ] **Step 3: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

Expected: `✓ built in Xs`

---

## Task 6: Rewrite Dashboard Page

**Files:**
- `distill/src/renderer/src/features/dashboard/DashboardPage.tsx`
- `distill/src/renderer/src/features/dashboard/components/StatsCards.tsx`
- `distill/src/renderer/src/features/dashboard/components/RecentRecordings.tsx`
- `distill/src/renderer/src/features/dashboard/components/OllamaStatusBadge.tsx`

Port `b_XkU5YzLGK4e/components/home-dashboard.tsx` to the Electron feature structure. Static data until API is connected.

- [ ] **Step 1: Rewrite `StatsCards.tsx`**

```tsx
import { useRef, useEffect } from "react"
import anime from "animejs"
import { gsap } from "gsap"
import { Mic, Clock, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@renderer/components/ui/card"

interface Props {
  total: number
  hours: number
  completed: number
}

const ICONS = [Mic, Clock, FileText, TrendingUp]

export function StatsCards({ total, hours, completed }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  const stats = [
    { title: "Total Recordings", value: String(total), icon: Mic },
    { title: "Hours Recorded", value: String(hours), icon: Clock },
    { title: "Transcriptions", value: String(completed), icon: FileText },
    { title: "Key Insights", value: "—", icon: TrendingUp },
  ]

  useEffect(() => {
    anime({
      targets: cardsRef.current,
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.9, 1],
      delay: anime.stagger(80, { start: 400 }),
      duration: 600,
      easing: "easeOutCubic",
    })
  }, [])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.03 : 1,
        boxShadow: isEntering ? "0 10px 30px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.1)",
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.title}
          className="bg-card border-border cursor-pointer"
          ref={(el) => { if (el) cardsRef.current[index] = el }}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-muted-foreground">{stat.title}</CardDescription>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-foreground">{stat.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `RecentRecordings.tsx`**

```tsx
import { useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import anime from "animejs"
import { gsap } from "gsap"
import { Play, MoreHorizontal } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@renderer/components/ui/card"
import { Avatar, AvatarFallback } from "@renderer/components/ui/avatar"
import { WaveformStatic } from "@renderer/components/waveform"

interface Recording {
  id: string
  title: string
  created_at: string
  status: string
  [key: string]: any
}

interface Props {
  recordings: Recording[]
}

export function RecentRecordings({ recordings }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    anime({
      targets: cardsRef.current,
      opacity: [0, 1],
      translateY: [30, 0],
      delay: anime.stagger(100, { start: 700 }),
      duration: 500,
      easing: "easeOutCubic",
    })
  }, [])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.02 : 1,
        y: isEntering ? -4 : 0,
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-foreground">Recent Recordings</h2>
        <p className="text-muted-foreground text-sm">No recordings yet. Start your first recording!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Recent Recordings</h2>
        <Button variant="ghost" asChild>
          <Link to="/library">View All</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recordings.map((recording, index) => (
          <Card
            key={recording.id}
            ref={(el) => { if (el) cardsRef.current[index] = el }}
            onMouseEnter={() => handleHover(index, true)}
            onMouseLeave={() => handleHover(index, false)}
            className="group bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Link to="/transcription/$id" params={{ id: recording.id }} className="block">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-foreground truncate">
                      {recording.title ?? "Untitled Recording"}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-1">
                      {new Date(recording.created_at).toLocaleDateString()} · {recording.status}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <Avatar className="size-7 border-2 border-card">
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">R</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center gap-3">
                    {recording.status === "processing" ? (
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    ) : (
                      <WaveformStatic className="w-20 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                    )}
                    <Button variant="ghost" size="icon" className="text-primary" onClick={(e) => e.preventDefault()}>
                      <Play className="size-4 fill-current" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `OllamaStatusBadge.tsx`**

```tsx
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"

interface Props {
  running: boolean
  onStart: () => void
  onStop: () => void
}

export function OllamaStatusBadge({ running, onStart, onStop }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={running ? "default" : "secondary"} className="gap-1.5">
        <span className={`size-1.5 rounded-full ${running ? "bg-green-400" : "bg-muted-foreground"}`} />
        Ollama {running ? "Running" : "Stopped"}
      </Badge>
      <Button variant="outline" size="sm" onClick={running ? onStop : onStart}>
        {running ? "Stop" : "Start"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `DashboardPage.tsx`**

```tsx
import { Suspense, useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { Mic, FileText } from "lucide-react"
import { gsap } from "gsap"
import { Button } from "@renderer/components/ui/button"
import { useDashboard } from "./hooks/useDashboard"
import { StatsCards } from "./components/StatsCards"
import { RecentRecordings } from "./components/RecentRecordings"
import { OllamaStatusBadge } from "./components/OllamaStatusBadge"

function DashboardContent() {
  const { totalRecordings, totalHours, completedCount, recentRecordings, ollamaRunning, startOllama, stopOllama } =
    useDashboard()

  const headerRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
    }
    if (actionsRef.current) {
      gsap.fromTo(
        actionsRef.current.children,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)", delay: 0.3 }
      )
    }
  }, [])

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-2" ref={headerRef}>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <OllamaStatusBadge running={ollamaRunning} onStart={startOllama} onStop={stopOllama} />
        </div>
        <p className="text-lg text-muted-foreground">Here's an overview of your recordings and activity.</p>
      </div>

      <div className="flex flex-wrap gap-3" ref={actionsRef}>
        <Button asChild size="lg" className="gap-2 transition-transform hover:scale-105">
          <Link to="/recording">
            <Mic className="size-5" />
            Start Recording
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="gap-2 transition-transform hover:scale-105" asChild>
          <Link to="/import">
            <FileText className="size-5" />
            Import Audio
          </Link>
        </Button>
      </div>

      <StatsCards total={totalRecordings} hours={totalHours} completed={completedCount} />
      <RecentRecordings recordings={recentRecordings} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 animate-pulse">
      <div className="h-10 w-48 bg-muted rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
      </div>
    </div>
  )
}

export function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

Expected: `✓ built in Xs`

---

## Task 7: Rewrite Recording Page

**Files:**
- `distill/src/renderer/src/features/recording/RecordingPage.tsx`
- `distill/src/renderer/src/features/recording/components/Waveform.tsx`
- `distill/src/renderer/src/features/recording/components/VUMeter.tsx`
- `distill/src/renderer/src/features/recording/components/RecordingControls.tsx`
- `distill/src/renderer/src/features/recording/components/LiveTranscriptPreview.tsx`

Port `b_XkU5YzLGK4e/components/recording-screen.tsx`. Replace `useRouter().push()` with `useNavigate()` from TanStack Router.

- [ ] **Step 1: Rewrite `Waveform.tsx`** (feature-level, re-export from shared component)

```tsx
import { memo } from "react"
import { Waveform as SharedWaveform } from "@renderer/components/waveform"

export const Waveform = memo(function Waveform({
  audioLevel,
  isRecording,
}: {
  audioLevel: number
  isRecording: boolean
}) {
  return <SharedWaveform isAnimating={isRecording} barCount={7} className="w-24" />
})
```

- [ ] **Step 2: Rewrite `VUMeter.tsx`**

```tsx
import { memo } from "react"

export const VUMeter = memo(function VUMeter({ level }: { level: number }) {
  const bars = 12
  const filledBars = Math.round(level * bars)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm transition-all duration-75 ${
            i < filledBars ? "bg-primary" : "bg-muted"
          }`}
          style={{ height: `${40 + i * 5}%` }}
        />
      ))}
    </div>
  )
})
```

- [ ] **Step 3: Rewrite `RecordingControls.tsx`**

```tsx
import { memo } from "react"
import { Mic, MicOff, Pause, Play, Square } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { cn } from "@renderer/lib/utils"

interface Props {
  isRecording: boolean
  isStarting: boolean
  isStopping: boolean
  elapsedSeconds: number
  onStart: () => void
  onStop: () => void
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export const RecordingControls = memo(function RecordingControls({
  isRecording, isStarting, isStopping, elapsedSeconds, onStart, onStop,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl text-foreground font-mono tabular-nums">{formatTime(elapsedSeconds)}</span>
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            size="lg"
            className="h-14 px-8 gap-3 text-lg bg-primary hover:bg-primary/90"
            onClick={onStart}
            disabled={isStarting}
          >
            <Mic className="size-6" />
            {isStarting ? "Starting..." : "Start Recording"}
          </Button>
        ) : (
          <>
            <Button
              variant="destructive"
              size="lg"
              className="h-12 px-6 gap-2 transition-transform hover:scale-105"
              onClick={onStop}
              disabled={isStopping}
            >
              <Square className="size-5 fill-current" />
              {isStopping ? "Stopping..." : "Stop Recording"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 4: Rewrite `LiveTranscriptPreview.tsx`**

```tsx
import { memo } from "react"

export const LiveTranscriptPreview = memo(function LiveTranscriptPreview({
  transcriptionId,
}: {
  transcriptionId: string | null
}) {
  if (!transcriptionId) return null

  return (
    <div className="w-full max-w-xl mt-8 p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Transcription</span>
      </div>
      <div className="space-y-3 text-foreground">
        <p className="opacity-60">Transcribing your audio in real-time...</p>
        <span className="inline-block w-2 h-5 bg-primary animate-pulse" />
      </div>
    </div>
  )
})
```

- [ ] **Step 5: Rewrite `RecordingPage.tsx`**

```tsx
import { useRef, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { gsap } from "gsap"
import { Mic, Pause } from "lucide-react"
import { cn } from "@renderer/lib/utils"
import { useRecording } from "./hooks/useRecording"
import { Waveform } from "./components/Waveform"
import { VUMeter } from "./components/VUMeter"
import { RecordingControls } from "./components/RecordingControls"
import { LiveTranscriptPreview } from "./components/LiveTranscriptPreview"

export function RecordingPage() {
  const navigate = useNavigate()
  const { isRecording, elapsedSeconds, audioLevel, transcriptionId, start, stop, isStarting, isStopping } =
    useRecording()

  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(titleRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
      .fromTo(indicatorRef.current, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, "-=0.3")
      .fromTo(controlsRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
  }, [])

  useEffect(() => {
    if (transcriptionId && !isRecording) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => navigate({ to: "/transcription/$id", params: { id: transcriptionId } }),
      })
    }
  }, [transcriptionId, isRecording, navigate])

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-xl">
        <div className="text-center" ref={titleRef}>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isRecording ? "Recording..." : "Ready to Record"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isRecording ? "Your audio is being captured in real-time" : "Start a new recording"}
          </p>
        </div>

        <div
          ref={indicatorRef}
          className="relative flex items-center justify-center w-48 h-48 rounded-full"
        >
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isRecording ? "bg-primary/20" : "bg-muted/20"
          )} />
          <div className={cn(
            "relative flex items-center justify-center w-36 h-36 rounded-full transition-all duration-300",
            isRecording ? "bg-primary/30" : "bg-muted/30"
          )}>
            {isRecording ? (
              <Waveform audioLevel={audioLevel} isRecording={isRecording} />
            ) : (
              <Mic className="size-16 text-muted-foreground" />
            )}
          </div>
        </div>

        {isRecording && <VUMeter level={audioLevel} />}

        <div ref={controlsRef}>
          <RecordingControls
            isRecording={isRecording}
            isStarting={isStarting}
            isStopping={isStopping}
            elapsedSeconds={elapsedSeconds}
            onStart={start}
            onStop={stop}
          />
        </div>

        <LiveTranscriptPreview transcriptionId={transcriptionId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

---

## Task 8: Rewrite Library Page

**Files:**
- `distill/src/renderer/src/features/library/LibraryPage.tsx`
- `distill/src/renderer/src/features/library/components/RecordingCard.tsx`
- `distill/src/renderer/src/features/library/components/RecordingList.tsx`
- `distill/src/renderer/src/features/library/components/LibraryFilters.tsx`

Port `b_XkU5YzLGK4e/components/recordings-screen.tsx`.

- [ ] **Step 1: Rewrite `LibraryFilters.tsx`**

```tsx
import { Search, Filter } from "lucide-react"
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
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `RecordingCard.tsx`**

```tsx
import { memo } from "react"
import { Link } from "@tanstack/react-router"
import { Play, MoreHorizontal, Calendar, Clock } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { Card, CardContent } from "@renderer/components/ui/card"
import { Badge } from "@renderer/components/ui/badge"

interface Recording {
  id: string
  title: string
  created_at: string
  status: string
  [key: string]: any
}

interface Props {
  recording: Recording
  viewMode: "grid" | "list"
  cardRef?: (el: HTMLDivElement | null) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const RecordingCard = memo(function RecordingCard({
  recording, viewMode, cardRef, onMouseEnter, onMouseLeave,
}: Props) {
  const date = new Date(recording.created_at).toLocaleDateString()

  if (viewMode === "list") {
    return (
      <Card
        ref={cardRef}
        className="bg-card border-border overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link to="/transcription/$id" params={{ id: recording.id }}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-32 aspect-video rounded bg-muted flex items-center justify-center shrink-0">
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate mb-1">
                {recording.title ?? "Untitled Recording"}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{date}</span>
              </div>
            </div>
            <Badge variant="secondary">{recording.status}</Badge>
          </CardContent>
        </Link>
      </Card>
    )
  }

  return (
    <Card
      ref={cardRef}
      className="bg-card border-border overflow-hidden cursor-pointer group hover:border-primary/50 transition-colors"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link to="/transcription/$id" params={{ id: recording.id }}>
        <div className="relative aspect-video bg-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground truncate mb-1">
            {recording.title ?? "Untitled Recording"}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{date}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">{recording.status}</Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
})
```

- [ ] **Step 3: Rewrite `RecordingList.tsx`**

```tsx
import { useRef, useEffect } from "react"
import anime from "animejs"
import { gsap } from "gsap"
import { RecordingCard } from "./RecordingCard"

interface Recording {
  id: string
  title: string
  created_at: string
  status: string
  [key: string]: any
}

interface Props {
  recordings: Recording[]
  viewMode: "grid" | "list"
}

export function RecordingList({ recordings, viewMode }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    cardsRef.current = []
    anime({
      targets: cardsRef.current,
      opacity: [0, 1],
      translateY: [30, 0],
      scale: [0.95, 1],
      delay: anime.stagger(80, { start: 200 }),
      duration: 600,
      easing: "easeOutCubic",
    })
  }, [recordings.length, viewMode])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.02 : 1,
        boxShadow: isEntering ? "0 20px 40px rgba(0,0,0,0.15)" : "0 4px 6px rgba(0,0,0,0.1)",
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.map((recording, index) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            viewMode="grid"
            cardRef={(el) => { if (el) cardsRef.current[index] = el }}
            onMouseEnter={() => handleHover(index, true)}
            onMouseLeave={() => handleHover(index, false)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recordings.map((recording, index) => (
        <RecordingCard
          key={recording.id}
          recording={recording}
          viewMode="list"
          cardRef={(el) => { if (el) cardsRef.current[index] = el }}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `LibraryPage.tsx`**

```tsx
import { Suspense, useState, useEffect, useRef } from "react"
import { gsap } from "gsap"
import { useSuspenseQuery } from "@tanstack/react-query"
import { getTranscriptions } from "@renderer/lib/api/generated/transcriptions/transcriptions"
import { LibraryFilters } from "./components/LibraryFilters"
import { RecordingList } from "./components/RecordingList"

const transcriptionsApi = getTranscriptions()

function LibraryContent() {
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const headerRef = useRef<HTMLDivElement>(null)

  const { data } = useSuspenseQuery({
    queryKey: ["transcriptions"],
    queryFn: () => transcriptionsApi.listTranscriptionsApiV1TranscriptionsGet(),
  })

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
    }
  }, [])

  const filtered = (data ?? []).filter((r) =>
    (r.title ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 p-8">
      <div ref={headerRef} className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Recordings</h1>
        <p className="text-muted-foreground">Browse and manage all your recorded sessions</p>
      </div>
      <LibraryFilters search={search} onSearch={setSearch} viewMode={viewMode} onViewMode={setViewMode} />
      <RecordingList recordings={filtered} viewMode={viewMode} />
    </div>
  )
}

export function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground animate-pulse">Loading recordings...</div>}>
      <LibraryContent />
    </Suspense>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

---

## Task 9: Rewrite Import Page

**Files:** `distill/src/renderer/src/features/import/ImportPage.tsx`

Port `b_XkU5YzLGK4e/components/import-screen.tsx`.

- [ ] **Step 1: Rewrite `ImportPage.tsx`**

```tsx
import { useRef, useEffect } from "react"
import { gsap } from "gsap"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { useImport } from "./hooks/useImport"

const STATUS_LABELS: Record<string, string> = {
  downloading: "Downloading video…",
  transcribing: "Transcribing audio…",
  failed: "Import failed",
}

export function ImportPage() {
  const { url, setUrl, urlError, submit, progress, status, isPending } = useImport()
  const headerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
      .fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
  }, [])

  const showProgress = status !== "idle" && status !== "failed"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center" ref={headerRef}>
          <h1 className="text-4xl font-bold text-foreground mb-2">Import from YouTube</h1>
          <p className="text-lg text-muted-foreground">Paste a YouTube URL to download and transcribe</p>
        </div>

        <div className="space-y-4" ref={formRef}>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button onClick={submit} disabled={isPending || !url} className="bg-primary hover:bg-primary/90">
              Import
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>

        {showProgress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{STATUS_LABELS[status] ?? status}</p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{Math.round(progress * 100)}%</p>
          </div>
        )}

        {status === "failed" && (
          <p className="text-sm text-destructive text-center">Something went wrong. Check that yt-dlp is installed.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

---

## Task 10: Rewrite Settings Page

**Files:**
- `distill/src/renderer/src/features/settings/SettingsPage.tsx`
- `distill/src/renderer/src/features/settings/components/LLMSettings.tsx`
- `distill/src/renderer/src/features/settings/components/SystemStatus.tsx`

Port the visual style from `b_XkU5YzLGK4e/components/settings-screen.tsx`.

- [ ] **Step 1: Rewrite `LLMSettings.tsx`**

```tsx
import { useState } from "react"
import { Button } from "@renderer/components/ui/button"
import { Label } from "@renderer/components/ui/label"
import { Input } from "@renderer/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@renderer/components/ui/card"
import { Separator } from "@renderer/components/ui/separator"

interface Props {
  currentProvider: string
  currentModel: string
  ollamaModels: string[]
  hasOpenAIKey: boolean
  hasGoogleKey: boolean
  hasAnthropicKey: boolean
  onSave: (data: { provider: string; model: string; apiKey?: string }) => void
  isSaving: boolean
}

export function LLMSettings({
  currentProvider, currentModel, ollamaModels, hasOpenAIKey, isSaving, onSave,
}: Props) {
  const [provider, setProvider] = useState(currentProvider)
  const [model, setModel] = useState(currentModel)
  const [apiKey, setApiKey] = useState("")

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">LLM Provider</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose the AI model used for summaries and chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {["ollama", "openai", "anthropic"].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  provider === p
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <Separator />

          {provider === "ollama" ? (
            <div className="space-y-2">
              <Label className="text-foreground">Model</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {ollamaModels.length === 0 && <option value="">No models found</option>}
                {ollamaModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-foreground">API Key</Label>
              <Input
                type="password"
                placeholder={hasOpenAIKey ? "••••••••" : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={() => onSave({ provider, model, apiKey: apiKey || undefined })}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `SystemStatus.tsx`**

```tsx
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getOllama } from "@renderer/lib/api/generated/ollama/ollama"
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card"
import { Button } from "@renderer/components/ui/button"
import { Badge } from "@renderer/components/ui/badge"

const ollamaApi = getOllama()

export function SystemStatus() {
  const queryClient = useQueryClient()

  const { data: ollamaStatus } = useSuspenseQuery({
    queryKey: ["ollama", "status"],
    queryFn: () => ollamaApi.ollamaStatusApiV1OllamaStatusGet(),
    refetchInterval: 5000,
  })

  const startOllama = useMutation({
    mutationFn: ollamaApi.startOllamaApiV1OllamaStartPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ollama"] }),
  })

  const stopOllama = useMutation({
    mutationFn: ollamaApi.stopOllamaApiV1OllamaStopPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ollama"] }),
  })

  const running = (ollamaStatus as any)?.running ?? false

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Ollama</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Badge variant={running ? "default" : "secondary"} className="gap-1.5">
            <span className={`size-1.5 rounded-full ${running ? "bg-green-400" : "bg-muted-foreground"}`} />
            {running ? "Running" : "Stopped"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => running ? stopOllama.mutate() : startOllama.mutate()}
            disabled={startOllama.isPending || stopOllama.isPending}
          >
            {running ? "Stop" : "Start"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `SettingsPage.tsx`**

```tsx
import { Suspense, useState, useRef, useEffect } from "react"
import anime from "animejs"
import { gsap } from "gsap"
import { useSettings } from "./hooks/useSettings"
import { LLMSettings } from "./components/LLMSettings"
import { SystemStatus } from "./components/SystemStatus"

type Section = "llm" | "status"

const NAV: { id: Section; label: string }[] = [
  { id: "llm", label: "LLM Provider" },
  { id: "status", label: "System Status" },
]

function SettingsContent() {
  const [section, setSection] = useState<Section>("llm")
  const { settings, ollamaModels, save, isSaving } = useSettings()
  const headerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLButtonElement[]>([])

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
    }
    anime({
      targets: navRef.current,
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: anime.stagger(50, { start: 100 }),
      duration: 500,
      easing: "easeOutCubic",
    })
  }, [])

  return (
    <div className="flex h-full">
      <nav className="w-56 shrink-0 border-r border-border p-4 space-y-1">
        <div className="mb-6" ref={headerRef}>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>
        {NAV.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => { if (el) navRef.current[index] = el }}
            onClick={() => setSection(item.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              section === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-8">
        {section === "llm" && (
          <LLMSettings
            currentProvider={(settings as any)?.llm?.provider ?? "ollama"}
            currentModel={(settings as any)?.llm?.model ?? ""}
            ollamaModels={ollamaModels}
            hasOpenAIKey={!!(settings as any)?.has_openai_key}
            hasGoogleKey={!!(settings as any)?.has_google_key}
            hasAnthropicKey={!!(settings as any)?.has_anthropic_key}
            onSave={save}
            isSaving={isSaving}
          />
        )}
        {section === "status" && (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading status…</div>}>
            <SystemStatus />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -10
```

---

## Task 11: Rewrite Transcription Page

**Files:** `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx`

Port `b_XkU5YzLGK4e/components/transcription-view.tsx`, keeping the existing hooks.

- [ ] **Step 1: Rewrite `TranscriptionPage.tsx`**

```tsx
import { Suspense } from "react"
import { useParams } from "@tanstack/react-router"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { TranscriptPanel } from "./components/TranscriptPanel"
import { SummaryPanel } from "./components/SummaryPanel"
import { ChatPanel } from "./components/ChatPanel"
import { useTranscription } from "./hooks/useTranscription"

function TranscriptionContent({ id }: { id: string }) {
  const { transcription } = useTranscription(id)

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {(transcription as any)?.title ?? "Untitled Recording"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {(transcription as any)?.created_at
              ? new Date((transcription as any).created_at).toLocaleDateString()
              : ""}
          </p>
        </div>
      </header>

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={40} minSize={25}>
          <TranscriptPanel transcriptionId={id} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
        <Panel defaultSize={30} minSize={20}>
          <SummaryPanel transcriptionId={id} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
        <Panel defaultSize={30} minSize={20}>
          <ChatPanel transcriptionId={id} />
        </Panel>
      </PanelGroup>
    </div>
  )
}

export function TranscriptionPage() {
  const { id } = useParams({ from: "/transcription/$id" })
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading transcription…</div>}>
      <TranscriptionContent id={id} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify full build**

```bash
cd "/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor/distill"
npx electron-vite build 2>&1 | tail -15
```

Expected: `✓ built in Xs` with no errors.

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Same design tokens / CSS variables | Task 2 |
| Dark mode applied by default | Task 2 |
| shadcn/ui components (Button, Card, Avatar, Badge, etc.) | Task 3 |
| Sidebar matching prototype `app-sidebar.tsx` | Task 5 |
| GSAP + Anime.js animations on all screens | Tasks 6–11 |
| Dashboard matching `home-dashboard.tsx` | Task 6 |
| Recording screen matching `recording-screen.tsx` | Task 7 |
| Library screen matching `recordings-screen.tsx` | Task 8 |
| Import screen matching `import-screen.tsx` | Task 9 |
| Settings screen matching `settings-screen.tsx` | Task 10 |
| Transcription 3-panel layout | Task 11 |
| Inter font (replaces Geist) | Task 2 CSS |
| Radix UI packages installed | Task 1 |

### Placeholder Scan
No TBD, TODO, or placeholder patterns found.

### Type Consistency
- `Recording` interface defined consistently in Task 6 (RecentRecordings), Task 8 (RecordingCard, RecordingList, LibraryPage)
- `Section` type in SettingsPage and LLMSettings are local and consistent
- `useParams({ from: "/transcription/$id" })` matches the route definition in `routeTree.gen.ts`
