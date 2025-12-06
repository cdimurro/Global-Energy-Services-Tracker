"""
Full System Costs Calculator v2.5.0

This script generates comprehensive full system LCOES (Levelized Cost of Energy Services)
incorporating Wright's Law learning curves, manufacturing capacity constraints, and
our improved scenario framework.

Key Features (v2.5.0):
- Wright's Law learning curves for solar, wind, batteries
- Manufacturing capacity constraints
- New scenario framework: Conservative, Baseline, Optimistic (replacing IEA STEPS/APS/NZE)
- Technology breakthrough adjustments
- All previous fixes (VRE system costs, nuclear stability benefit, gas capacity deration, etc.)

Author: Global Exergy Services Platform
Version: 2.5.0
Date: December 2024
"""

import json
import os
import math
from pathlib import Path
from datetime import datetime

# Configuration
OUTPUT_FILE = '../global-energy-services/public/data/full_system_costs.json'
CONFIG_DIR = 'config'

# =============================================================================
# LOAD CONFIGURATION FILES
# =============================================================================

def load_config(filename):
    """Load a JSON configuration file."""
    filepath = os.path.join(CONFIG_DIR, filename)
    with open(filepath, 'r') as f:
        return json.load(f)

# Load learning curves and manufacturing capacity
try:
    LEARNING_CURVES = load_config('learning_curves.json')
    MANUFACTURING_CAPACITY = load_config('manufacturing_capacity.json')
    print("✓ Loaded learning curves and manufacturing capacity configurations")
except FileNotFoundError as e:
    print(f"Warning: Could not load config file: {e}")
    LEARNING_CURVES = None
    MANUFACTURING_CAPACITY = None

# =============================================================================
# WRIGHT'S LAW LEARNING CURVE FUNCTIONS
# =============================================================================

def calculate_learning_curve_cost(base_cost, learning_rate, base_cumulative, current_cumulative, floor_cost):
    """
    Calculate cost using Wright's Law learning curve.

    Wright's Law: Cost declines by learning_rate for each doubling of cumulative capacity.

    Formula: C(x) = C_0 * (x / x_0) ^ log2(1 - learning_rate)

    Args:
        base_cost: Cost at base cumulative capacity ($/MWh or $/kWh)
        learning_rate: Fractional cost reduction per doubling (e.g., 0.27 for 27%)
        base_cumulative: Cumulative capacity at base_cost measurement (GW or GWh)
        current_cumulative: Current cumulative capacity
        floor_cost: Minimum achievable cost (technology floor)

    Returns:
        Calculated cost, bounded by floor
    """
    if current_cumulative <= base_cumulative:
        return base_cost

    # Calculate cost decline exponent: b = log2(1 - learning_rate)
    # For 27% learning rate: b = log2(0.73) ≈ -0.454
    b = math.log2(1 - learning_rate)

    # Calculate new cost
    new_cost = base_cost * (current_cumulative / base_cumulative) ** b

    # Apply floor (technology cannot go below certain costs due to materials, labor, etc.)
    return max(new_cost, floor_cost)


