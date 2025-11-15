# Displacement Formula Documentation

## Version: 2.0
**Last Updated:** 2025-11-11
**Framework:** Three-Tier Energy Services Analysis

---

## Overview

This document provides the **precise mathematical definition** of fossil fuel displacement, clean energy growth metrics, and edge case handling used in the Global Energy Services Tracker.

---

## Core Definitions

### 1. Annual Change Calculations

For any given year `t` and previous year `t-1`:

```python
# Primary Energy Changes
ΔPrimary_Fossil(t) = Primary_Fossil(t) - Primary_Fossil(t-1)
ΔPrimary_Clean(t) = Primary_Clean(t) - Primary_Clean(t-1)
ΔPrimary_Total(t) = Primary_Total(t) - Primary_Total(t-1)

# Useful Energy Changes
ΔUseful_Fossil(t) = Useful_Fossil(t) - Useful_Fossil(t-1)
ΔUseful_Clean(t) = Useful_Clean(t) - Useful_Clean(t-1)
ΔUseful_Total(t) = Useful_Total(t) - Useful_Total(t-1)

# Energy Services Changes
ΔServices_Fossil(t) = Services_Fossil(t) - Services_Fossil(t-1)
ΔServices_Clean(t) = Services_Clean(t) - Services_Clean(t-1)
ΔServices_Total(t) = Services_Total(t) - Services_Total(t-1)
```

---

## 2. Displacement Formula (Primary Definition)

**Displacement** is the amount of fossil fuel growth that was **prevented** by clean energy growth.

### Formula (Useful Energy Basis):

```python
Displacement(t) = max(0, ΔUseful_Clean(t))
```

**Interpretation:**
- When clean energy grows (`ΔUseful_Clean > 0`), it displaces potential fossil fuel demand
- When clean energy shrinks (`ΔUseful_Clean < 0`), there is **zero displacement**
- Units: Exajoules (EJ) per year

### Alternative Formulation (Services Basis):

```python
Displacement_Services(t) = max(0, ΔServices_Clean(t))
```

**Use Case:** Services basis accounts for exergy quality and provides a more accurate measure of actual service displacement (e.g., electricity-to-electricity, heat-to-heat).

---

## 3. Fossil Fuel Growth (FF_growth)

**FF_growth** measures the share of total energy demand growth that was met by fossil fuels.

### Formula:

```python
if ΔUseful_Total(t) > 0:
    FF_growth(t) = (ΔUseful_Fossil(t) / ΔUseful_Total(t)) × 100%
else:
    FF_growth(t) = NaN  # Undefined during recession/contraction
```

**Interpretation:**
- `FF_growth = 100%`: All energy growth came from fossil fuels (clean energy stagnant)
- `FF_growth = 50%`: Fossil fuels met half of growth, clean energy met the other half
- `FF_growth = 0%`: All energy growth came from clean energy (no fossil growth)
- `FF_growth < 0%`: Fossil fuels declined while total demand grew (clean energy growing faster than total demand)

**Example:**
```
ΔUseful_Total = 10 EJ
ΔUseful_Fossil = 7 EJ
ΔUseful_Clean = 3 EJ

FF_growth = (7 / 10) × 100% = 70%
```

---

## 4. Net Change in Fossil Fuels

**Net Change** is the absolute change in fossil fuel consumption.

### Formula:

```python
NetChange_Fossil(t) = ΔUseful_Fossil(t)
```

**Relationship to Displacement:**

```python
NetChange_Fossil = ΔUseful_Fossil - Displacement

# Expanded:
NetChange_Fossil = ΔUseful_Fossil - max(0, ΔUseful_Clean)
```

**Interpretation:**
- `NetChange > 0`: Fossil fuels increased (despite clean growth)
- `NetChange = 0`: Fossil fuels flat (clean growth exactly offset fossil demand growth)
- `NetChange < 0`: Fossil fuels decreased (clean growth exceeded fossil demand growth)

---

## 5. Displacement Rate

**Displacement Rate** measures how much clean energy growth offsets fossil fuel growth.

### Formula:

```python
if ΔUseful_Clean(t) > 0 and ΔUseful_Fossil(t) > 0:
    DisplacementRate(t) = (ΔUseful_Clean(t) / ΔUseful_Fossil(t)) × 100%
elif ΔUseful_Clean(t) > 0 and ΔUseful_Fossil(t) <= 0:
    DisplacementRate(t) = 100%  # Clean growing while fossil declining
else:
    DisplacementRate(t) = 0%
```

**Interpretation:**
- `DisplacementRate = 100%`: Clean growth equals fossil growth (1:1 displacement)
- `DisplacementRate = 50%`: Clean growth is half of fossil growth (0.5:1 displacement)
- `DisplacementRate > 100%`: Clean growth exceeds fossil growth (fossil fuels declining)

---

## Edge Cases and Special Scenarios

### Edge Case 1: Recession / Demand Contraction

**Scenario:** `ΔUseful_Total < 0` (total energy demand decreased)

