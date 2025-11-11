# Mobile Optimization Challenges - Global Energy Tracker

## Executive Summary

The Global Energy Tracker website is fully functional and optimized for desktop viewing (1024px+). However, we are experiencing significant rendering and layout issues when attempting to optimize the site for mobile devices, particularly for screen widths below 640px down to our target minimum of 350px horizontal width.

**Critical Issue**: Charts are completely disappearing below 640px width despite multiple optimization attempts.

---

## Current Status

### What's Working ✓
- **Desktop Version (768px+)**: Fully functional, properly formatted, all charts displaying correctly
- **Navigation**: Hamburger menu successfully implemented for mobile devices
- **Responsive Text**: Progressive text scaling implemented across all breakpoints
- **Touch Targets**: Buttons optimized for mobile tap interactions

### What's Broken ✗
- **Charts Below 640px**: All Recharts components (LineChart, AreaChart, BarChart, PieChart) fail to render
- **Text/Label Overlap**: Chart legends and labels extending beyond viewport boundaries
- **Inconsistent Behavior**: Charts that should be visible are rendering as blank spaces

---

## Technical Architecture

### Technology Stack
- **Framework**: React 18.3 with Vite 5.4.11
- **UI Library**: Tailwind CSS 3.4
- **Charts**: Recharts 2.12 (ResponsiveContainer, LineChart, AreaChart, BarChart, PieChart)
- **Routing**: React Router

### Component Structure
```
src/
├── pages/
│   ├── Home.jsx (3 PieCharts)
│   ├── DisplacementAnalysis.jsx
│   ├── EnergySupply.jsx (AreaChart, LineChart, BarChart)
│   ├── DemandGrowth.jsx (2 LineCharts)
│   └── [other pages]
├── components/
│   ├── InteractiveChart.jsx (main chart component)
│   └── Navigation.jsx (hamburger menu)
└── index.css (global mobile styles)
```

---

## Detailed Problem Analysis

### Problem 1: Charts Disappearing Below 640px

**Symptom**: All Recharts components render as empty white space on mobile viewports

**What We've Tried**:

1. **Fixed Height Approach**
   ```css
   .recharts-responsive-container {
     height: 220px !important;
     min-height: 220px !important;
     max-height: 220px !important;
   }
   ```
   **Result**: Charts still not visible

2. **Auto Height Approach**
   ```css
   .recharts-responsive-container {
     height: auto !important;
   }
   ```
   **Result**: Charts disappeared entirely

3. **Overflow Management**
   ```css
   .recharts-wrapper {
     overflow: hidden !important;
   }
   ```
   **Result**: May be clipping chart content

4. **Component-Level Heights**
   - Home.jsx pie charts: Changed from 300px to 220px
   - InteractiveChart: `window.innerWidth < 640 ? 220 : 700`
   - EnergySupply charts: 220px mobile, 500px desktop
   - DemandGrowth charts: 220px mobile, 400px desktop
   **Result**: Still not rendering on mobile

**Hypothesis**:
- CSS `overflow: hidden` on `.recharts-wrapper` may be clipping the entire chart
- The combination of fixed height + overflow + padding is creating a rendering conflict
- Recharts ResponsiveContainer may not be properly detecting the available space
- Legend positioning with `position: relative` might be causing layout calculation issues

### Problem 2: Legend and Label Overflow

**Symptom**: Chart legends and pie chart labels extend beyond the viewport on small screens

**Examples**:
- Pie chart labels: "Coal: 45.2 EJ (19.7%)" exceeds 320-375px width
- Stacked area chart legends overlap onto chart data
- Legend text wraps unpredictably causing vertical overflow

**What We've Tried**:

1. **Label Simplification**
   ```jsx
   label={window.innerWidth >= 640
     ? (entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ...`
     : (entry) => `${entry.value.toFixed(0)} EJ`
   }
   ```
   **Result**: Reduced but still causes issues

2. **Pie Chart Radius Reduction**
   ```jsx
   outerRadius={window.innerWidth >= 640 ? 120 : window.innerWidth >= 375 ? 60 : 50}
   ```
   **Result**: Helps but labels still overflow

3. **Ultra-Small Legend Fonts**
   ```css
   .recharts-legend-item-text {
     font-size: 6px !important;  /* 640px screens */
     font-size: 5px !important;  /* 414px screens */
   }
   ```
   **Result**: Hard to read, still wrapping issues

4. **Legend Wrapping**
   ```css
   .recharts-default-legend {
     display: flex !important;
     flex-wrap: wrap !important;
     gap: 2px !important;
   }
   ```
   **Result**: Legends wrap but push into sections below

### Problem 3: Padding and Spacing Conflicts

**Symptom**: Too much padding pushes content off-screen; too little causes overlap

**The Dilemma**:
- Charts need space below for legends (60px+ padding-bottom)
- But 60px padding on a 220px container = 27% of height lost to padding
- This pushes the actual chart rendering area too small
- Recharts may refuse to render if calculated space is insufficient

**Iteration History**:
1. Started: `padding-bottom: 60px` → Charts disappeared
2. Reduced: `padding-bottom: 20px` → Charts still not visible
3. Removed padding, added `margin-bottom: 40px` on wrapper → No improvement
4. Current: Minimal padding → Charts still not rendering

### Problem 4: CSS Specificity and !important Overuse

**Issue**: Heavy use of `!important` in mobile styles may be causing unintended side effects

**Example**:
```css
.recharts-responsive-container {
  height: 220px !important;
  min-height: 220px !important;
  max-height: 220px !important;
}

