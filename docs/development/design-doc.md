# helpNINJA Design Document

## Overview
helpNINJA is a modern AI-powered customer support widget and dashboard platform, designed to deliver a premium, sophisticated support experience. Built with **Next.js (App Router)**, **TailwindCSS** + **DaisyUI**, **FontAwesome** icons, and **Framer Motion** animations.

The UI follows a sophisticated design system with glassmorphism effects, consistent spacing, and thoughtful micro-interactions that create a premium user experience.

## Design Philosophy
- **Sophisticated Simplicity**: Clean, uncluttered interfaces with purposeful design elements
- **Glassmorphism**: Subtle backdrop blur effects and gradient overlays for modern depth
- **Consistent Spacing**: 6-unit spacing system (gap-6, p-6, etc.) for visual harmony
- **Thoughtful Animations**: Subtle micro-interactions that enhance usability
- **Accessible First**: WCAG 2.1 AA compliance with excellent keyboard navigation

## Visual Design System

### Color Palette & Theming
- **Base System**: DaisyUI semantic colors (`--p`, `--s`, `--a`, `--n`, `--b1`, etc.)
- **Custom Themes**: `ninja-light` and `ninja-dark` with consistent branding
- **Chart Colors**: Theme-aware hex conversion via `src/lib/colors.ts`
- **Accent Colors**: Context-specific colors for different content types

### Typography Hierarchy
```css
/* Page Titles */
text-3xl font-bold text-base-content

/* Section Headers */
text-lg font-semibold text-base-content

/* Body Text */
text-base-content/60 (secondary text)
text-base-content (primary text)

/* Labels & Metadata */
text-sm text-base-content/70 font-semibold tracking-wide uppercase
text-xs text-base-content/50 (metadata)
```

### Card Design Standards
```css
/* Primary Card Style */
bg-base-100 
rounded-2xl 
shadow-sm hover:shadow-md 
transition-all duration-300

/* Accent Border for Themed Cards */
border-primary/20 (or other semantic colors)

/* Inner Padding */
p-6 (consistent across all cards)
```

### Icon System
- **Library**: FontAwesome (fa-duotone fa-solid)
- **Sizes**: `text-xs` (12px), `text-sm` (14px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px)
- **Icon Containers**: `w-12 h-12 rounded-2xl` with semantic background colors
- **Hover Effects**: `group-hover:scale-105 transition-transform duration-200`

### Layout Architecture
- **Page Structure**: `AnimatedPage` wrapper with `StaggerContainer`/`StaggerChild` animations
- **Breadcrumbs**: Consistent navigation breadcrumbs on all pages
- **Header Pattern**: Title + description + stats cards + action buttons
- **Content Sections**: 6-unit vertical spacing between major sections

## Component Standards

### Stat Cards
**Use DaisyUI stat cards for consistent data display across the application.**

#### Standard Stat Card (DaisyUI)
```tsx
// Use StatCard component from @/components/ui/stat-card
import StatCard from '@/components/ui/stat-card';

<StatCard 
    title="Total Sources"
    value={stats.total_sources}
    subtitle={`${stats.ready_count} ready`}
    icon="fa-database"
    color="primary"
/>
```

#### Manual Implementation (when component not suitable)
```tsx
// Standard stat card with icon on left
<div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl">
    <div className="stat bg-base-100 rounded-2xl">
        <div className="stat-title">Title</div>
        <div className="stat-figure">
            <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <i className="fa-duotone fa-solid fa-file-text text-lg text-info" aria-hidden />
            </div>
        </div>
        <div className="stat-value text-info">
            Value
        </div>
        <div className="stat-desc text-base-content/60">
            {/*Description, trend or additional info*/}
        </div>
    </div>
</div>
```

#### Color Guidelines
- **Primary**: Main metrics, totals
- **Success**: Positive states, ready/active items  
- **Warning**: Pending, in-progress states
- **Error**: Failed, suspended, error states
- **Info**: Neutral information, documents
- **Secondary**: Curated content, special features

