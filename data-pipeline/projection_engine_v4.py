#!/usr/bin/env python3
"""
Projection Engine v4.0 - Integrated Energy Transition Model

Combines:
- Wright's Law learning curves for cost declines
- Manufacturing capacity constraints
- Time-varying efficiency improvements
- Policy acceleration factors
- Technology breakthrough adjustments
- Digitalization efficiency gains (when available)

This is the master projection script for Global Exergy Services Platform v2.5.0
"""

import json
import math
from pathlib import Path
from datetime import datetime

# ============================================================================
# CONFIGURATION LOADING
# ============================================================================

def load_config(filename):
    """Load JSON configuration file"""
    config_path = Path(__file__).parent / 'config' / filename
    if not config_path.exists():
        # Try alternative paths
        alt_path = Path(__file__).parent.parent / 'data-pipeline' / 'config' / filename
        if alt_path.exists():
            config_path = alt_path
        else:
            print(f"Warning: Config file not found: {filename}")
            return None

    with open(config_path, 'r') as f:
        return json.load(f)

# Load all configurations
LEARNING_CURVES = load_config('learning_curves.json')
MANUFACTURING_CAPACITY = load_config('manufacturing_capacity.json')
POLICY_SCENARIOS = load_config('policy_scenarios.json')
TECHNOLOGY_BREAKTHROUGHS = load_config('technology_breakthroughs.json')
DIGITALIZATION_GAINS = load_config('digitalization_gains.json')

# ============================================================================
# CONSTANTS AND SCENARIO DEFINITIONS
# ============================================================================

SCENARIOS = ['Conservative', 'Baseline', 'Optimistic']
BASE_YEAR = 2024
TARGET_YEAR = 2050

# S-curve saturation limits by scenario (in EJ of useful energy)
SATURATION_LIMITS = {
    'Conservative': {
        'solar': 100,
        'wind': 80,
        'nuclear': 15,
        'hydro': 20,
        'batteries_storage_ej': 50,
        'heat_pumps_ej': 30,
        'evs_energy_ej': 40,
        'hydrogen_ej': 10
    },
    'Baseline': {
        'solar': 200,
        'wind': 150,
        'nuclear': 25,
        'hydro': 25,
        'batteries_storage_ej': 100,
        'heat_pumps_ej': 60,
        'evs_energy_ej': 80,
        'hydrogen_ej': 30
    },
    'Optimistic': {
        'solar': 400,
        'wind': 250,
        'nuclear': 40,
        'hydro': 30,
        'batteries_storage_ej': 200,
        'heat_pumps_ej': 100,
        'evs_energy_ej': 150,
        'hydrogen_ej': 80
    }
}

# 2024 baseline values (EJ useful energy)
BASELINE_2024 = {
    'solar': 5.2,
    'wind': 6.8,
    'nuclear': 7.2,
    'hydro': 11.5,
    'fossil_total': 165.0,
    'total_useful_energy': 198.5
}

# ============================================================================
# WRIGHT'S LAW LEARNING CURVE FUNCTIONS
# ============================================================================

def calculate_learning_curve_cost(base_cost, learning_rate, base_cumulative,
                                   current_cumulative, floor_cost):
    """
    Calculate cost using Wright's Law

    Formula: C(x) = C_0 * (x / x_0) ^ log2(1 - learning_rate)

    Args:
        base_cost: Cost at base cumulative capacity
        learning_rate: Fraction reduction per doubling (e.g., 0.27 for 27%)
        base_cumulative: Cumulative capacity at base year
        current_cumulative: Current cumulative capacity
        floor_cost: Minimum possible cost (theoretical limit)

    Returns:
        Projected cost
    """
    if current_cumulative <= base_cumulative:
        return base_cost

    # Wright's Law exponent: b = log2(1 - learning_rate)
    b = math.log2(1 - learning_rate)

    # Calculate new cost
    new_cost = base_cost * (current_cumulative / base_cumulative) ** b

    # Apply floor cost
    return max(new_cost, floor_cost)