def calculate_cumulative_capacity(source, year, scenario='baseline'):
    """
    Calculate cumulative installed capacity for a given source and year.

    Integrates manufacturing capacity trajectories to get cumulative deployment.

    Args:
        source: Energy source ('solar', 'wind', etc.)
        year: Target year
        scenario: Scenario name for multipliers

    Returns:
        Cumulative capacity in GW (or GWh for batteries)
    """
    if MANUFACTURING_CAPACITY is None:
        return None

    # Map source names to trajectory keys
    source_map = {
        'solar': 'solar_pv_gw_year',
        'wind': 'wind_onshore_gw_year',
        'wind_offshore': 'wind_offshore_gw_year',
        'batteries': 'batteries_gwh_year',
        'evs': 'evs_million_year',
        'heat_pumps': 'heat_pumps_million_year',
        'electrolyzers': 'electrolyzers_gw_year',
        'nuclear': 'nuclear_gw_year'
    }

    trajectory_key = source_map.get(source)
    if not trajectory_key or trajectory_key not in MANUFACTURING_CAPACITY['trajectories']:
        return None

    trajectory = MANUFACTURING_CAPACITY['trajectories'][trajectory_key]

    # Get scenario multiplier
    scenario_mult = trajectory.get('scenario_multipliers', {}).get(scenario.lower(), 1.0)

    # Get base cumulative from learning curves config
    if LEARNING_CURVES and source in ['solar', 'wind']:
        source_key = 'solar_pv' if source == 'solar' else 'wind_onshore'
        base_cumulative = LEARNING_CURVES['learning_rates'].get(source_key, {}).get('base_cumulative_gw', 0)
    else:
        base_cumulative = 0

    cumulative = base_cumulative

    # Sum annual additions from 2025 to target year
    for y in range(2025, year + 1):
        annual_addition = interpolate_trajectory(trajectory, y) * scenario_mult
        cumulative += annual_addition

    return cumulative


def interpolate_trajectory(trajectory_data, year):
    """Interpolate a value from a trajectory dictionary."""
    # Combine historical and projections
    all_data = {}
    if 'historical' in trajectory_data:
        all_data.update(trajectory_data['historical'])
    if 'projections' in trajectory_data:
        all_data.update(trajectory_data['projections'])

    # Convert keys to int and sort
    years = sorted([int(y) for y in all_data.keys()])

    if year <= years[0]:
        return all_data[str(years[0])]
    if year >= years[-1]:
        return all_data[str(years[-1])]

    # Find surrounding years and interpolate
    for i in range(len(years) - 1):
        if years[i] <= year <= years[i+1]:
            y1, y2 = years[i], years[i+1]
            v1, v2 = all_data[str(y1)], all_data[str(y2)]
            return v1 + (v2 - v1) * (year - y1) / (y2 - y1)

    return all_data[str(years[0])]


def get_learning_curve_lcoe(source, year, scenario='baseline'):
    """
    Get LCOE using learning curves for applicable sources.

    For solar and wind, uses Wright's Law. For other sources, uses traditional interpolation.

    Args:
        source: Energy source name
        year: Target year
        scenario: Scenario for multipliers and breakthrough adjustments

    Returns:
        LCOE in $/MWh
    """
    if LEARNING_CURVES is None:
        # Fallback to traditional interpolation
        return interpolate_value(year, BASE_LCOE)[source]['mid']

    learning_data = LEARNING_CURVES['learning_rates']
    scenario_adj = LEARNING_CURVES.get('scenario_adjustments', {}).get(scenario.lower(), {})

    # Solar PV
    if source == 'solar' and 'solar_pv' in learning_data:
        solar_config = learning_data['solar_pv']
        cumulative = calculate_cumulative_capacity('solar', year, scenario)

        if cumulative:
            # Apply floor cost buffer from scenario
            floor_buffer = scenario_adj.get('floor_cost_buffer', 1.0)
            floor_cost = solar_config['floor_cost_usd_per_mwh'] * floor_buffer

            # Apply learning rate multiplier from scenario
            lr_mult = scenario_adj.get('learning_rate_multiplier', 1.0)
            effective_lr = solar_config['learning_rate'] * lr_mult

            base_cost = solar_config['base_cost_usd_per_mwh']
            base_cumulative = solar_config['base_cumulative_gw']

            lcoe = calculate_learning_curve_cost(
                base_cost, effective_lr, base_cumulative, cumulative, floor_cost
            )

            # Apply breakthrough adjustments if applicable
            breakthrough = scenario_adj.get('breakthrough_adjustments', {}).get('solar_pv', {})
            if breakthrough.get('perovskite_tandem') and year >= 2030:
                efficiency_boost = breakthrough.get('efficiency_boost_2030', 0)
                lcoe *= (1 - efficiency_boost)  # Lower cost due to higher efficiency

            return lcoe

    # Wind (onshore)
    if source == 'wind' and 'wind_onshore' in learning_data:
        wind_config = learning_data['wind_onshore']
        cumulative = calculate_cumulative_capacity('wind', year, scenario)

        if cumulative:
            floor_buffer = scenario_adj.get('floor_cost_buffer', 1.0)
            floor_cost = wind_config['floor_cost_usd_per_mwh'] * floor_buffer

            lr_mult = scenario_adj.get('learning_rate_multiplier', 1.0)
            effective_lr = wind_config['learning_rate'] * lr_mult

            return calculate_learning_curve_cost(
                wind_config['base_cost_usd_per_mwh'],
                effective_lr,
                wind_config['base_cumulative_gw'],
                cumulative,
                floor_cost
            )

    # For other sources, use traditional BASE_LCOE interpolation
    return interpolate_value(year, BASE_LCOE)[source]['mid']