**Handling:**
```python
if ΔUseful_Total(t) < 0:
    FF_growth(t) = NaN  # Undefined

    # Still calculate displacement
    Displacement(t) = max(0, ΔUseful_Clean(t))

    # Net change still valid
    NetChange_Fossil(t) = ΔUseful_Fossil(t)
```

**Interpretation:** During recessions, FF_growth is meaningless (negative denominator). However, displacement and net change remain valid metrics.

**Examples:**
- **2008 Financial Crisis:** Total demand fell 1%, fossil fell 2%, clean grew 0.5% → Displacement = 0.5 EJ
- **2020 COVID-19:** Total demand fell 4%, fossil fell 5%, clean grew 1% → Displacement = 1 EJ

---

### Edge Case 2: Clean Energy Decline

**Scenario:** `ΔUseful_Clean < 0` (clean energy decreased)

**Handling:**
```python
Displacement(t) = max(0, ΔUseful_Clean(t)) = 0
```

**Interpretation:** No displacement when clean energy shrinks. All fossil growth is "unmitigated."

**Example:**
- **Drought Year (Hydro Collapse):** Hydro falls 5 EJ, wind/solar grow 2 EJ → Net clean: -3 EJ → Displacement = 0

---

### Edge Case 3: Both Fossil and Clean Decline

**Scenario:** `ΔUseful_Fossil < 0` and `ΔUseful_Clean < 0`

**Handling:**
```python
Displacement(t) = 0  # max(0, negative) = 0
NetChange_Fossil(t) = ΔUseful_Fossil  # Still negative
```

**Interpretation:** Both energy systems contracting (global recession or efficiency revolution).

---

### Edge Case 4: Zero Total Energy Growth

**Scenario:** `ΔUseful_Total = 0` (stagnant demand)

**Handling:**
```python
if ΔUseful_Total(t) == 0:
    FF_growth(t) = NaN  # Division by zero

    # If clean grew, fossil must have declined by same amount
    if ΔUseful_Clean(t) > 0:
        NetChange_Fossil(t) = -ΔUseful_Clean(t)
```

**Interpretation:** In a zero-growth scenario, clean gains are 100% displacement (fossil must decline).

---

### Edge Case 5: Fossil Decline While Total Growth Positive

**Scenario:** `ΔUseful_Total > 0` but `ΔUseful_Fossil < 0`

**Handling:**
```python
FF_growth(t) = (ΔUseful_Fossil / ΔUseful_Total) × 100%
# Result will be NEGATIVE (e.g., -50%)

Displacement(t) = ΔUseful_Clean  # Positive
```

**Interpretation:** This is the **ideal scenario** — fossil fuels are declining while total demand grows. FF_growth < 0% indicates clean energy is **more than meeting** demand growth.

**Example:**
```
ΔUseful_Total = +10 EJ
ΔUseful_Fossil = -5 EJ (declining!)
ΔUseful_Clean = +15 EJ

FF_growth = (-5 / 10) × 100% = -50%
Displacement = 15 EJ
```

---

## Data Quality and Validation

### Consistency Checks

All calculations must satisfy:

```python
# Energy conservation
ΔUseful_Total = ΔUseful_Fossil + ΔUseful_Clean

# Displacement bounds
0 ≤ Displacement ≤ ΔUseful_Clean (if ΔUseful_Clean > 0)

# FF_growth bounds (when defined)
if ΔUseful_Total > 0:
    -∞ < FF_growth < +∞  # Can be negative or >100%
```

### Missing Data Handling

```python
# If previous year data missing
if year == 1965 or previous_year_data is None:
    Displacement(1965) = NaN
    FF_growth(1965) = NaN
    NetChange_Fossil(1965) = NaN
```

---

## Implementation in Code

### Python Implementation (calculate_ff_growth.py)

```python
def calculate_displacement_metrics(current_year, previous_year):
    """
    Calculate displacement, FF_growth, and net change metrics.

    Returns:
        dict with keys: displacement, ff_growth, net_change, displacement_rate
    """
    # Calculate deltas
    delta_fossil = current_year['fossil_useful_ej'] - previous_year['fossil_useful_ej']
    delta_clean = current_year['clean_useful_ej'] - previous_year['clean_useful_ej']
    delta_total = current_year['total_useful_ej'] - previous_year['total_useful_ej']

    # Displacement (always calculable)
    displacement = max(0, delta_clean)

    # FF_growth (only valid when total growth > 0)
    if delta_total > 0:
        ff_growth_pct = (delta_fossil / delta_total) * 100
    else:
        ff_growth_pct = None  # NaN during contraction

    # Net change (always calculable)
    net_change = delta_fossil

    # Displacement rate
    if delta_clean > 0 and delta_fossil > 0:
        displacement_rate = (delta_clean / delta_fossil) * 100
    elif delta_clean > 0 and delta_fossil <= 0:
        displacement_rate = 100.0  # Clean growing, fossil declining
    else:
        displacement_rate = 0.0

    return {
        'displacement': displacement,
        'ff_growth_percent': ff_growth_pct,
        'net_change_fossil': net_change,
        'displacement_rate_percent': displacement_rate,
        'delta_fossil': delta_fossil,
        'delta_clean': delta_clean,
        'delta_total': delta_total
    }
```

