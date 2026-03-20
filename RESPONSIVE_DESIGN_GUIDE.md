# DineInGo Responsive Design Implementation Guide

## Quick Start - Apply These Patterns

### 1. Make Layouts Responsive

**Before:**
```tsx
<div style={{ display: "flex", flexDirection: "row" }}>
  <div style={{ flex: 1 }}>Left</div>
  <div style={{ flex: 1 }}>Right</div>
</div>
```

**After:**
```tsx
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>
```

### 2. Make Grids Responsive

**Before:**
```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
```

**After:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

### 3. Make Text Responsive

**Before:**
```tsx
<h1 style={{ fontSize: "4rem" }}>Title</h1>
```

**After:**
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Title</h1>
```

### 4. Make Padding Responsive

**Before:**
```tsx
<div style={{ padding: "40px" }}>
```

**After:**
```tsx
<div className="p-4 md:p-6 lg:p-8">
```

### 5. Make Sidebars Collapsible

**Before:**
```tsx
<aside style={{ width: "256px" }}>
```

**After:**
```tsx
<aside className="hidden md:flex w-64">
  {/* Desktop sidebar */}
</aside>
<button className="md:hidden">Menu</button>
```

### 6. Make Tables Scrollable

**Before:**
```tsx
<table>
```

**After:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full">
</div>
```

### 7. Make Forms Responsive

**Before:**
```tsx
<div style={{ display: "flex", gap: "20px" }}>
  <input />
  <input />
</div>
```

**After:**
```tsx
<div className="flex flex-col md:flex-row gap-4">
  <input className="w-full md:w-1/2" />
  <input className="w-full md:w-1/2" />
</div>
```

### 8. Make Buttons Responsive

**Before:**
```tsx
<button style={{ padding: "12px 28px" }}>
```

**After:**
```tsx
<button className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3">
```

### 9. Make Images Responsive

**Before:**
```tsx
<img src="..." style={{ width: "500px", height: "300px" }} />
```

**After:**
```tsx
<img src="..." className="w-full h-auto max-w-2xl" />
```

### 10. Make Modals Responsive

**Before:**
```tsx
<div style={{ width: "600px", padding: "40px" }}>
```

**After:**
```tsx
<div className="w-full md:w-96 p-4 md:p-6">
```

## Tailwind Responsive Classes Reference

| Class | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| `w-full` | 100% | 100% | 100% |
| `md:w-1/2` | - | 50% | 50% |
| `lg:w-1/3` | - | - | 33% |
| `p-4` | 1rem | 1rem | 1rem |
| `md:p-6` | - | 1.5rem | 1.5rem |
| `text-sm` | 0.875rem | 0.875rem | 0.875rem |
| `md:text-base` | - | 1rem | 1rem |
| `flex-col` | column | column | column |
| `md:flex-row` | - | row | row |
| `hidden` | hidden | hidden | hidden |
| `md:block` | - | block | block |
| `md:hidden` | hidden | hidden | hidden |

## Common Responsive Issues & Fixes

### Issue 1: Text Too Large on Mobile
```tsx
// ❌ Bad
<h1 style={{ fontSize: "4rem" }}>Title</h1>

// ✅ Good
<h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
```

### Issue 2: Overflow on Mobile
```tsx
// ❌ Bad
<div style={{ display: "flex", gap: "20px" }}>
  <div style={{ width: "300px" }}>Item 1</div>
  <div style={{ width: "300px" }}>Item 2</div>
</div>

// ✅ Good
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Item 1</div>
  <div className="w-full md:w-1/2">Item 2</div>
</div>
```

### Issue 3: Fixed Widths
```tsx
// ❌ Bad
<div style={{ width: "1200px" }}>

// ✅ Good
<div className="w-full max-w-6xl">
```

### Issue 4: Padding Too Much
```tsx
// ❌ Bad
<div style={{ padding: "40px" }}>

// ✅ Good
<div className="p-4 md:p-6 lg:p-8">
```

### Issue 5: Sidebar Not Collapsible
```tsx
// ❌ Bad
<aside style={{ width: "256px", position: "fixed" }}>

// ✅ Good
<aside className="hidden md:flex fixed md:relative w-64">
```

## Implementation Checklist

### For Each Page:

- [ ] Make header responsive
- [ ] Make navigation responsive
- [ ] Make content grid responsive
- [ ] Make forms responsive
- [ ] Make buttons responsive
- [ ] Make images responsive
- [ ] Make tables scrollable
- [ ] Test on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1280px)
- [ ] Check touch interactions
- [ ] Check performance

## Mobile-First Development

Always start with mobile styles, then add larger screen styles:

```tsx
// Mobile first (default)
<div className="w-full p-4 text-sm">

// Tablet and up
<div className="w-full p-4 text-sm md:w-1/2 md:p-6 md:text-base">

// Desktop and up
<div className="w-full p-4 text-sm md:w-1/2 md:p-6 md:text-base lg:w-1/3 lg:p-8 lg:text-lg">
```

## Performance Tips

1. **Lazy load images** - Use `loading="lazy"`
2. **Optimize images** - Use WebP format
3. **Minimize CSS** - Use Tailwind purge
4. **Minimize JavaScript** - Code split
5. **Use responsive images** - `srcset` attribute

## Testing Tools

- Chrome DevTools (F12 → Toggle device toolbar)
- Firefox Responsive Design Mode (Ctrl+Shift+M)
- Safari Responsive Design (Develop → Enter Responsive Design Mode)
- BrowserStack for real devices
- Lighthouse for performance

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Mobile-First Approach](https://www.uxpin.com/studio/blog/a-hands-on-guide-to-mobile-first-design/)

---

## Quick Apply Template

Use this template for any page:

```tsx
export default function ResponsivePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsive */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold">Logo</h1>
            <button className="md:hidden">Menu</button>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Grid - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Cards */}
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold mb-2">Card Title</h2>
            <p className="text-sm md:text-base text-gray-600">Card content</p>
          </div>
        </div>
      </main>

      {/* Footer - Responsive */}
      <footer className="bg-gray-900 text-white mt-12 md:mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <p className="text-sm md:text-base">© 2026 DineInGo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
```

---

**Apply these patterns to all pages for full responsiveness!**