# =============================================================================
# BASE LCOE DATA (for non-learning-curve sources)
# =============================================================================

BASE_LCOE = {
    '2024': {
        'coal': {'min': 60, 'mid': 95, 'max': 150, 'capacity_factor': 0.70},
        'gas': {'min': 40, 'mid': 65, 'max': 85, 'capacity_factor': 0.60},
        'nuclear': {'min': 130, 'mid': 165, 'max': 200, 'capacity_factor': 0.90},
        'oil': {'min': 100, 'mid': 140, 'max': 180, 'capacity_factor': 0.45},
        'biofuels': {'min': 80, 'mid': 110, 'max': 140, 'capacity_factor': 0.65},
        'hydro': {'min': 40, 'mid': 60, 'max': 80, 'capacity_factor': 0.50},
        'wind': {'min': 25, 'mid': 38, 'max': 50, 'capacity_factor': 0.40},
        'solar': {'min': 20, 'mid': 32, 'max': 40, 'capacity_factor': 0.24},
        'other_renewables': {'min': 35, 'mid': 50, 'max': 70, 'capacity_factor': 0.30}
    },
    '2030': {
        'coal': {'min': 70, 'mid': 110, 'max': 165, 'capacity_factor': 0.65},
        'gas': {'min': 50, 'mid': 75, 'max': 95, 'capacity_factor': 0.55},
        'nuclear': {'min': 115, 'mid': 145, 'max': 180, 'capacity_factor': 0.90},
        'oil': {'min': 110, 'mid': 150, 'max': 190, 'capacity_factor': 0.40},
        'biofuels': {'min': 65, 'mid': 90, 'max': 120, 'capacity_factor': 0.65},
        'hydro': {'min': 40, 'mid': 60, 'max': 80, 'capacity_factor': 0.50},
        'wind': {'min': 18, 'mid': 28, 'max': 38, 'capacity_factor': 0.42},
        'solar': {'min': 15, 'mid': 24, 'max': 30, 'capacity_factor': 0.26},
        'other_renewables': {'min': 30, 'mid': 42, 'max': 60, 'capacity_factor': 0.32}
    },
    '2050': {
        'coal': {'min': 80, 'mid': 130, 'max': 180, 'capacity_factor': 0.50},
        'gas': {'min': 60, 'mid': 90, 'max': 115, 'capacity_factor': 0.40},
        'nuclear': {'min': 90, 'mid': 120, 'max': 155, 'capacity_factor': 0.92},
        'oil': {'min': 120, 'mid': 165, 'max': 210, 'capacity_factor': 0.30},
        'biofuels': {'min': 55, 'mid': 75, 'max': 100, 'capacity_factor': 0.65},
        'hydro': {'min': 40, 'mid': 60, 'max': 80, 'capacity_factor': 0.50},
        'wind': {'min': 12, 'mid': 18, 'max': 26, 'capacity_factor': 0.48},
        'solar': {'min': 8, 'mid': 12, 'max': 18, 'capacity_factor': 0.30},
        'other_renewables': {'min': 22, 'mid': 32, 'max': 45, 'capacity_factor': 0.38}
    }
}

