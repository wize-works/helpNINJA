# Filter Button Component Guide

This guide provides comprehensive documentation for implementing the helpNINJA filter button component across different dashboard pages. This component offers a consistent, user-friendly interface for applying and managing filters in table views.

## Overview

The filter button component found in the Conversations page provides a reusable pattern for filtering data in dashboard pages. It offers:

- A collapsible filter panel
- URL-based state persistence (filters remain when page is refreshed)
- Debounced search input to prevent excessive API calls
- Visual indicator for active filters
- Responsive design
- Clear/Reset functionality

![Filter Button Screenshot](../images/filter-button-example.png)

## Implementation Guide

### 1. Component Structure

The filter component consists of two main parts:
1. A trigger button with filter count badge
2. A dropdown panel with filter controls

### 2. Required Files

To implement this pattern, you'll need:

1. A client-side component file for the filter controls (e.g., `filter-controls.tsx`)
2. Appropriate server-side query functions that accept filter parameters
3. Type definitions for your filters

### 3. Basic Usage

Here's how to implement the filter button in your page:

#### Step 1: Define Filter Types

```typescript
// Define your filter interface based on your specific filtering needs
interface Filters {
    status?: string;       // Example: 'active' | 'pending' | 'completed'
    dateRange?: string;    // Example: '24h' | '7d' | '30d'
    search?: string;       // Text search field
    category?: string;     // Any categorical filter
}
```

#### Step 2: Create Filter Controls Component

Create a new file called `filter-controls.tsx` in your page directory:

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

// Import your filter interface or define it here
interface Filters {
    status?: string;
    dateRange?: string;
    search?: string;
    category?: string;
}

// Optional: Category options type
interface CategoryOption { 
    id: string;
    name: string;
}

