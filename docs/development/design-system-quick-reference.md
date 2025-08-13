# helpNINJA Design System - Quick Reference

## 🎨 **Card Styling (Copy & Paste)**

### Standard Card
```tsx
className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
```

### Themed Card (with accent)
```tsx
className="card bg-base-100 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-all duration-300"
```

### Card Inner Padding
```tsx
className="p-6"  // Always use p-6 for card content
```

## 📊 **Stat Card Pattern**

```tsx
<div className="card bg-base-100 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-all duration-300 group">
  <div className="p-6">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
        <i className="fa-duotone fa-solid fa-chart-line text-lg text-primary" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-base-content/70 font-semibold tracking-wide uppercase mb-1">Title</div>
        <div className="text-2xl font-bold text-base-content tracking-tight">Value</div>
        {/* Optional trend or additional info */}
      </div>
    </div>
  </div>
</div>
```

## 🔤 **Typography Scale**

```tsx
// Page Titles
className="text-3xl font-bold text-base-content"

// Section Headers  
className="text-lg font-semibold text-base-content"

// Stat Card Titles
className="text-sm text-base-content/70 font-semibold tracking-wide uppercase"

// Stat Card Values
className="text-2xl font-bold text-base-content tracking-tight"

// Body Text
className="text-base-content"           // Primary
className="text-base-content/60"        // Secondary  

// Helper/Meta Text
className="text-xs text-base-content/50"
```

## 🏗️ **Page Structure Template**

```tsx
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default function PageComponent() {
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
    { label: "Current Page", icon: "fa-icon" }
  ];

  return (
    <AnimatedPage>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <StaggerContainer>
          <StaggerChild>
            <Breadcrumb items={breadcrumbItems} />
          </StaggerChild>
        </StaggerContainer>

        {/* Header */}
        <StaggerContainer>
          <StaggerChild>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-base-content">Page Title</h1>
                <p className="text-base-content/60 mt-2">Page description</p>
              </div>
              <div className="flex items-center gap-3">
                <StatsCard />
                <HoverScale scale={1.02}>
                  <button className="btn btn-primary">Action</button>
                </HoverScale>
              </div>
            </div>
          </StaggerChild>
        </StaggerContainer>

        {/* Content Sections */}
        <StaggerContainer>
          <StaggerChild>
            {/* Your content here */}
          </StaggerChild>
        </StaggerContainer>
      </div>
    </AnimatedPage>
  );
}
```

## 📱 **Responsive Grid Patterns**

```tsx
// 3 columns max
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"

// 2 columns max
className="grid grid-cols-1 md:grid-cols-2 gap-6"

// Responsive flexbox
className="flex flex-col lg:flex-row lg:items-center gap-4"
```

## 🎯 **Icon Container Standards**

```tsx
// Standard icon container
className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0"

// Large icon container (for empty states)
className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto"

// Icon sizes
className="text-lg"    // 18px - for stat cards
className="text-xl"    // 20px - for buttons  
className="text-2xl"   // 24px - for large containers
className="text-3xl"   // 30px - for empty states
```

## 📋 **Table Styling**

```tsx
<div className="card bg-base-100 rounded-2xl shadow-sm">
  {/* Desktop Table */}
  <div className="hidden lg:block">
    <table className="w-full">
      <thead className="bg-base-200/20">
        <tr>
          <th className="text-left p-4 text-sm font-semibold text-base-content/80">Header</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-base-200/60">
        <tr className="hover:bg-base-200/30 transition-colors group">
          <td className="p-4">Content</td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Mobile Cards */}
  <div className="lg:hidden p-4 space-y-4">
    {/* Mobile card components */}
  </div>
</div>
```

## 🔄 **Loading & Empty States**

### Loading Skeleton
```tsx
import { TableSkeleton } from "@/components/ui/skeleton";

<Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
  <DataComponent />
</Suspense>
```

### Empty State
```tsx
import { FadeIn } from "@/components/ui/animated-page";

<FadeIn>
  <div className="card bg-base-100 rounded-2xl shadow-sm">
    <div className="p-12 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <i className="fa-duotone fa-solid fa-icon text-3xl text-primary" aria-hidden />
      </div>
      <h3 className="text-xl font-semibold text-base-content mb-3">No items yet</h3>
      <p className="text-base-content/60 mb-6 max-w-md mx-auto">
        Helpful description
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
        <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
        <span>Getting started tip</span>
      </div>
    </div>
  </div>
</FadeIn>
```

## 🎨 **Color Utilities**

```tsx
// For charts and data visualization
import { getChartColors } from '@/lib/colors';

const colors = getChartColors();
// colors.primary, colors.secondary, colors.accent, etc.

// For themed elements
border-primary/20     // 20% opacity primary border
bg-primary/10         // 10% opacity primary background  
text-primary          // Full opacity primary text
```

## ✋ **Interactive Elements**

```tsx
// Hover wrapper for buttons/cards
import { HoverScale } from "@/components/ui/animated-page";

<HoverScale scale={1.02}>
  <button className="btn btn-primary">Click me</button>
</HoverScale>

// Button sizes
className="btn btn-primary"        // Standard
className="btn btn-primary btn-sm" // Small
className="btn btn-outline"        // Secondary
```

## 🚫 **What NOT to Use**

❌ **Avoid these patterns:**
- `rounded-lg` → Use `rounded-2xl` 
- `shadow-lg` → Use `shadow-sm hover:shadow-md`
- `bg-white` → Use `bg-gradient-to-br from-base-100/60 to-base-200/40`
- `p-4` on cards → Use `p-6`
- `gap-4` for major sections → Use `gap-6` or `space-y-8`
- Hard-coded colors → Use semantic DaisyUI colors
- Missing `backdrop-blur-sm` on cards
- Icon containers without `rounded-2xl`

## ✅ **Quick Checklist for New Components**

- [ ] Uses `rounded-2xl` for card corners
- [ ] Includes `backdrop-blur-sm` for glassmorphism
- [ ] Has proper gradient background
- [ ] Uses `p-6` for card padding
- [ ] Icons are in `w-12 h-12 rounded-2xl` containers
- [ ] Includes hover states and transitions
- [ ] Has responsive design considerations
- [ ] Uses semantic color classes
- [ ] Includes proper accessibility attributes
- [ ] Wrapped in animation components when appropriate