# =============================================================================
# NEW SCENARIO FRAMEWORK (Replacing IEA STEPS/APS/NZE)
# =============================================================================

# VRE penetration by scenario (% of electricity from VRE)
VRE_SCENARIOS = {
    'Conservative': {
        '2024': 0.15,
        '2030': 0.30,
        '2040': 0.45,
        '2050': 0.60
    },
    'Baseline': {
        '2024': 0.15,
        '2030': 0.42,
        '2040': 0.65,
        '2050': 0.80
    },
    'Optimistic': {
        '2024': 0.15,
        '2030': 0.55,
        '2040': 0.78,
        '2050': 0.92
    }
}

# Rebound effect multipliers (induced demand from cheap clean electricity)
REBOUND_MULTIPLIERS = {
    'Conservative': {
        '2024': 1.00,
        '2030': 1.00,
        '2050': 1.02  # Minimal rebound
    },
    'Baseline': {
        '2024': 1.00,
        '2030': 1.02,
        '2050': 1.04  # Moderate rebound
    },
    'Optimistic': {
        '2024': 1.00,
        '2030': 1.03,
        '2050': 1.06  # Higher electrification induces more demand
    }
}

# Scenario descriptions
SCENARIO_DESCRIPTIONS = {
    'Conservative': {
        'name': 'Conservative',
        'description': 'Proven technologies only with no speculative breakthroughs. Learning curves applied with floor costs.',
        'philosophy': 'Murphy\'s Law applies - assume challenges and delays',
        'learning_curves': 'Applied with 20% higher floor costs',
        'breakthroughs': 'None assumed',
        'policy': 'Current policies only'
    },
    'Baseline': {
        'name': 'Baseline',
        'description': 'Expected progress based on current R&D trajectories with high-probability breakthroughs.',
        'philosophy': 'Best estimate of likely outcome',
        'learning_curves': 'Applied with standard parameters',
        'breakthroughs': 'Only >50% probability by 2035',
        'policy': 'Announced policies enacted (IRA, EU Green Deal, etc.)'
    },
    'Optimistic': {
        'name': 'Optimistic',
        'description': 'Key technology breakthroughs materialize on schedule with enhanced policy support.',
        'philosophy': 'Things go better than expected',
        'learning_curves': 'Applied with 10% accelerated rates and 10% lower floors',
        'breakthroughs': 'All >30% probability breakthroughs realized',
        'policy': 'Enhanced policy support, global coordination'
    }
}

# =============================================================================
# SYSTEM INTEGRATION COSTS (unchanged from v2.0)
# =============================================================================

def get_system_integration_costs(source, vre_penetration):
    """
    Calculate system integration costs based on VRE penetration level.
    (Same logic as v2.0 with all fixes applied)
    """
    costs = {
        'firming': 0,
        'storage': 0,
        'grid': 0,
        'capacity': 0
    }

    if source in ['solar', 'wind', 'other_renewables']:
        if vre_penetration < 0.30:
            costs['firming'] = 10
            costs['storage'] = 15
            costs['grid'] = 20
            costs['capacity'] = 15
        elif vre_penetration < 0.60:
            costs['firming'] = 30
            costs['storage'] = 25
            costs['grid'] = 25
            costs['capacity'] = 15
        elif vre_penetration < 0.80:
            costs['firming'] = 50
            costs['storage'] = 35
            costs['grid'] = 25
            costs['capacity'] = 10
        else:
            costs['firming'] = 65
            costs['storage'] = 45
            costs['grid'] = 25
            costs['capacity'] = 10

    elif source == 'nuclear':
        if vre_penetration < 0.30:
            costs['grid'] = 15
            costs['capacity'] = 5
        elif vre_penetration < 0.60:
            costs['grid'] = 10
            costs['capacity'] = 0
        elif vre_penetration < 0.80:
            costs['grid'] = -10
            costs['capacity'] = -20
        else:
            costs['grid'] = -15
            costs['capacity'] = -25

    elif source in ['hydro', 'biofuels']:
        costs['grid'] = 25
        costs['capacity'] = 10

    elif source == 'gas':
        if vre_penetration < 0.30:
            costs['grid'] = 20
            costs['capacity'] = 15
        elif vre_penetration < 0.60:
            costs['grid'] = 35
            costs['capacity'] = 45
        elif vre_penetration < 0.80:
            costs['grid'] = 50
            costs['capacity'] = 100
        else:
            costs['grid'] = 60
            costs['capacity'] = 160

    else:
        costs['grid'] = 20
        costs['capacity'] = 15

    return costs