.recharts-wrapper {
  max-width: 100% !important;
  width: 100% !important;
  height: 220px !important;
  overflow: hidden !important;
  margin-bottom: 8px !important;
}
```

**Concern**: Setting both container AND wrapper to fixed heights with `!important` may conflict with Recharts' internal rendering logic

---

## Current CSS Implementation

### Mobile Breakpoints (index.css)

```css
/* Mobile: 640px and below */
@media (max-width: 640px) {
  .recharts-responsive-container {
    height: 220px !important;
    min-height: 220px !important;
    max-height: 220px !important;
  }

  .recharts-wrapper {
    max-width: 100% !important;
    width: 100% !important;
    height: 220px !important;
    overflow: hidden !important;
    margin-bottom: 8px !important;
  }

  .recharts-text { font-size: 7px !important; }
  .recharts-legend-item-text { font-size: 6px !important; }

  .metric-card { @apply p-2; }
  button { @apply text-xs px-2 py-1; }
}

/* Very Small: 414px and below */
@media (max-width: 414px) {
  .recharts-responsive-container {
    height: 200px !important;
  }
  .recharts-wrapper { height: 200px !important; }
  .recharts-text { font-size: 6px !important; }
  .recharts-legend-item-text { font-size: 5px !important; }
}

/* Ultra-Small: 375px and below */
@media (max-width: 375px) {
  .recharts-responsive-container {
    height: 180px !important;
  }
  .recharts-wrapper { height: 180px !important; }
  .recharts-cartesian-axis-tick-value { font-size: 5px !important; }
}
```

---

## Root Cause Hypotheses

### Hypothesis 1: Recharts Rendering Threshold
**Theory**: Recharts may have a minimum rendering space requirement. When the calculated available space (after padding, margins, legends) falls below this threshold, it refuses to render.

**Evidence**:
- Charts work perfectly at 768px+
- Charts disappear completely at 640px and below
- The breakpoint suggests a rendering decision point

### Hypothesis 2: Overflow Hidden Clipping
**Theory**: Setting `overflow: hidden` on `.recharts-wrapper` is clipping the entire chart SVG before it can render.

**Evidence**:
- Charts disappeared when overflow management was added
- SVG rendering might extend slightly beyond calculated bounds
- Hidden overflow would clip it entirely

### Hypothesis 3: Height Calculation Conflict
**Theory**: Setting explicit heights on both ResponsiveContainer AND recharts-wrapper with `!important` creates a conflict with Recharts' internal sizing logic.

**Evidence**:
- ResponsiveContainer is designed to calculate its own size
- Forcing both container and wrapper to same height may prevent proper rendering
- The `!important` flags prevent Recharts from overriding

### Hypothesis 4: Legend Positioning Breaking Layout
**Theory**: Positioning legends with `position: relative` and `margin-top` is disrupting the chart container's height calculations.

**Evidence**:
- Legends were overlapping charts initially
- Added positioning to fix overlap
- Charts stopped rendering after legend positioning changes

### Hypothesis 5: React Re-render Issues
**Theory**: Dynamic `window.innerWidth` checks in component props may cause rendering race conditions.

**Evidence**:
```jsx
<ResponsiveContainer
  height={window.innerWidth < 640 ? 220 : 700}