def get_learning_rate_params(technology, scenario='Baseline'):
    """Get learning rate parameters for a technology"""
    if not LEARNING_CURVES:
        return None

    tech_map = {
        'solar': 'solar_pv',
        'wind': 'wind_onshore',
        'batteries': 'lithium_ion_batteries',
        'heat_pumps': 'heat_pumps',
        'electrolyzers': 'electrolyzers_pem'
    }

    tech_key = tech_map.get(technology, technology)
    params = LEARNING_CURVES.get('learning_rates', {}).get(tech_key)

    if params and LEARNING_CURVES.get('scenario_adjustments'):
        adj = LEARNING_CURVES['scenario_adjustments'].get(scenario, {})

        # Apply scenario adjustments
        learning_rate_mult = adj.get('learning_rate_multiplier', 1.0)
        floor_buffer = adj.get('floor_cost_buffer', 1.0)

        # Create adjusted params
        adjusted_params = params.copy()
        adjusted_params['learning_rate'] = params['learning_rate'] * learning_rate_mult

        # Apply floor cost buffer
        for key in ['floor_cost_usd_per_mwh', 'floor_cost_usd_per_kwh', 'floor_cost_usd_per_unit']:
            if key in adjusted_params:
                adjusted_params[key] = adjusted_params[key] * floor_buffer

        return adjusted_params

    return params

# ============================================================================
# MANUFACTURING CAPACITY CONSTRAINTS
# ============================================================================

def get_max_annual_deployment(technology, year, scenario='Baseline'):
    """Get maximum annual deployment based on manufacturing capacity"""
    if not MANUFACTURING_CAPACITY:
        return float('inf')

    tech_map = {
        'solar': 'solar_pv_gw_year',
        'wind': 'wind_total_gw_year',
        'batteries': 'battery_gwh_year',
        'heat_pumps': 'heat_pumps_million_units',
        'evs': 'evs_million_units'
    }

    tech_key = tech_map.get(technology)
    if not tech_key:
        return float('inf')

    trajectory = MANUFACTURING_CAPACITY.get('trajectories', {}).get(tech_key, {})
    projections = trajectory.get('projections', {})

    # If no projections available, return infinity (no constraint)
    if not projections:
        return float('inf')

    # Find capacity for the year (interpolate if needed)
    years = sorted([int(y) for y in projections.keys()])

    if not years:
        return float('inf')

    if year <= years[0]:
        base_capacity = projections[str(years[0])]
    elif year >= years[-1]:
        base_capacity = projections[str(years[-1])]
    else:
        # Linear interpolation
        base_capacity = projections[str(years[0])]  # Default
        for i, y in enumerate(years[:-1]):
            if y <= year < years[i+1]:
                ratio = (year - y) / (years[i+1] - y)
                base_capacity = projections[str(y)] + ratio * (projections[str(years[i+1])] - projections[str(y)])
                break

    # Apply scenario multiplier
    multipliers = trajectory.get('scenario_multipliers', {})
    mult = multipliers.get(scenario.lower(), 1.0)

    return base_capacity * mult

# ============================================================================
# POLICY ACCELERATION FACTORS
# ============================================================================

def get_policy_multiplier(technology, year, scenario='Baseline'):
    """Get policy-driven deployment acceleration multiplier"""
    if not POLICY_SCENARIOS:
        return 1.0

    global_mults = POLICY_SCENARIOS.get('global_aggregated_multipliers', {}).get('by_technology', {})

    tech_map = {
        'solar': 'solar_pv',
        'wind': 'wind_total',
        'batteries': 'batteries',
        'heat_pumps': 'heat_pumps',
        'evs': 'evs',
        'hydrogen': 'hydrogen',
        'nuclear': 'nuclear'
    }

    tech_key = tech_map.get(technology, technology)
    tech_data = global_mults.get(tech_key, {}).get(scenario, {})

    # Find applicable period
    for period, mult in tech_data.items():
        if '-' in period:
            start, end = period.split('-')
            if int(start) <= year <= int(end):
                return mult

    return 1.0

# ============================================================================
# EFFICIENCY FACTORS
# ============================================================================