#### ⚠️ Avoid Custom Stat Cards
**Do not create custom glassmorphism cards for stats.** Use DaisyUI stats for consistency:
```tsx
// ❌ Avoid this pattern
<div className="card bg-base-100 rounded-2xl border border-primary/20">
  <div className="text-2xl font-bold text-base-content tracking-tight">{value}</div>
</div>

// ✅ Use this instead
<StatCard title="Metric" value={value} color="primary" icon="fa-chart-line" />
```

### Navigation & Interactive Elements
```tsx
// Hover scale wrapper for interactive elements
<HoverScale scale={1.02}>
  <button className="btn btn-primary rounded-lg">Action</button>
</HoverScale>

// Focus states (in globals.css)
.btn:focus-visible,
.input:focus-visible,
.select:focus-visible {
  outline: 2px solid hsl(var(--p));
  outline-offset: 2px;
}
```

### Table Design
```tsx
// Modern table styling
<div className="card bg-base-100 rounded-2xl shadow-sm">
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
```

### Form Design System

#### Modern Form Container Pattern
```tsx
// Form wrapper with glassmorphism
<div className="card bg-base-100 rounded-2xl shadow-sm">
  <div className="p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
        <i className="fa-duotone fa-solid fa-form text-lg text-primary" aria-hidden />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-base-content">Form Title</h3>
        <p className="text-base-content/60 text-sm">Form description</p>
      </div>
    </div>
    {/* Form content */}
  </div>
</div>
```

#### Fieldset Grouping (DaisyUI v5 Compliant)
```tsx
// Use fieldset for logical grouping
<fieldset className="space-y-4">
  <legend className="text-base font-semibold text-base-content mb-3">Section Title</legend>
  {/* Related form fields */}
</fieldset>
```

#### Input Field Standards
```tsx
// Standard input with proper labeling
<label className="block">
  <span className="text-sm font-medium text-base-content mb-2 block">
    Field Label
    <span className="text-error ml-1">*</span> {/* Required indicator */}
  </span>
  <input 
    className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
    placeholder="Enter value..."
    required
  />
  <div className="text-xs text-base-content/60 mt-1">
    Helper text or validation info
  </div>
</label>

// Textarea with character count
<label className="block">
  <span className="text-sm font-medium text-base-content mb-2 block">Message</span>
  <textarea 
    className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all duration-200"
    placeholder="Enter your message..."
  />
  <div className="text-xs text-base-content/60 mt-1">
    {value.length}/500 characters
  </div>
</label>
```

#### Select & Toggle Elements
```tsx
// Enhanced select with icons
<label className="block">
  <span className="text-sm font-medium text-base-content mb-2 block">Selection</span>
  <select className="select select-bordered w-full focus:select-primary transition-all duration-200">
    <option value="option1">🙂 Friendly Option</option>
    <option value="option2">💼 Professional Option</option>
  </select>
  <div className="text-xs text-base-content/60 mt-1">Choose your preferred option</div>
</label>

// Toggle with container styling
<label className="block">
  <span className="text-sm font-medium text-base-content mb-2 block">Enable Feature</span>
  <div className="flex items-center gap-3 h-12 px-3 border border-base-300 rounded-lg bg-base-200/50">
    <input type="checkbox" className="toggle toggle-primary toggle-sm" />
    <span className="text-sm font-medium">Feature enabled</span>
  </div>
  <div className="text-xs text-base-content/60 mt-1">Toggle description</div>
</label>
```

#### Error States & Validation
```tsx
// Error input styling
<input className={`input input-bordered w-full ${error ? 'input-error' : 'focus:input-primary'}`} />

// Error message display
{error && (
  <div className="bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <i className="fa-duotone fa-solid fa-triangle-exclamation text-sm text-error" aria-hidden />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-error mb-1">Validation Error</h4>
        <p className="text-sm text-error/80">{error}</p>
      </div>
    </div>
  </div>
)}
```

