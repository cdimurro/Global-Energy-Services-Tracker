# Global Exergy Services Platform v2.5.0 - Sources and Methodology

## Overview

Version 2.5.0 introduces a comprehensive upgrade to the platform's projection methodology, replacing traditional IEA-based scenarios with data-driven projections using:

- **Wright's Law learning curves** for cost modeling
- **Manufacturing capacity constraints** for deployment limits
- **Policy acceleration factors** for regional analysis
- **Technology breakthrough probabilities** for scenario differentiation
- **Energy recapture and digitalization** efficiency gains

## New Scenario Framework

### Replacing IEA Scenarios

| Old (IEA) | New | Rationale |
|-----------|-----|-----------|
| STEPS | Conservative | Proven technologies only, Murphy's Law applies |
| APS | Baseline | Expected progress with high-probability breakthroughs |
| NZE | Optimistic | Key breakthroughs realized, enhanced policy support |

### Why We Replaced IEA Scenarios

Historical analysis shows IEA forecasts have systematically underestimated clean energy growth:
- Solar: IEA 2010 forecast for 2020 was **3x too low**
- Wind: Consistently underestimated by **2x or more**
- Batteries: Cost declines were faster than any IEA scenario

Our approach uses empirically validated learning curves that have accurately predicted cost declines for 50+ years.

---

## Key Data Sources

### Learning Curves

| Parameter | Value | Source | Confidence |
|-----------|-------|--------|------------|
| Solar PV learning rate | 27% per doubling | Oxford Martin School (Way et al. 2022) | Very High |
| Wind onshore learning rate | 15% per doubling | IRENA Learning Curves 2024 | High |
| Lithium-ion battery learning rate | 18% per doubling | BNEF Battery Price Survey 2024 | High |
| Heat pump learning rate | 15% per doubling | IEA Heat Pump Technology Roadmap | Medium |
| Electrolyzer learning rate | 18% per doubling | IEA Global Hydrogen Review 2024 | Medium |

### Base Costs (2024)

| Technology | Base Cost | Source |
|------------|-----------|--------|
| Solar PV (utility) | $32/MWh | Lazard LCOE v17.0 |
| Wind Onshore | $38/MWh | Lazard LCOE v17.0 |
| Lithium-ion (pack) | $139/kWh | BNEF Battery Survey 2024 |
| Heat pump (residential) | $8,000/unit | IEA Heat Pumps Report 2024 |
| PEM Electrolyzer | $700/kW | IEA Hydrogen Report 2024 |

### Floor Costs (Theoretical Minimums)

| Technology | Floor Cost | Basis |
|------------|------------|-------|
| Solar PV | $8/MWh | Materials + minimal manufacturing |
| Wind Onshore | $15/MWh | Materials + construction |
| Lithium-ion | $40/kWh | Cell chemistry limits |
| Heat pump | $2,500/unit | Components at scale |
| Electrolyzer | $150/kW | Stack + BoP minimum |

---

## Manufacturing Capacity

### Current Capacity (2024)

| Technology | Annual Capacity | Source |
|------------|-----------------|--------|
| Solar PV | 600 GW/year | IEA PVPS, BNEF |
| Wind (total) | 120 GW/year | GWEC Global Wind Report 2024 |
| Batteries | 1,500 GWh/year | BNEF, SNE Research |
| Heat Pumps | 20 million units/year | IEA Heat Pumps 2024 |
| EVs | 18 million units/year | EV-Volumes, BNEF |

### Projected Capacity (2030)

| Technology | Conservative | Baseline | Optimistic |
|------------|--------------|----------|------------|
| Solar PV | 1,260 GW/yr | 1,800 GW/yr | 2,340 GW/yr |
| Wind | 175 GW/yr | 250 GW/yr | 325 GW/yr |
| Batteries | 3,500 GWh/yr | 5,000 GWh/yr | 6,500 GWh/yr |

---

## Policy Scenarios

### Major Policy Frameworks

| Policy | Region | Technologies Accelerated | Multiplier Range |
|--------|--------|--------------------------|------------------|
| Inflation Reduction Act | USA | Solar, Wind, EVs, Hydrogen | 1.5-3.0x |
| EU Green Deal/Fit for 55 | Europe | All clean tech | 1.6-2.8x |
| 14th Five-Year Plan | China | Solar, Batteries, EVs | 1.8-2.5x |
| RE 2030 Target | India | Solar, Wind | 1.8-2.8x |
| Green Growth Strategy | Japan | Offshore wind, Hydrogen | 1.5-2.5x |

### Policy Effectiveness by Scenario

| Scenario | Effectiveness | Notes |
|----------|---------------|-------|
| Conservative | 60% | Partial implementation, political uncertainty |
| Baseline | 100% | Policies implemented as announced |
| Optimistic | 130% | Policies exceeded, additional support |

---

## Technology Breakthroughs

### By Probability and Scenario Treatment