def get_efficiency_factor(technology, year, scenario='Baseline'):
    """Get efficiency factor for a technology in a given year"""
    # Base efficiencies from corrected factors
    base_efficiencies = {
        'solar': 0.70,
        'wind': 0.70,
        'nuclear': 0.33,
        'hydro': 0.70,
        'coal': 0.32,
        'gas': 0.45,
        'oil': 0.30
    }

    # Efficiency improvement rates by scenario
    improvements = {
        'Conservative': {
            'solar': 0.003,  # 0.3% per year
            'wind': 0.002,
            'nuclear': 0.001,
            'hydro': 0.0
        },
        'Baseline': {
            'solar': 0.006,  # 0.6% per year
            'wind': 0.004,
            'nuclear': 0.002,
            'hydro': 0.001
        },
        'Optimistic': {
            'solar': 0.010,  # 1.0% per year
            'wind': 0.006,
            'nuclear': 0.004,
            'hydro': 0.002
        }
    }

    base = base_efficiencies.get(technology, 0.5)
    rate = improvements.get(scenario, {}).get(technology, 0)
    years_from_base = year - BASE_YEAR

    # Calculate improved efficiency with cap
    improved = base + (rate * years_from_base)

    # Cap at theoretical maxima
    max_efficiency = {
        'solar': 0.95,
        'wind': 0.88,
        'nuclear': 0.45,
        'hydro': 0.78
    }

    return min(improved, max_efficiency.get(technology, 1.0))

# ============================================================================
# S-CURVE GROWTH MODEL
# ============================================================================

def s_curve(year, start_year, saturation, midpoint_year, steepness=0.3):
    """
    Logistic S-curve for technology adoption

    Args:
        year: Target year
        start_year: Year when technology starts significant growth
        saturation: Maximum value (carrying capacity)
        midpoint_year: Year at 50% of saturation
        steepness: Growth rate parameter

    Returns:
        Value on S-curve
    """
    t = year - midpoint_year
    return saturation / (1 + math.exp(-steepness * t))

def calculate_s_curve_midpoint(current_value, current_year, saturation, steepness=0.3):
    """Calculate S-curve midpoint from current position"""
    if current_value >= saturation * 0.99:
        return current_year - 20  # Already at saturation
    if current_value <= 0:
        return current_year + 20  # Just starting

    # Solve for midpoint: current = saturation / (1 + exp(-k*(current_year - midpoint)))
    # midpoint = current_year + ln((saturation - current) / current) / steepness
    ratio = (saturation - current_value) / current_value
    if ratio <= 0:
        return current_year

    midpoint = current_year + math.log(ratio) / steepness
    return midpoint

# ============================================================================
# MAIN PROJECTION ENGINE
# ============================================================================