#### Action Buttons
```tsx
// Primary action button with loading states
<HoverScale scale={1.02}>
  <button
    type="submit"
    className={`btn btn-primary rounded-lg ${loading ? 'loading' : ''} min-w-32`}
    disabled={loading || !isValid}
  >
    {loading ? (
      <>
        <span className="loading loading-spinner loading-sm"></span>
        Processing...
      </>
    ) : (
      <>
        <i className="fa-duotone fa-solid fa-save mr-2" aria-hidden />
        Save Changes
      </>
    )}
  </button>
</HoverScale>
```

#### Form Layout Patterns
```tsx
// Grid layout for form sections
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Form fields */}
</div>

// Action bar with proper spacing
<div className="flex items-center justify-between pt-4 border-t border-base-200/60">
  <div className="text-sm text-base-content/60">
    {/* Status info */}
  </div>
  <div className="flex items-center gap-3">
    {/* Action buttons */}
  </div>
</div>
```

## Animation & Motion

### Page Transitions
```tsx
// Page wrapper for consistent transitions
<AnimatedPage>
  <div className="space-y-8">
    <StaggerContainer>
      <StaggerChild>
        {/* Page content with staggered entry */}
      </StaggerChild>
    </StaggerContainer>
  </div>
</AnimatedPage>
```

### Micro-Interactions
- **Hover Scale**: 1.01-1.05 scale for subtle feedback
- **Transition Duration**: 200-300ms for smooth interactions
- **Stagger Delays**: 50ms increments for sequential animations
- **Loading States**: Skeleton components with consistent styling

### Layout Patterns

#### Page Headers
```tsx
// Standard page header pattern
<StaggerContainer>
  <StaggerChild>
    <div className="flex flex-col gap-6">
      {/* Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-base-content">Page Title</h1>
          <p className="text-base-content/60 mt-2">Page description</p>
        </div>
        <div className="flex items-center gap-3">
          <StatsCard />
          <ActionButton />
        </div>
      </div>
    </div>
  </StaggerChild>
</StaggerContainer>
```

#### Content Grids
```tsx
// Responsive grid patterns
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6  // Max 3 columns
grid grid-cols-1 md:grid-cols-2 gap-6                // 2 columns max
```

#### Mobile Patterns
- **Stacked Layout**: Flex-col on mobile, flex-row on desktop
- **Hidden Elements**: `hidden lg:block` for desktop-only features
- **Responsive Tables**: Transform to cards on mobile with separate components

## Responsive Design Standards

### Breakpoint Strategy
- **Mobile First**: Start with mobile design, enhance for larger screens
- **Breakpoints**: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- **Container**: Use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for page containers

### Mobile Optimizations
```tsx
// Mobile card alternative to desktop table
<div className="lg:hidden">
  <div className="p-4 space-y-4">
    {items.map(item => (
      <MobileCard key={item.id} data={item} />
    ))}
  </div>
</div>

// Desktop table
<div className="hidden lg:block">
  <DesktopTable data={items} />
</div>
```

## Empty States & Error Handling

### Empty State Pattern
```tsx
<FadeIn>
  <div className="card bg-base-100 rounded-2xl shadow-sm">
    <div className="p-12 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <i className="fa-duotone fa-solid fa-icon text-3xl text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-base-content mb-3">No items yet</h3>
      <p className="text-base-content/60 mb-6 max-w-md mx-auto">
        Descriptive text about the empty state
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
        <i className="fa-duotone fa-solid fa-lightbulb text-xs" />
        <span>Helpful tip for getting started</span>
      </div>
    </div>
  </div>
</FadeIn>
```

### Loading States
```tsx
// Use skeleton components for consistent loading
<Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
  <DataTable />
</Suspense>
```

## Chart & Data Visualization

### Chart Styling
- **Colors**: Use `getChartColors()` from `src/lib/colors.ts` for theme consistency
- **Gradients**: Subtle gradients for area charts with 30% opacity at top, 0% at bottom
- **Grid**: `strokeDasharray="3 3"` with theme-aware neutral color at 30% opacity
- **Tooltips**: Custom tooltip component with theme-aware styling

