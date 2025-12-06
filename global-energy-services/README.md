# Global Exergy Services Platform v2.5.0

**Live Site:** https://energy-services.vercel.app/

An interactive dashboard showing the **true picture of the global energy system** by tracking **useful energy services** rather than primary energy consumption. Version 2.5 introduces **Wright's Law learning curves** for more accurate energy transition projections.

## What's New in v2.5.0

- **Wright's Law Learning Curves**: Empirically validated cost projections (Solar 27%, Batteries 18%, Wind 15%)
- **New Scenario Framework**: Conservative/Baseline/Optimistic replacing IEA STEPS/APS/NZE
- **Manufacturing Capacity Constraints**: Realistic deployment limits based on GW/year production
- **Technology Breakthroughs**: Probabilistic modeling of perovskite solar, solid-state batteries, etc.
- **Energy Recapture**: Waste heat recovery, CHP expansion, circular economy impacts
- **Digitalization Gains**: Smart grid, AI optimization, building automation efficiency

## Key Features

- **Accurate Data**: Validated against RMI, IEA, Oxford Martin School, and BNEF
- **Real Numbers**: 229.56 EJ of useful energy services globally (2024)
- **Individual Sources**: All 10 energy sources tracked separately
- **Fossil Share**: Currently 81.4% fossil, 18.6% clean
- **Historical Trends**: Data from 1965-2024
- **Future Projections**: 2025-2050 using learning curves
- **Interactive Visualizations**: Explore energy flows and trends

## What is "Useful Energy"?

Most energy statistics show **primary energy** (raw resources). This dashboard shows **useful energy services** - the actual work that powers our lives:

- **Primary Energy**: ~600 EJ (all energy in raw form)
- **Losses**: ~370 EJ lost in conversion
- **Useful Energy**: ~230 EJ (actual services delivered)

## Quick Start

```bash
# Install dependencies
npm install

# Run the data pipeline
cd data-pipeline
python fetch_data.py
python calculate_useful_energy.py
cd ..

# Start development server
npm run dev
```

## Key Metrics (2024)

- **Total**: 229.56 EJ
- **Fossil**: 186.84 EJ (81.4%)
  - Gas: 74.30 EJ | Oil: 59.72 EJ | Coal: 52.82 EJ
- **Clean**: 42.72 EJ (18.6%)
  - Biomass: 13.98 EJ | Hydro: 13.52 EJ | Wind: 6.74 EJ
  - Solar: 5.75 EJ | Nuclear: 2.49 EJ | Geothermal: 0.24 EJ

## Projection Scenarios

| Scenario | Philosophy | 2050 Fossil Share |
|----------|------------|-------------------|
| **Conservative** | Proven tech only, Murphy's Law | ~46% |
| **Baseline** | Expected progress, likely breakthroughs | ~25% |
| **Optimistic** | Key breakthroughs realized | ~10% |

## Data Sources

- Our World in Data (OWID) - Historical consumption
- Oxford Martin School (Way et al. 2022) - Learning curves
- BloombergNEF - Battery costs, manufacturing capacity
- Lazard LCOE v17.0 - Generation costs
- IEA World Energy Outlook - Policy scenarios

---

**Built with React + Vite | Data validated ✓ | Wright's Law projections 📈**