>
```
- This evaluates at render time
- Window resizing may not trigger proper re-renders
- Recharts may be using stale dimensions

---

## Impact Assessment

### User Experience Impact
- **Mobile Users**: Cannot view any charts below 640px width
- **Accessibility**: Extremely small text (5-7px) is unreadable for many users
- **Functionality**: Core data visualization completely broken on mobile

### Affected Pages
1. **Home.jsx**: 3 pie charts + 1 interactive chart not visible
2. **Energy Supply**: 3 charts (AreaChart, LineChart, BarChart) not visible
3. **Demand Growth**: 2 LineCharts not visible
4. **Displacement Analysis**: Charts in components not visible
5. **All other pages**: Any Recharts components fail to render

### Browser/Device Testing Needed
- iPhone SE (375px width)
- iPhone 12/13/14 (390px width)
- Samsung Galaxy S20 (360px width)
- Minimum target: 350px width

---

## Attempted Solutions Summary

| Approach | Implementation | Result | Why It Failed |
|----------|---------------|--------|---------------|
| Fixed Chart Heights | Set 220px height on mobile | Charts disappeared | Possibly too small for Recharts minimum |
| Auto Heights | `height: auto !important` | Charts disappeared | Lost dimensional constraints |
| Reduced Padding | 60px → 20px → 8px | No improvement | Not the root cause |
| Overflow Management | `overflow: hidden` | Charts disappeared | May be clipping SVG |
| Tiny Text | 7px → 6px → 5px fonts | Unreadable | Doesn't solve rendering issue |
| Radius Reduction | Pie charts 120px → 50px | Helps but incomplete | Labels still overflow |
| Label Simplification | Full text → "XX EJ" | Partial improvement | Doesn't fix chart rendering |
| Dynamic Heights | `window.innerWidth` checks | Inconsistent | May cause re-render issues |

---

## Questions for Investigation

1. **Is there a minimum dimension threshold for Recharts rendering?**
   - What's the smallest ResponsiveContainer that will render?
   - Does it vary by chart type (Pie vs Line vs Bar)?

2. **How does Recharts calculate available space?**
   - Does it account for legends in its calculations?
   - How does it interact with CSS height constraints?

3. **What's the correct way to handle responsive Recharts?**
   - Should we use Tailwind classes or inline styles?
   - Should we avoid `!important` flags?
   - Should ResponsiveContainer be allowed to self-size?

4. **Is overflow:hidden the culprit?**
   - What happens if we remove all overflow constraints?
   - Can we use `overflow-x: hidden, overflow-y: visible` instead?

5. **Are the window.innerWidth checks causing issues?**
   - Should we use CSS media queries exclusively?
   - Do we need useWindowSize hooks with proper debouncing?

6. **Can we simplify the approach?**
   - What if we remove ALL mobile-specific chart CSS?
   - What if we only use Tailwind responsive classes?
   - What if we let Recharts handle everything naturally?

---

## Recommended Next Steps

### Option 1: Strip Back and Rebuild
1. Remove ALL mobile chart CSS from index.css
2. Remove ALL `!important` flags
3. Let Recharts ResponsiveContainer handle sizing naturally
4. Only add Tailwind responsive classes on components
5. Test at each step to identify breaking point

### Option 2: Alternative Chart Library
1. Evaluate lightweight alternatives (Victory, Nivo, Chart.js)
2. Test mobile rendering out-of-the-box
3. Consider if migration is worth the effort

### Option 3: Conditional Mobile Rendering
1. Detect mobile viewport
2. Render simplified chart version (tables, simplified graphs)
3. Provide "View Full Chart" option that opens in modal
4. Trade-off: Functionality vs. Reliability

### Option 4: Increase Minimum Target
1. Accept 480px or 540px as minimum instead of 350px
2. Use larger chart sizes that Recharts can reliably render
3. Add horizontal scroll for sub-480px devices
4. Trade-off: User experience vs. Technical feasibility

---

## Technical Constraints

### Hard Limits
- Recharts library constraints (minimum rendering dimensions)
- SVG rendering requirements in mobile browsers
- CSS specificity and !important interactions
- React re-render behavior with dynamic props

### Business Requirements
- All data must be accessible on mobile
- Charts should be readable without zooming
- No horizontal scrolling
- Support down to 350px width

### Current Conflicts
**These requirements may be mutually exclusive with current technology choices.**

---

## Files Requiring Review

### Primary Files
1. `src/index.css` (lines 48-232) - All mobile chart CSS
2. `src/pages/Home.jsx` (lines 158-323) - Pie chart implementations
3. `src/components/InteractiveChart.jsx` (line 462) - Main chart component
4. `src/pages/EnergySupply.jsx` (lines 304, 379, 453) - Multiple chart types
5. `src/pages/DemandGrowth.jsx` (lines 129, 187) - Line charts

### Secondary Files
- All other page components with charts
- Tailwind config for breakpoint definitions
- Package.json for Recharts version

---

## Conclusion

We have successfully implemented the mobile UI framework (hamburger menu, responsive text, touch targets) but are blocked by a critical chart rendering failure below 640px width. Multiple iterative approaches have failed to resolve the issue, suggesting a fundamental incompatibility between:

1. Recharts rendering requirements
2. Mobile space constraints
3. CSS styling approaches
4. React dynamic sizing patterns

**Recommendation**: We need to either:
- Fundamentally change our approach to mobile chart rendering
- Accept a higher minimum screen width (480px+)
- Consider alternative charting solutions
- Implement mobile-specific simplified visualizations

The current approach of aggressive CSS size reduction is not working and may be fighting against Recharts' internal rendering logic.

---

## Contact for Questions

- Review this document
- Provide guidance on preferred solution path
- Approve any trade-offs between functionality and mobile support
- Consider technical feasibility vs. business requirements

**Last Updated**: 2025-11-10
**Status**: Blocked - Awaiting Direction