// Debounce hook for search inputs
function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function FilterControls({ 
    filters, 
    categories = [] 
}: { 
    filters: Filters; 
    categories?: CategoryOption[] 
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [local, setLocal] = useState<Filters>(filters);
    const debouncedSearch = useDebounced(local.search);

    // Push changes when debounced search changes
    useEffect(() => {
        applyFilters({ ...local, search: debouncedSearch });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    function applyFilters(next: Filters, replace = true) {
        const params = new URLSearchParams(searchParams?.toString() || '');
        // Update for your specific filter keys
        ['status', 'dateRange', 'search', 'category'].forEach(k => {
            const val = (next as Record<string, string | undefined>)[k];
            if (val) params.set(k, val); else params.delete(k);
        });
        const url = `${pathname}?${params.toString()}`;
        if (replace) router.replace(url); else router.push(url);
    }

    function clearFilters() {
        setLocal({});
        router.replace(pathname);
    }

    // Count active filters for the badge
    const activeFilterCount = ['status', 'dateRange', 'search', 'category']
        .filter(k => filters[k as keyof Filters]).length;

    return (
        <div className="relative">
            <HoverScale scale={1.02}>
                <button 
                    onClick={() => setOpen(o => !o)} 
                    className="flex items-center gap-2 px-4 py-2 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm font-medium transition-all duration-200"
                >
                    <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-[10px] rounded bg-primary text-primary-content">
                            {activeFilterCount}
                        </span>
                    )}
                    <i className={`fa-duotone fa-solid fa-chevron-${open ? 'up' : 'down'} text-[10px] opacity-70`} />
                </button>
            </HoverScale>
            {open && (
                <div className="absolute right-0 mt-2 w-80 z-20">
                    <div className="card bg-base-100 rounded-2xl shadow-lg border border-base-300/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Filter Items</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            {/* Search input with debounce */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Search</label>
                                <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="Search term..."
                                    value={local.search || ''}
                                    onChange={e => setLocal(l => ({ ...l, search: e.target.value || undefined }))}
                                />
                            </div>
                            
                            {/* Status dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Status</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.status || ''}
                                    onChange={e => setLocal(l => ({ ...l, status: e.target.value || undefined }))}
                                >
                                    <option value="">Any status</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            
                            {/* Date range buttons */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Time Range</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['24h', '7d', '30d'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setLocal(l => ({ 
                                                ...l, 
                                                dateRange: l.dateRange === r ? undefined : r 
                                            }))}
                                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                                local.dateRange === r 
                                                    ? 'bg-primary text-primary-content border-primary' 
                                                    : 'border-base-300/40 bg-base-200/60 hover:bg-base-200'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Category dropdown */}
                            {categories.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Category</label>
                                    <select
                                        className="select select-sm select-bordered w-full"
                                        value={local.category || ''}
                                        onChange={e => setLocal(l => ({ ...l, category: e.target.value || undefined }))}
                                    >
                                        <option value="">All categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {/* Action buttons - REQUIRED: Always include both Apply and Reset buttons */}
                        <div className="flex items-center justify-between pt-2 gap-2">
                            <button
                                onClick={() => { applyFilters(local, false); setOpen(false); }}
                                className="btn btn-primary btn-sm rounded-lg flex-1"
                            >
                                Apply
                            </button>
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm rounded-lg flex-1"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

#### Step 3: Server Component Implementation

In your page.tsx file, integrate the filter controls:

```tsx
import { Suspense } from "react";
import FilterControls from "./filter-controls";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

interface Filters {
    status?: string;
    dateRange?: string;
    search?: string;
    category?: string;
}

// This function builds SQL conditions based on filters
function buildConditions(tenantId: string, filters: Filters) {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    // Add conditions based on filters
    if (filters.status) {
        conditions.push(`status = $${idx}`);
        params.push(filters.status);
        idx++;
    }
    
    if (filters.search) {
        conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
        params.push(`%${filters.search}%`);
        idx++;
    }
    
    if (filters.dateRange) {
        const map: Record<string, string> = {
            '24h': "NOW() - INTERVAL '24 hours'",
            '7d': "NOW() - INTERVAL '7 days'",
            '30d': "NOW() - INTERVAL '30 days'"
        };
        if (map[filters.dateRange]) {
            conditions.push(`created_at >= ${map[filters.dateRange]}`);
        }
    }
    
    if (filters.category) {
        conditions.push(`category_id = $${idx}`);
        params.push(filters.category);
        idx++;
    }
    
    return { where: conditions.join(' AND '), params };
}

// Fetch data function with filter support
async function fetchData(tenantId: string, filters: Filters) {
    const { where, params } = buildConditions(tenantId, filters);
    
    // Your database query goes here
    const { rows } = await query(
        `SELECT * FROM your_table WHERE ${where} ORDER BY created_at DESC LIMIT 100`,
        params
    );
    
    return rows;
}

// Fetch categories for the dropdown
async function fetchCategories(tenantId: string) {
    const { rows } = await query(
        `SELECT id, name FROM categories WHERE tenant_id = $1 ORDER BY name`,
        [tenantId]
    );
    return rows;
}

export default async function YourPage({ searchParams }) {
    // Parse filters from URL search params
    const filters: Filters = {
        status: typeof searchParams.status === 'string' ? searchParams.status : undefined,
        dateRange: typeof searchParams.dateRange === 'string' ? searchParams.dateRange : undefined,
        search: typeof searchParams.search === 'string' ? searchParams.search : undefined,
        category: typeof searchParams.category === 'string' ? searchParams.category : undefined
    };
    
    const tenantId = await getTenantIdStrict();
    const categories = await fetchCategories(tenantId);

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Header with filter controls */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Your Page Title</h1>
                                <p className="text-base-content/60 mt-2">
                                    Page description here
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={filters} categories={categories} />
                                {/* Additional action buttons can go here */}
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={<LoadingSkeleton />}>
                    <YourPageContent tenantId={tenantId} filters={filters} />
                </Suspense>
            </div>
        </AnimatedPage>
    );
}

// Separate component for filtered content (keeps page loading efficient)
async function YourPageContent({ tenantId, filters }) {
    const data = await fetchData(tenantId, filters);
    
    return (
        <div>
            {/* Render your filtered data here */}
            {/* ... */}
        </div>
    );
}
```

## Customization Guide

### Adding New Filter Types

To add new filter types:

1. Update your `Filters` interface with the new filter property
2. Add the appropriate UI control in the `filter-controls.tsx` component
3. Add the new filter key to the `applyFilters` function's array of keys to process
4. Update the server-side `buildConditions` function to handle the new filter type
5. Include the new filter in your page's `searchParams` parsing logic

### Example: Adding a Date Range Picker

To replace the simple date range buttons with a more complex date range picker:

```tsx
// In filter-controls.tsx
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Update your Filters interface
interface Filters {
    // ...existing filters
    startDate?: string; // ISO date string
    endDate?: string;   // ISO date string
}

// Inside your component
<div className="space-y-1">
    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Date Range</label>
    <DateRangePicker 
        startDate={local.startDate ? new Date(local.startDate) : undefined}
        endDate={local.endDate ? new Date(local.endDate) : undefined}
        onChange={({ startDate, endDate }) => {
            setLocal(l => ({
                ...l,
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString()
            }));
        }}
    />
</div>

// Update applyFilters function
function applyFilters(next: Filters, replace = true) {
    const params = new URLSearchParams(searchParams?.toString() || '');
    // Add your new filter keys
    ['status', 'dateRange', 'search', 'category', 'startDate', 'endDate'].forEach(k => {
        // ...existing logic
    });
    // ...rest of the function
}
```

### Styling Variations

You can customize the appearance of the filter button:

#### Compact Version

```tsx
<button 
    onClick={() => setOpen(o => !o)} 
    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 transition-all"
    title="Filters"
>
    <i className="fa-duotone fa-solid fa-filter" aria-hidden />
    {activeFilterCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-content text-xs">
            {activeFilterCount}
        </span>
    )}
</button>
```

#### Pill Style

```tsx
<button 
    onClick={() => setOpen(o => !o)} 
    className="flex items-center gap-2 px-4 py-1.5 bg-base-100 hover:bg-base-200 border border-base-300/40 rounded-full text-sm font-medium transition-all"
>
    <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
</button>
```

## Best Practices

1. **Performance**
   - Always use debounced search to prevent excessive API calls
   - Split your page into a container and content component for Suspense boundaries
   - Consider server-side pagination when filter results could be large

2. **UX Considerations**
   - Show visual feedback when filters are active
   - ALWAYS include BOTH "Apply" and "Reset" buttons at the bottom of the filter panel
   - Position the dropdown appropriately (usually right-aligned for desktop)
   - Ensure the filter panel has appropriate z-index to appear above other content

3. **Accessibility**
   - Include proper ARIA labels and roles
   - Ensure keyboard navigation works (tab order, escape to close)
   - Maintain color contrast for filter indicators

4. **Maintainability**
   - Use TypeScript interfaces to document filter structures
   - Keep filter logic separate from rendering logic
   - Reuse the same component across similar pages
   - Document available filter options in comments

## Advanced Usage

### Support for Multiple Selected Values

For filters that accept multiple values (e.g., multi-select):

```tsx
// Updated Filters interface
interface Filters {
    // ...other filters
    categories?: string[]; // Array of selected category IDs
}

// In the component
<div className="space-y-1">
    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Categories</label>
    <MultiSelect 
        options={categories.map(c => ({ value: c.id, label: c.name }))}
        selected={local.categories || []}
        onChange={selected => setLocal(l => ({ ...l, categories: selected }))}
    />
</div>

// Modify applyFilters
function applyFilters(next: Filters, replace = true) {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Handle regular single-value filters
    ['status', 'search', 'dateRange'].forEach(k => {
        const val = (next as Record<string, string | undefined>)[k];
        if (val) params.set(k, val); else params.delete(k);
    });
    
    // Handle multi-select filters
    if (next.categories?.length) {
        // Join multiple values with commas
        params.set('categories', next.categories.join(','));
    } else {
        params.delete('categories');
    }
    
    const url = `${pathname}?${params.toString()}`;
    if (replace) router.replace(url); else router.push(url);
}

// In your page component, parse the comma-separated values
const filters: Filters = {
    // ...other filters
    categories: searchParams.categories?.split(',') 
}

// In your buildConditions function
if (filters.categories?.length) {
    conditions.push(`category_id = ANY($${idx})`);
    params.push(filters.categories);
    idx++;
}
```

### Adding Filter Presets

For common filter combinations:

```tsx
// Presets in your filter component
const presets = [
    { name: 'Recent Activity', filters: { dateRange: '24h' } },
    { name: 'Pending Items', filters: { status: 'pending' } },
    { name: 'Critical Issues', filters: { priority: 'high', status: 'open' } },
];

// Add preset buttons to the filter panel
<div className="space-y-1 pt-2 border-t border-base-300/40">
    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Presets</label>
    <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
            <button
                key={preset.name}
                onClick={() => {
                    setLocal(preset.filters);
                    applyFilters(preset.filters, false);
                    setOpen(false);
                }}
                className="text-xs px-2 py-1 rounded-lg bg-base-200/80 hover:bg-base-200 transition-colors"
            >
                {preset.name}
            </button>
        ))}
    </div>
</div>
```

## Troubleshooting

### Common Issues

1. **Filters not updating URL**:
   - Check that your filter keys match between the component and page
   - Ensure `applyFilters` function includes all filter keys

2. **Search debounce not working**:
   - Verify that the useEffect dependency array includes `debouncedSearch`
   - Check that the debounce hook is properly implemented

3. **Filter panel appearing behind other elements**:
   - Add higher z-index to the filter dropdown container
   - Ensure parent containers don't have `overflow: hidden`

4. **Filter counts incorrect**:
   - Check the logic that calculates active filter count
   - Ensure it's considering all your filter keys

## Conclusion

The filter button pattern provides a consistent, reusable way to add filtering capabilities to any dashboard page. By following this guide, you can implement and customize this component across your application, improving user experience and maintaining code consistency.

When implementing filters on new pages, remember to:

1. Define your specific filter interface
2. Customize the filter controls to match your data needs
3. Update the server-side query building to handle your filters
4. Consider adding any domain-specific presets or additional filter types

For more examples, refer to the existing implementation in `src/app/dashboard/conversations/filter-controls.tsx`.