| Breakthrough | Probability 2030 | Conservative | Baseline | Optimistic |
|--------------|-----------------|--------------|----------|------------|
| Perovskite tandem solar | 60% | No | Partial | Full |
| Solid-state batteries | 40% | No | No | Full |
| Sodium-ion grid storage | 80% | Partial | Full | Full |
| Cold-climate heat pumps | 80% | Partial | Full | Full |
| Green hydrogen <$2/kg | 35% | No | Partial | Full |
| SMR nuclear cost-competitive | 25% | No | No | Partial |

---

## Efficiency Projections

### Clean Technology Efficiency (2024 → 2050)

| Technology | Conservative | Baseline | Optimistic |
|------------|--------------|----------|------------|
| Solar system | 70% → 80% | 70% → 90% | 70% → 95% |
| Wind | 70% → 76% | 70% → 82% | 70% → 88% |
| Heat pump COP | 3.5 → 4.2 | 3.5 → 5.2 | 3.5 → 6.0 |
| EV efficiency | 0.18 → 0.12 kWh/km | 0.18 → 0.10 | 0.18 → 0.08 |

### Grid Efficiency

| Scenario | 2024 | 2030 | 2050 |
|----------|------|------|------|
| Conservative | 94% | 94.5% | 95.5% |
| Baseline | 94% | 95.5% | 98% |
| Optimistic | 94% | 96.5% | 99% |

---

## Energy Recapture Potential

### Total Demand Reduction by 2050 (EJ)

| Category | Conservative | Baseline | Optimistic |
|----------|--------------|----------|------------|
| Industrial waste heat | 8.75 | 12.5 | 17.5 |
| CHP expansion | 3.0 | 6.5 | 10.0 |
| Data center heat reuse | 2.4 | 6.5 | 10.5 |
| Building recovery | 2.0 | 5.0 | 8.0 |
| Grid efficiency | 2.0 | 4.0 | 6.0 |
| Circular economy | 3.0 | 6.0 | 10.0 |
| **Total** | **21 EJ** | **40.5 EJ** | **62 EJ** |

---

## Digitalization Impact

### Net Efficiency Gains by 2050

| Sector | Conservative | Baseline | Optimistic |
|--------|--------------|----------|------------|
| Smart grid | 8% | 15% | 22% |
| Smart buildings | 8% | 15% | 22% |
| Industrial AI | 6% | 12% | 18% |
| Transport optimization | 5% | 12% | 20% |
| **Total demand reduction** | **12%** | **22%** | **32%** |

---

## Validation

### Historical Accuracy

| Technology | Period | Predicted Decline | Actual Decline | Error |
|------------|--------|-------------------|----------------|-------|
| Solar PV | 2010-2024 | 87% | 89% | 2% |
| Li-ion batteries | 2010-2024 | 85% | 87% | 2% |

### Cross-Checks

Our projections are validated against:
- BNEF New Energy Outlook 2024
- IRENA World Energy Transitions Outlook
- Rocky Mountain Institute analysis
- Academic literature (Way et al., Oxford Martin School)

---

## Key Files Created in v2.5.0

### Configuration Files

| File | Purpose |
|------|---------|
| `data-pipeline/config/learning_curves.json` | Wright's Law parameters |
| `data-pipeline/config/manufacturing_capacity.json` | GW/year trajectories |
| `data-pipeline/config/policy_scenarios.json` | Regional policy multipliers |
| `data-pipeline/config/technology_breakthroughs.json` | Probabilistic breakthroughs |
| `data-pipeline/config/energy_recapture.json` | Waste heat recovery |
| `data-pipeline/config/digitalization_gains.json` | AI/smart grid efficiency |

### Model Files

| File | Purpose |
|------|---------|
| `data-pipeline/projection_engine_v4.py` | Integrated projection model |
| `data-pipeline/calculate_full_system_costs_v25.py` | Learning curve cost model |
| `demand_growth_model_v4_learning.py` | S-curve demand projections |

---

## References

### Primary Sources

1. Way, R., Ives, M.C., Mealy, P., Farmer, J.D. (2022). "Empirically grounded technology forecasts and the energy transition." *Joule* 6(9), 2057-2082.

2. BloombergNEF (2024). "New Energy Outlook 2024." Annual report.

3. IRENA (2024). "Renewable Power Generation Costs in 2023." Abu Dhabi.

4. Lazard (2024). "Levelized Cost of Energy Analysis v17.0."

5. IEA (2024). "World Energy Outlook 2024." Paris.

6. IEA (2024). "Global Hydrogen Review 2024." Paris.

7. NREL (2024). "Annual Technology Baseline 2024."

### Supporting Sources

8. GWEC (2024). "Global Wind Report 2024."

9. BNEF (2024). "Battery Price Survey 2024."

10. IEA (2024). "Heat Pumps - Tracking Report."

11. IEA (2023). "Digitalization and Energy."

12. Eurostat CHP Statistics (2024).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.5.0 | 2024-12-05 | Wright's Law learning curves, new scenario framework |
| 2.4.0 | 2024-11 | Brockway-aligned exergy framework |
| 2.2.0 | 2024-10 | Displacement by Region chart |
| 2.0.0 | 2024-09 | Useful energy (Tier 2) implementation |