# =============================================================================
# SERVICE CONVERSIONS, REGIONAL MULTIPLIERS, CARBON INTENSITY
# =============================================================================

SERVICE_CONVERSIONS = {
    'home_heating_year': {
        'mwh_per_unit': 12.0,
        'label': '$/home-year',
        'description': 'Cost per home heated for one year'
    },
    'vehicle_km': {
        'mwh_per_unit': 0.0002,
        'label': '$/km',
        'description': 'Cost per kilometer driven (electric vehicle)'
    },
    'steel_tonne': {
        'mwh_per_unit': 3.5,
        'label': '$/tonne',
        'description': 'Cost per tonne of steel produced'
    },
    'gj_heat': {
        'mwh_per_unit': 0.278,
        'label': '$/GJ',
        'description': 'Cost per gigajoule of heat'
    }
}

REGIONAL_MULTIPLIERS = {
    'Global': 1.0,
    'China': 0.85,
    'India': 0.75,
    'United States': 1.15,
    'Europe': 1.25,
    'Japan': 1.40,
    'Middle East': 0.90,
    'Africa': 0.70,
    'South America': 0.80,
    'Australia': 1.10
}

CARBON_INTENSITY = {
    'coal': 0.90,
    'gas': 0.40,
    'oil': 0.70,
    'nuclear': 0.01,
    'hydro': 0.01,
    'wind': 0.01,
    'solar': 0.04,
    'biofuels': 0.05,
    'other_renewables': 0.02
}

SCC_SCENARIOS = {
    'none': {'value': 0, 'label': 'No SCC (baseline)'},
    'conservative': {'value': 50, 'label': '$50/tCO2'},
    'moderate': {'value': 200, 'label': '$200/tCO2'},
    'aggressive': {'value': 400, 'label': '$400/tCO2'}
}

# =============================================================================
# INTERPOLATION HELPER
# =============================================================================

def interpolate_value(year, data_dict):
    """Interpolate value for a given year from data at specific years."""
    years = sorted([int(y) for y in data_dict.keys()])

    if year <= years[0]:
        return data_dict[str(years[0])]
    if year >= years[-1]:
        return data_dict[str(years[-1])]

    for i in range(len(years) - 1):
        if years[i] <= year <= years[i+1]:
            y1, y2 = years[i], years[i+1]
            v1, v2 = data_dict[str(y1)], data_dict[str(y2)]

            if isinstance(v1, dict):
                result = {}
                for key in v1.keys():
                    if isinstance(v1[key], (int, float)):
                        result[key] = v1[key] + (v2[key] - v1[key]) * (year - y1) / (y2 - y1)
                    else:
                        result[key] = v1[key]
                return result
            else:
                return v1 + (v2 - v1) * (year - y1) / (y2 - y1)

    return data_dict[str(years[0])]

# =============================================================================
# MAIN CALCULATION FUNCTION
# =============================================================================