### JavaScript Implementation (DisplacementTracker.jsx)

```javascript
// Calculate displacement metrics for visualization
const fossilGrowthValue = currentYear.fossil_useful_ej - previousYear.fossil_useful_ej;
const cleanGrowth = currentYear.clean_useful_ej - previousYear.clean_useful_ej;
const totalGrowth = currentYear.total_useful_ej - previousYear.total_useful_ej;

// Displacement (max of zero and clean growth)
const displacementValue = Math.max(0, cleanGrowth);

// FF_growth (only when total growth positive)
let ffGrowthPercent = null;
if (totalGrowth > 0) {
  ffGrowthPercent = (fossilGrowthValue / totalGrowth) * 100;
}

// Net change
const netChangeValue = fossilGrowthValue;
```

---

## Historical Data Validation

### Test Cases (Based on Actual Historical Years)

#### Test 1: Normal Growth Year (2010)
```
Previous (2009):
  Fossil: 180 EJ, Clean: 35 EJ, Total: 215 EJ

Current (2010):
  Fossil: 185 EJ, Clean: 37 EJ, Total: 222 EJ

Calculations:
  ΔFossil = +5 EJ
  ΔClean = +2 EJ
  ΔTotal = +7 EJ

  Displacement = max(0, 2) = 2 EJ ✓
  FF_growth = (5 / 7) × 100% = 71.4% ✓
  NetChange = +5 EJ ✓
```

#### Test 2: Recession Year (2020, COVID-19)
```
Previous (2019):
  Fossil: 195 EJ, Clean: 42 EJ, Total: 237 EJ

Current (2020):
  Fossil: 187 EJ, Clean: 43 EJ, Total: 230 EJ

Calculations:
  ΔFossil = -8 EJ
  ΔClean = +1 EJ
  ΔTotal = -7 EJ (RECESSION)

  Displacement = max(0, 1) = 1 EJ ✓
  FF_growth = NaN (ΔTotal < 0) ✓
  NetChange = -8 EJ ✓
```

#### Test 3: Ideal Scenario (Hypothetical 2030)
```
Previous (2029):
  Fossil: 180 EJ, Clean: 80 EJ, Total: 260 EJ

Current (2030):
  Fossil: 175 EJ, Clean: 90 EJ, Total: 265 EJ

Calculations:
  ΔFossil = -5 EJ (DECLINING!)
  ΔClean = +10 EJ
  ΔTotal = +5 EJ

  Displacement = max(0, 10) = 10 EJ ✓
  FF_growth = (-5 / 5) × 100% = -100% ✓ (negative FF_growth!)
  NetChange = -5 EJ ✓

Interpretation: Clean energy is growing fast enough to both meet all demand growth AND reduce fossil fuels. This is the goal scenario.
```

---

## Reporting and Visualization

### Dashboard Metrics

1. **Annual Displacement** (EJ/year)
   - Bar chart showing displacement vs. fossil growth each year
   - Color: Green for displacement, Red for unmitigated fossil growth

2. **FF_growth Trend** (%)
   - Line chart from 1965-2024
   - Target: FF_growth → 0% (clean meets all growth)
   - Goal: FF_growth < 0% (fossil decline)

3. **Cumulative Displacement** (EJ)
   - Area chart showing total fossil fuels avoided since 1965
   - Formula: `Σ Displacement(t)` for all years

4. **Displacement Rate** (%)
   - Gauge showing current clean/fossil displacement ratio
   - 100% = clean growth equals fossil growth (benchmark)

---

## Comparison: Useful Energy vs. Services

### Why Two Metrics?

**Useful Energy Displacement:**
- Based on energy content (EJ)
- Does not account for thermodynamic quality
- Example: 1 EJ oil (30% useful) vs 1 EJ wind (70% useful)

**Services Displacement:**
- Based on exergy-weighted energy (thermodynamic quality)
- Accounts for end-use suitability
- Example: 1 EJ electricity (exergy 1.0) vs 1 EJ low-temp heat (exergy 0.2)

**Recommendation:** Use **Services basis** for policy analysis (more accurate), **Useful Energy basis** for historical consistency and benchmarking.

---

## Changelog

### v2.0 (2025-11-11)
- Added exergy-weighted services displacement formula
- Documented edge cases (recession, clean decline, fossil decline)
- Added historical test cases
- Clarified FF_growth handling for negative growth scenarios

### v1.0 (2024-01-15)
- Initial displacement formula documentation
- Basic useful energy calculations

---

## References

1. IEA World Energy Outlook 2024 - Displacement methodology
2. RMI Energy Analysis 2024 - Fossil fuel growth metrics
3. Brockway et al. 2019 - Energy services exergy chains framework
4. LLNL Energy Flow Charts - Sankey diagram methodology

---

**Document Maintained By:** Global Energy Services Tracker Project
**For Questions:** See DATA_AND_ASSUMPTIONS.md Section 8: Displacement Calculations