class ProjectionEngine:
    """Main projection engine combining all factors"""

    def __init__(self, scenario='Baseline'):
        self.scenario = scenario
        self.base_year = BASE_YEAR
        self.saturation = SATURATION_LIMITS[scenario]

        # Calculate S-curve parameters
        self.midpoints = {}
        for tech in ['solar', 'wind', 'nuclear', 'hydro']:
            current = BASELINE_2024.get(tech, 0)
            sat = self.saturation.get(tech, 100)
            steepness = self._get_steepness(tech)
            self.midpoints[tech] = calculate_s_curve_midpoint(current, BASE_YEAR, sat, steepness)

    def _get_steepness(self, technology):
        """Get S-curve steepness based on scenario and technology"""
        base_steepness = {
            'solar': 0.35,  # Fast adoption
            'wind': 0.25,   # Moderate
            'nuclear': 0.15, # Slow
            'hydro': 0.10   # Very slow (limited sites)
        }

        scenario_mult = {
            'Conservative': 0.8,
            'Baseline': 1.0,
            'Optimistic': 1.3
        }

        return base_steepness.get(technology, 0.2) * scenario_mult.get(self.scenario, 1.0)

    def project_technology(self, technology, year):
        """Project deployment for a single technology"""
        # Get S-curve base projection
        sat = self.saturation.get(technology, 100)
        steepness = self._get_steepness(technology)
        midpoint = self.midpoints.get(technology, 2035)

        base_projection = s_curve(year, 2000, sat, midpoint, steepness)

        # Apply policy multiplier
        policy_mult = get_policy_multiplier(technology, year, self.scenario)

        # Apply manufacturing capacity constraint
        max_annual = get_max_annual_deployment(technology, year, self.scenario)

        # Calculate annual growth (for capacity constraint)
        prev_year_projection = s_curve(year - 1, 2000, sat, midpoint, steepness)
        annual_growth = base_projection - prev_year_projection

        # Cap growth at manufacturing capacity (convert to EJ if needed)
        # Rough conversion: 100 GW solar ≈ 0.5 EJ/year at 20% CF
        gw_to_ej_factor = {
            'solar': 0.005,  # 100 GW ≈ 0.5 EJ at 20% CF
            'wind': 0.008,   # 100 GW ≈ 0.8 EJ at 35% CF
            'nuclear': 0.025, # 100 GW ≈ 2.5 EJ at 90% CF
            'hydro': 0.012   # 100 GW ≈ 1.2 EJ at 45% CF
        }

        max_annual_ej = max_annual * gw_to_ej_factor.get(technology, 0.01) if max_annual != float('inf') else float('inf')

        # Constrain growth
        constrained_growth = min(annual_growth * policy_mult, max_annual_ej)

        # Build from previous year
        final_value = prev_year_projection + constrained_growth

        # Apply efficiency factor to convert to useful energy
        efficiency = get_efficiency_factor(technology, year, self.scenario)

        return final_value * efficiency / get_efficiency_factor(technology, BASE_YEAR, self.scenario)

    def project_all(self, year):
        """Project all technologies for a given year"""
        results = {}

        # Total energy demand growth (moderate growth assumption)
        demand_growth_rate = {
            'Conservative': 0.008,  # 0.8% per year
            'Baseline': 0.012,      # 1.2% per year
            'Optimistic': 0.015     # 1.5% per year
        }

        years_from_base = year - BASE_YEAR
        growth = demand_growth_rate.get(self.scenario, 0.01)
        results['total_demand_ej'] = BASELINE_2024['total_useful_energy'] * (1 + growth) ** years_from_base

        # Clean energy sources
        for tech in ['solar', 'wind', 'nuclear', 'hydro']:
            results[f'{tech}_ej'] = self.project_technology(tech, year)

        # Calculate raw clean total
        raw_clean_total = sum([
            results.get(f'{t}_ej', 0) for t in ['solar', 'wind', 'nuclear', 'hydro']
        ])

        # Cap clean energy at total demand (can't exceed 100%)
        # Allow small excess to represent exports/curtailment
        max_clean = results['total_demand_ej'] * 1.05  # 5% buffer for system flexibility

        if raw_clean_total > max_clean:
            # Scale down proportionally
            scale_factor = max_clean / raw_clean_total
            for tech in ['solar', 'wind', 'nuclear', 'hydro']:
                results[f'{tech}_ej'] *= scale_factor
            results['clean_total_ej'] = max_clean
        else:
            results['clean_total_ej'] = raw_clean_total

        # Fossil fuel as residual (minimum 0)
        results['fossil_ej'] = max(0, results['total_demand_ej'] - results['clean_total_ej'])

        # Calculate shares (cap at 100%)
        results['clean_share'] = min(1.0, results['clean_total_ej'] / results['total_demand_ej']) if results['total_demand_ej'] > 0 else 0
        results['fossil_share'] = max(0, 1 - results['clean_share'])

        return results

    def project_timeseries(self, start_year=2024, end_year=2050):
        """Generate full timeseries projection"""
        timeseries = []

        for year in range(start_year, end_year + 1):
            data = self.project_all(year)
            data['year'] = year
            data['scenario'] = self.scenario
            timeseries.append(data)

        return timeseries

    def get_costs(self, year):
        """Calculate technology costs using learning curves"""
        costs = {}

        # Solar
        solar_params = get_learning_rate_params('solar', self.scenario)
        if solar_params:
            # Estimate cumulative capacity growth
            cumulative_gw = 1500 + (year - 2024) * 800  # Rough estimate
            costs['solar_usd_per_mwh'] = calculate_learning_curve_cost(
                solar_params.get('base_cost_usd_per_mwh', 32),
                solar_params.get('learning_rate', 0.27),
                solar_params.get('base_cumulative_gw', 1500),
                cumulative_gw,
                solar_params.get('floor_cost_usd_per_mwh', 8)
            )

        # Wind
        wind_params = get_learning_rate_params('wind', self.scenario)
        if wind_params:
            cumulative_gw = 900 + (year - 2024) * 150
            costs['wind_usd_per_mwh'] = calculate_learning_curve_cost(
                wind_params.get('base_cost_usd_per_mwh', 38),
                wind_params.get('learning_rate', 0.15),
                wind_params.get('base_cumulative_gw', 900),
                cumulative_gw,
                wind_params.get('floor_cost_usd_per_mwh', 15)
            )

        # Batteries
        battery_params = get_learning_rate_params('batteries', self.scenario)
        if battery_params:
            cumulative_gwh = 2500 + (year - 2024) * 1500
            costs['battery_usd_per_kwh'] = calculate_learning_curve_cost(
                battery_params.get('base_cost_usd_per_kwh', 139),
                battery_params.get('learning_rate', 0.18),
                battery_params.get('base_cumulative_gwh', 2500),
                cumulative_gwh,
                battery_params.get('floor_cost_usd_per_kwh', 40)
            )

        return costs