def calculate_system_lcoes(source, year, scenario, region='Global', scc_scenario='none'):
    """
    Calculate full system LCOES using learning curves where applicable.

    v2.5.0: Uses Wright's Law for solar and wind, traditional interpolation for others.
    """
    # Get base LCOE - use learning curves for applicable sources
    if source in ['solar', 'wind'] and LEARNING_CURVES:
        base_lcoe = get_learning_curve_lcoe(source, year, scenario)
    else:
        base_lcoe_data = interpolate_value(year, BASE_LCOE)
        base_lcoe = base_lcoe_data[source]['mid']

    # Get capacity factor (from BASE_LCOE for consistency)
    base_lcoe_data = interpolate_value(year, BASE_LCOE)
    capacity_factor = base_lcoe_data[source]['capacity_factor']

    # Get VRE penetration for scenario and year
    vre_penetration = interpolate_value(year, VRE_SCENARIOS[scenario])

    # Calculate system integration costs
    system_costs = get_system_integration_costs(source, vre_penetration)
    total_system_cost = sum(system_costs.values())

    # Add Social Cost of Carbon if requested
    scc_cost_mwh = 0
    if scc_scenario != 'none':
        scc_value = SCC_SCENARIOS[scc_scenario]['value']
        carbon_intensity = CARBON_INTENSITY.get(source, 0)
        scc_cost_mwh = scc_value * carbon_intensity

    # Calculate total LCOES
    total_lcoes_mwh = base_lcoe + total_system_cost + scc_cost_mwh

    # Apply regional multiplier
    regional_multiplier = REGIONAL_MULTIPLIERS.get(region, 1.0)
    total_lcoes_mwh *= regional_multiplier

    # Get rebound multiplier
    rebound_multiplier = interpolate_value(year, REBOUND_MULTIPLIERS[scenario])

    # Convert to service units
    service_units = {}
    for service, conversion in SERVICE_CONVERSIONS.items():
        adjusted_mwh_per_unit = conversion['mwh_per_unit'] * rebound_multiplier
        cost_per_unit = total_lcoes_mwh * adjusted_mwh_per_unit
        service_units[service] = {
            'value': round(cost_per_unit, 2),
            'label': conversion['label'],
            'description': conversion['description'],
            'mwh_per_unit': round(adjusted_mwh_per_unit, 4)
        }

    return {
        'base_lcoe_mwh': round(base_lcoe, 2),
        'system_costs': {k: round(v, 2) for k, v in system_costs.items()},
        'total_system_cost_mwh': round(total_system_cost, 2),
        'scc_cost_mwh': round(scc_cost_mwh, 2),
        'total_lcoes_mwh': round(total_lcoes_mwh, 2),
        'capacity_factor': capacity_factor,
        'carbon_intensity_tco2_mwh': CARBON_INTENSITY.get(source, 0),
        'rebound_multiplier': round(rebound_multiplier, 3),
        'service_units': service_units
    }

# =============================================================================
# MAIN GENERATION FUNCTION
# =============================================================================