### Chart Containers
```tsx
<div className="card bg-base-100 rounded-2xl shadow-sm">
  <div className="p-6">
    <h3 className="text-lg font-semibold text-base-content mb-4">Chart Title</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {/* Chart component */}
      </ResponsiveContainer>
    </div>
  </div>
</div>
```

## Tech Stack & Implementation

### Core Technologies
- **Frontend**: Next.js 15 (App Router), React Server Components
- **Styling**: TailwindCSS + DaisyUI, FontAwesome Pro icons
- **Animation**: Framer Motion for page transitions and micro-interactions
- **Charts**: Recharts with custom theme integration
- **Backend**: Supabase (PostgreSQL) for DB, API routes in Next.js
- **Payments**: Stripe Checkout + Subscription Plan Gates
- **Integrations**: Slack + Email escalation (modular architecture)
- **Auth**: Supabase Auth with Row Level Security

### File Organization
```
src/
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── animated-page.tsx   # Animation wrappers
│   │   ├── breadcrumb.tsx      # Navigation breadcrumbs
│   │   ├── charts.tsx          # Chart components
│   │   ├── enhanced-table.tsx  # Advanced table component
│   │   └── skeleton.tsx        # Loading states
│   ├── [feature]-[type].tsx    # Feature-specific components
│   └── ...
├── lib/
│   ├── colors.ts              # Theme color utilities
│   └── ...
└── app/
    ├── globals.css            # Global styles & utilities
    └── ...
```

### Theme System
- **Base Colors**: DaisyUI semantic colors (`--p`, `--s`, `--a`, `--n`, `--b1`, etc.)
- **Custom Themes**: `ninja-light` and `ninja-dark` in `src/app/styles/`
- **Color Utilities**: `src/lib/colors.ts` for HSL to Hex conversion
- **Chart Integration**: Theme-aware colors for data visualization

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color Contrast**: All text meets 4.5:1 ratio minimum
- **Focus Management**: Visible focus indicators on all interactive elements
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Readers**: Semantic HTML and ARIA labels throughout

### Implementation Guidelines
```tsx
// ARIA labels for interactive elements
<button aria-label="Delete document" className="btn btn-ghost btn-sm rounded-lg">
  <i className="fa-duotone fa-solid fa-trash" aria-hidden />
</button>

// Focus states in globals.css
.btn:focus-visible {
  outline: 2px solid hsl(var(--p));
  outline-offset: 2px;
}

// Semantic structure
<main role="main">
  <h1>Page Title</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Section Title</h2>
  </section>
</main>
```

## Development Guidelines

### Component Creation Checklist
- [ ] Follow established card styling patterns
- [ ] Include proper TypeScript interfaces
- [ ] Add hover states and micro-interactions
- [ ] Implement responsive design
- [ ] Add loading and empty states
- [ ] Include accessibility attributes
- [ ] Use theme-aware colors
- [ ] Add proper error boundaries

### Design Consistency Rules
1. **Always use `rounded-2xl`** for card corners (never rounded-lg or other variants)
2. **Consistent spacing**: Use `gap-6`, `p-6`, `space-y-8` for major sections
3. **Backdrop blur**: All cards use `backdrop-blur-sm` for glassmorphism effect
4. **Gradient backgrounds**: `bg-gradient-to-br from-base-100/60 to-base-200/40`
5. **Border styling**: `border border-base-200/60` or themed borders like `border-primary/20`
6. **Shadow progression**: `shadow-sm hover:shadow-md transition-all duration-300`
7. **Icon containers**: Always `w-12 h-12 rounded-2xl` with semantic background colors
8. **Typography scale**: Stick to documented text sizes and weights

### Performance Considerations
- **Server Components**: Use server components by default, client only when needed
- **Lazy Loading**: Implement Suspense boundaries for data-heavy components
- **Animation Performance**: Use transform and opacity for animations
- **Bundle Optimization**: Import only needed components and utilities

This design system ensures visual consistency, excellent user experience, and maintainable code across the entire application.