def generate_all_projections():
    """Generate projections for all scenarios"""
    all_projections = {}

    for scenario in SCENARIOS:
        print(f"\nGenerating {scenario} scenario...")
        engine = ProjectionEngine(scenario)
        all_projections[scenario] = engine.project_timeseries()

        # Print summary
        data_2050 = all_projections[scenario][-1]
        print(f"  2050: Clean {data_2050['clean_share']*100:.1f}%, Fossil {data_2050['fossil_share']*100:.1f}%")
        print(f"  Solar: {data_2050['solar_ej']:.1f} EJ, Wind: {data_2050['wind_ej']:.1f} EJ")

    return all_projections

def save_projections(projections, output_path=None):
    """Save projections to JSON file"""
    if output_path is None:
        output_path = Path(__file__).parent.parent / 'global-energy-services' / 'public' / 'data' / 'energy_projections_v4.json'

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output_data = {
        'metadata': {
            'version': '4.0.0',
            'generated': datetime.now().isoformat(),
            'model': 'Projection Engine v4.0',
            'scenarios': SCENARIOS,
            'features': [
                'Wright\'s Law learning curves',
                'Manufacturing capacity constraints',
                'Policy acceleration factors',
                'Time-varying efficiency',
                'S-curve technology adoption'
            ]
        },
        'projections': projections
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\nProjections saved to: {output_path}")
    return output_path

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == '__main__':
    print("=" * 80)
    print("PROJECTION ENGINE v4.0 - Global Exergy Services Platform")
    print("=" * 80)

    # Check configuration loading
    configs = [
        ('Learning Curves', LEARNING_CURVES),
        ('Manufacturing Capacity', MANUFACTURING_CAPACITY),
        ('Policy Scenarios', POLICY_SCENARIOS),
        ('Technology Breakthroughs', TECHNOLOGY_BREAKTHROUGHS),
        ('Digitalization Gains', DIGITALIZATION_GAINS)
    ]

    print("\nConfiguration Status:")
    for name, config in configs:
        status = "Loaded" if config else "Not Found"
        print(f"  {name}: {status}")

    # Generate projections
    print("\n" + "-" * 80)
    projections = generate_all_projections()

    # Save output
    output_path = save_projections(projections)

    # Print comparison table
    print("\n" + "=" * 80)
    print("SCENARIO COMPARISON (2050)")
    print("=" * 80)
    print(f"{'Scenario':<15} {'Total EJ':<12} {'Clean EJ':<12} {'Fossil EJ':<12} {'Clean %':<10}")
    print("-" * 80)

    for scenario in SCENARIOS:
        data = projections[scenario][-1]
        print(f"{scenario:<15} {data['total_demand_ej']:<12.1f} {data['clean_total_ej']:<12.1f} {data['fossil_ej']:<12.1f} {data['clean_share']*100:<10.1f}")

    # Print cost projections
    print("\n" + "=" * 80)
    print("COST PROJECTIONS (2030 vs 2050)")
    print("=" * 80)

    for scenario in SCENARIOS:
        engine = ProjectionEngine(scenario)
        costs_2030 = engine.get_costs(2030)
        costs_2050 = engine.get_costs(2050)

        print(f"\n{scenario}:")
        print(f"  Solar LCOE: ${costs_2030.get('solar_usd_per_mwh', 0):.1f}/MWh (2030) → ${costs_2050.get('solar_usd_per_mwh', 0):.1f}/MWh (2050)")
        print(f"  Wind LCOE:  ${costs_2030.get('wind_usd_per_mwh', 0):.1f}/MWh (2030) → ${costs_2050.get('wind_usd_per_mwh', 0):.1f}/MWh (2050)")
        print(f"  Battery:   ${costs_2030.get('battery_usd_per_kwh', 0):.1f}/kWh (2030) → ${costs_2050.get('battery_usd_per_kwh', 0):.1f}/kWh (2050)")

    print("\n" + "=" * 80)
    print("PROJECTION ENGINE COMPLETE")
    print("=" * 80)