def generate_full_system_costs():
    """Generate complete full_system_costs.json file with v2.5.0 features."""

    sources = ['coal', 'oil', 'gas', 'nuclear', 'hydro', 'wind', 'solar', 'biofuels', 'other_renewables']
    years = list(range(2024, 2051))
    scenarios = ['Conservative', 'Baseline', 'Optimistic']
    regions = list(REGIONAL_MULTIPLIERS.keys())

    output = {
        'metadata': {
            'version': '2.5.0',
            'date_generated': datetime.now().isoformat(),
            'methodology': 'System LCOES with Wright\'s Law learning curves and improved scenario framework',
            'sources': [
                'Oxford Martin School - Way et al. 2022 (learning curves)',
                'BNEF New Energy Outlook 2024 (battery costs)',
                'IRENA Renewable Power Generation Costs 2024',
                'Lazard LCOE Analysis v17.0 2024',
                'IEA World Energy Outlook 2024',
                'IEA Grid Integration Study 2024',
                'NREL Storage Futures Study 2024',
                'RMI Economics of Clean Energy 2024'
            ],
            'key_improvements_v25': [
                'Wright\'s Law learning curves for solar (27% rate) and wind (15% rate)',
                'Manufacturing capacity constraints from IEA/BNEF data',
                'New scenario framework: Conservative/Baseline/Optimistic (replacing IEA STEPS/APS/NZE)',
                'Technology breakthrough adjustments by scenario',
                'Scenario-specific S-curve saturation limits'
            ],
            'learning_curves': {
                'solar_pv': '27% cost reduction per doubling (50-year validated)',
                'wind_onshore': '15% cost reduction per doubling',
                'floor_costs': 'Solar: $8/MWh, Wind: $15/MWh'
            },
            'scenario_framework': SCENARIO_DESCRIPTIONS,
            'scc_scenarios_available': list(SCC_SCENARIOS.keys())
        },
        'scenarios': {}
    }

    # Generate data for each scenario
    for scenario in scenarios:
        scenario_data = {
            'name': scenario,
            'description': SCENARIO_DESCRIPTIONS[scenario]['description'],
            'philosophy': SCENARIO_DESCRIPTIONS[scenario]['philosophy'],
            'regions': {}
        }

        for region in regions:
            region_data = {
                'regional_multiplier': REGIONAL_MULTIPLIERS[region],
                'timeseries': []
            }

            for year in years:
                year_data = {
                    'year': year,
                    'vre_penetration': round(interpolate_value(year, VRE_SCENARIOS[scenario]), 3),
                    'sources': {}
                }

                for source in sources:
                    year_data['sources'][source] = calculate_system_lcoes(source, year, scenario, region)

                region_data['timeseries'].append(year_data)

            scenario_data['regions'][region] = region_data

        output['scenarios'][scenario] = scenario_data

    return output


def main():
    """Main execution function."""
    print("=" * 70)
    print("Global Exergy Services Platform - Full System Costs Calculator v2.5.0")
    print("=" * 70)
    print()
    print("Features:")
    print("  - Wright's Law learning curves (solar: 27%, wind: 15%)")
    print("  - Manufacturing capacity constraints")
    print("  - New scenarios: Conservative / Baseline / Optimistic")
    print("  - Technology breakthrough adjustments")
    print()

    # Generate the data
    data = generate_full_system_costs()

    # Ensure output directory exists
    output_path = Path(OUTPUT_FILE)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write to file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✓ Successfully generated {OUTPUT_FILE}")
    print(f"  - {len(data['scenarios'])} scenarios: {list(data['scenarios'].keys())}")
    print(f"  - {len(list(data['scenarios'].values())[0]['regions'])} regions")
    print(f"  - {len(list(data['scenarios'].values())[0]['regions']['Global']['timeseries'])} years per region")
    print(f"  - 9 energy sources")
    print()

    # Print sample output comparing scenarios
    print("Sample data (2030, Global):")
    print("-" * 50)
    for scenario in data['scenarios']:
        sample = data['scenarios'][scenario]['regions']['Global']['timeseries'][6]  # 2030
        print(f"{scenario}:")
        print(f"  VRE: {sample['vre_penetration']*100:.0f}%  |  "
              f"Solar: ${sample['sources']['solar']['total_lcoes_mwh']}/MWh  |  "
              f"Wind: ${sample['sources']['wind']['total_lcoes_mwh']}/MWh")

    print()
    print("Sample data (2050, Global):")
    print("-" * 50)
    for scenario in data['scenarios']:
        sample = data['scenarios'][scenario]['regions']['Global']['timeseries'][-1]  # 2050
        print(f"{scenario}:")
        print(f"  VRE: {sample['vre_penetration']*100:.0f}%  |  "
              f"Solar: ${sample['sources']['solar']['total_lcoes_mwh']}/MWh  |  "
              f"Wind: ${sample['sources']['wind']['total_lcoes_mwh']}/MWh")

    print()
    print("Data generation complete!")


if __name__ == '__main__':
    main()
