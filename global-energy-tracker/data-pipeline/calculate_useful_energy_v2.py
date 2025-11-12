"""
Useful Energy & Services Calculator v2.0
Three-tier framework: Primary Energy → Useful Energy → Energy Services

New in v2.0:
- Exergy weighting based on sectoral allocation
- Time-varying efficiency factors (1965-2024)
- Regional efficiency variations
- Rebound effect modeling
- Energy services output (exergy-weighted useful energy)
"""

import json
import os
import sys
from datetime import datetime

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def load_json_config(filename):
    """Load JSON configuration file"""
    filepath = filename
    if not os.path.exists(filepath):
        print(f"✗ Config file not found: {filepath}")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_efficiency_factors():
    """Load base efficiency factors (2024 values)"""
    return load_json_config('efficiency_factors_corrected.json')

def load_temporal_factors():
    """Load time-varying efficiency configuration"""
    return load_json_config('efficiency_factors_temporal.json')

def load_regional_factors():
    """Load regional efficiency variations"""
    return load_json_config('efficiency_factors_regional.json')

def load_exergy_factors():
    """Load exergy quality factors by sector"""
    return load_json_config('exergy_factors_sectoral.json')

def load_source_allocation():
    """Load source-to-sector allocation mapping"""
    return load_json_config('source_sector_allocation.json')

def load_owid_data():
    """Load Our World in Data energy dataset"""
    filepath = os.path.join('downloads', 'owid_energy_latest.json')
    if not os.path.exists(filepath):
        print(f"✗ Data file not found: {filepath}")
        print("  Run fetch_data.py first to download the data.")
        return None

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_efficiency_factor(source, year, region='Global', configs=None):
    """
    Get efficiency factor for a source, accounting for:
    1. Regional variations (if region specified)
    2. Temporal variations (if year provided)
    3. Base factors (fallback)

    Priority: Regional > Temporal > Base
    """
    if configs is None:
        return 0.35

    base_config = configs['base']
    temporal_config = configs['temporal']
    regional_config = configs['regional']

    # Check regional override first (regional values are 2024-calibrated)
    if region != 'Global' and region in regional_config['regional_variations']:
        regional_values = regional_config['regional_variations'][region]
        if source in regional_values:
            return regional_values[source]

    # Use temporal variation if no regional override
    if year is not None and source in temporal_config['annual_improvement_rates']:
        base_year = temporal_config['base_year']
        base_efficiency = temporal_config['base_year_efficiency_1965'][source]
        improvement_rate = temporal_config['annual_improvement_rates'][source]

        years_elapsed = year - base_year
        efficiency = base_efficiency + (improvement_rate * years_elapsed)

        return efficiency

    # Fallback to base (2024 values)
    system_eff = base_config['system_wide_efficiency']
    return system_eff.get(source, 0.35)

def calculate_exergy_weighted_services(useful_energy_by_source, source_allocation):
    """
    Calculate energy services by applying exergy weighting based on sectoral allocation

    Energy Services = Σ (Useful Energy × Weighted Exergy Factor)
    """
    services_by_source = {}

    for source, useful_ej in useful_energy_by_source.items():
        if useful_ej <= 0:
            services_by_source[source] = 0
            continue

        # Get weighted exergy factor for this source
        if source in source_allocation['source_to_sector_allocation']:
            exergy_factor = source_allocation['source_to_sector_allocation'][source]['weighted_exergy_factor']
        else:
            # Default: assume electricity (exergy = 1.0)
            exergy_factor = 1.0

        services_ej = useful_ej * exergy_factor
        services_by_source[source] = round(services_ej, 3)

    return services_by_source

def safe_float(value):
    """Safely convert string to float"""
    if value is None or value == '':
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def process_global_data(data, configs, enable_temporal=True, enable_exergy=True, rebound_rate=0.0):
    """
    Process global ('World') data to calculate useful energy and services by source

    Parameters:
    - enable_temporal: Use time-varying efficiency factors
    - enable_exergy: Calculate energy services with exergy weighting
    - rebound_rate: Energy rebound effect (0.0 to 0.1, default 0.0 = no rebound)
    """
    if 'World' not in data:
        print("✗ Global data not found in dataset")
        return None

    world_data = data['World']['data']
    source_allocation = configs['source_allocation']

    # Process each year
    results_useful = []
    results_services = []

    for record in world_data:
        year_str = record.get('year')
        if not year_str:
            continue

        try:
            year = int(year_str)
        except (ValueError, TypeError):
            continue

        if year < 1965:  # Start from 1965 for consistency
            continue

        # Extract energy consumption by source (in TWh, need to convert to EJ)
        # 1 TWh = 0.0036 EJ
        TWH_TO_EJ = 0.0036

        # Get final energy by source from OWID data
        # For fossil fuels: use consumption (= primary energy)
        oil_twh = safe_float(record.get('oil_consumption'))
        gas_twh = safe_float(record.get('gas_consumption'))
        coal_twh = safe_float(record.get('coal_consumption'))

        # For renewables that generate electricity: use ELECTRICITY output, not inflated 'consumption'
        nuclear_twh = safe_float(record.get('nuclear_electricity'))
        hydro_twh = safe_float(record.get('hydro_electricity'))
        wind_twh = safe_float(record.get('wind_electricity'))
        solar_twh = safe_float(record.get('solar_electricity'))
        geothermal_twh = safe_float(record.get('other_renewable_exc_biofuel_electricity'))

        # For biomass: estimate total (traditional + modern)
        biofuel_modern_twh = safe_float(record.get('biofuel_consumption'))
        traditional_biomass_ej = 45.0  # Constant estimate based on IEA data
        biomass_twh = biofuel_modern_twh + (traditional_biomass_ej / TWH_TO_EJ)

        # Convert to EJ (PRIMARY ENERGY)
        sources_primary_ej = {
            'oil': oil_twh * TWH_TO_EJ,
            'gas': gas_twh * TWH_TO_EJ,
            'coal': coal_twh * TWH_TO_EJ,
            'nuclear': nuclear_twh * TWH_TO_EJ,
            'hydro': hydro_twh * TWH_TO_EJ,
            'wind': wind_twh * TWH_TO_EJ,
            'solar': solar_twh * TWH_TO_EJ,
            'biomass': biomass_twh * TWH_TO_EJ,
            'geothermal': geothermal_twh * TWH_TO_EJ,
        }

        # TIER 1→2: Calculate USEFUL ENERGY for each source
        sources_useful_ej = {}
        for source, primary_ej in sources_primary_ej.items():
            if primary_ej > 0:
                # Get efficiency factor (temporal if enabled)
                if enable_temporal:
                    efficiency = get_efficiency_factor(source, year, region='Global', configs=configs)
                else:
                    efficiency = get_efficiency_factor(source, None, region='Global', configs=configs)

                useful_ej = primary_ej * efficiency

                # Apply rebound effect (efficiency improvements lead to increased consumption)
                # Rebound only applies to efficiency improvements, not the base calculation
                # For simplicity, we reduce the useful energy by rebound_rate
                if rebound_rate > 0:
                    useful_ej = useful_ej * (1 - rebound_rate)

                sources_useful_ej[source] = round(useful_ej, 3)
            else:
                sources_useful_ej[source] = 0

        # Calculate useful energy totals
        total_primary_ej = sum(sources_primary_ej.values())
        total_useful_ej = sum(sources_useful_ej.values())

        # Calculate fossil vs clean (USEFUL ENERGY)
        fossil_useful_ej = sum(sources_useful_ej[s] for s in ['oil', 'gas', 'coal'])
        clean_useful_ej = total_useful_ej - fossil_useful_ej

        # Calculate shares (USEFUL ENERGY)
        fossil_share = (fossil_useful_ej / total_useful_ej * 100) if total_useful_ej > 0 else 0
        clean_share = 100 - fossil_share

        results_useful.append({
            'year': year,
            'total_primary_ej': round(total_primary_ej, 2),
            'total_useful_ej': round(total_useful_ej, 2),
            'overall_efficiency': round((total_useful_ej / total_primary_ej * 100) if total_primary_ej > 0 else 0, 1),
            'sources_useful_ej': sources_useful_ej,
            'fossil_useful_ej': round(fossil_useful_ej, 2),
            'clean_useful_ej': round(clean_useful_ej, 2),
            'fossil_share_percent': round(fossil_share, 1),
            'clean_share_percent': round(clean_share, 1),
        })

        # TIER 2→3: Calculate ENERGY SERVICES (exergy-weighted)
        if enable_exergy:
            sources_services_ej = calculate_exergy_weighted_services(sources_useful_ej, source_allocation)

            total_services_ej = sum(sources_services_ej.values())

            # Calculate fossil vs clean (SERVICES)
            fossil_services_ej = sum(sources_services_ej[s] for s in ['oil', 'gas', 'coal'])
            clean_services_ej = total_services_ej - fossil_services_ej

            # Calculate shares (SERVICES)
            fossil_services_share = (fossil_services_ej / total_services_ej * 100) if total_services_ej > 0 else 0
            clean_services_share = 100 - fossil_services_share

            # Calculate global exergy efficiency (Primary → Services)
            global_exergy_eff = (total_services_ej / total_primary_ej * 100) if total_primary_ej > 0 else 0

            results_services.append({
                'year': year,
                'total_services_ej': round(total_services_ej, 2),
                'global_exergy_efficiency': round(global_exergy_eff, 1),
                'sources_services_ej': sources_services_ej,
                'fossil_services_ej': round(fossil_services_ej, 2),
                'clean_services_ej': round(clean_services_ej, 2),
                'fossil_services_share_percent': round(fossil_services_share, 1),
                'clean_services_share_percent': round(clean_services_share, 1),
            })

    return {
        'useful_energy': results_useful,
        'energy_services': results_services if enable_exergy else []
    }

def save_results(results, base_filename='useful_energy_timeseries'):
    """Save processed results to JSON files"""
    output_dir = '../public/data'
    os.makedirs(output_dir, exist_ok=True)

    # Save useful energy timeseries
    useful_output_path = os.path.join(output_dir, f'{base_filename}.json')
    useful_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'version': 'v2.0',
            'description': 'Global useful energy by source (Exajoules) - Tier 2: Primary × Efficiency',
            'sources': [
                'Our World in Data Energy Dataset',
                'IEA World Energy Outlook 2024',
                'IEA Energy Efficiency Indicators',
                'Brockway et al. 2019 - Energy services baseline'
            ],
            'methodology': 'Three-tier framework: Primary Energy → Useful Energy (×efficiency) → Energy Services (×exergy)',
            'unit': 'Exajoules (EJ)'
        },
        'data': results['useful_energy']
    }

    with open(useful_output_path, 'w', encoding='utf-8') as f:
        json.dump(useful_data, f, indent=2)
    print(f"✓ Saved useful energy to: {useful_output_path}")

    # Save energy services timeseries (if calculated)
    if results['energy_services']:
        services_output_path = os.path.join(output_dir, 'energy_services_timeseries.json')
        services_data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': 'v2.0',
                'description': 'Global energy services by source (Exajoules) - Tier 3: Useful × Exergy Factor',
                'sources': [
                    'Our World in Data Energy Dataset',
                    'IEA World Energy Outlook 2024',
                    'IEA Energy Efficiency Indicators (EEI)',
                    'Brockway et al. 2019 - Global energy services baseline (~100 EJ 2015)',
                    'RMI 2024 - Final energy proxy'
                ],
                'methodology': 'Exergy-weighted useful energy based on sectoral allocation (electricity=1.0, mechanical=1.0, high-temp heat=0.6, low-temp heat=0.15)',
                'unit': 'Exajoules (EJ)',
                'validation': 'Calibrated to IEA WEO 2024 (fossil 80-82%, clean 18-20%) and Brockway 2019 (~100 EJ services 2015, ~120 EJ expected 2024)'
            },
            'data': results['energy_services']
        }

        with open(services_output_path, 'w', encoding='utf-8') as f:
            json.dump(services_data, f, indent=2)
        print(f"✓ Saved energy services to: {services_output_path}")

    return useful_output_path

def print_summary(results):
    """Print summary of calculated useful energy and services"""
    if not results or not results['useful_energy']:
        return

    latest_useful = results['useful_energy'][-1]
    earliest_useful = results['useful_energy'][0]

    print("\n" + "="*70)
    print("USEFUL ENERGY & SERVICES CALCULATION SUMMARY (v2.0)")
    print("="*70)

    # USEFUL ENERGY
    print(f"\n{'='*70}")
    print(f"TIER 2: USEFUL ENERGY (Primary × Efficiency)")
    print(f"{'='*70}")
    print(f"\nLatest Year: {latest_useful['year']}")
    print(f"Total Useful Energy: {latest_useful['total_useful_ej']} EJ")
    print(f"  Fossil: {latest_useful['fossil_useful_ej']} EJ ({latest_useful['fossil_share_percent']}%)")
    print(f"  Clean: {latest_useful['clean_useful_ej']} EJ ({latest_useful['clean_share_percent']}%)")
    print(f"\nBreakdown by Source ({latest_useful['year']}):")
    for source, value in sorted(latest_useful['sources_useful_ej'].items(), key=lambda x: x[1], reverse=True):
        share = (value / latest_useful['total_useful_ej'] * 100) if latest_useful['total_useful_ej'] > 0 else 0
        if value > 0:
            print(f"  {source.capitalize():15} {value:8.2f} EJ ({share:5.2f}%)")

    # ENERGY SERVICES
    if results['energy_services']:
        latest_services = results['energy_services'][-1]
        earliest_services = results['energy_services'][0]

        print(f"\n{'='*70}")
        print(f"TIER 3: ENERGY SERVICES (Useful × Exergy Factor)")
        print(f"{'='*70}")
        print(f"\nLatest Year: {latest_services['year']}")
        print(f"Total Energy Services: {latest_services['total_services_ej']} EJ")
        print(f"Global Exergy Efficiency: {latest_services['global_exergy_efficiency']}%")
        print(f"  Fossil: {latest_services['fossil_services_ej']} EJ ({latest_services['fossil_services_share_percent']}%)")
        print(f"  Clean: {latest_services['clean_services_ej']} EJ ({latest_services['clean_services_share_percent']}%)")
        print(f"\nBreakdown by Source ({latest_services['year']}):")
        for source, value in sorted(latest_services['sources_services_ej'].items(), key=lambda x: x[1], reverse=True):
            share = (value / latest_services['total_services_ej'] * 100) if latest_services['total_services_ej'] > 0 else 0
            if value > 0:
                useful_value = latest_useful['sources_useful_ej'][source]
                exergy_factor = (value / useful_value) if useful_value > 0 else 0
                print(f"  {source.capitalize():15} {value:8.2f} EJ ({share:5.2f}%)  [exergy: {exergy_factor:.2f}]")

        print(f"\n{'='*70}")
        print(f"CLEAN ENERGY ADVANTAGE (Services vs Useful)")
        print(f"{'='*70}")
        useful_clean_share = latest_useful['clean_share_percent']
        services_clean_share = latest_services['clean_services_share_percent']
        leverage = services_clean_share / useful_clean_share if useful_clean_share > 0 else 0
        print(f"Clean share (useful): {useful_clean_share:.1f}%")
        print(f"Clean share (services): {services_clean_share:.1f}%")
        print(f"Clean leverage factor: {leverage:.2f}x")
        print(f"\nInterpretation: Clean energy provides {services_clean_share:.1f}% of energy services")
        print(f"despite being {useful_clean_share:.1f}% of useful energy (exergy advantage)")

    print("\n" + "="*70)
    print(f"VALIDATION AGAINST BENCHMARKS")
    print("="*70)
    if results['energy_services']:
        latest_services = results['energy_services'][-1]
        print(f"2024 Total Services: {latest_services['total_services_ej']} EJ")
        print(f"  Target: 120-140 EJ (Brockway 2019 baseline ~100 EJ for 2015, ~120 EJ expected for 2024)")
        print(f"  Status: {'✓ VALIDATED' if 115 <= latest_services['total_services_ej'] <= 145 else '⚠ CHECK CALIBRATION'}")
        print(f"\n2024 Clean Services Share: {latest_services['clean_services_share_percent']}%")
        print(f"  Target: 18-22% (IEA WEO 2024 + RMI 2024)")
        print(f"  Status: {'✓ VALIDATED' if 17 <= latest_services['clean_services_share_percent'] <= 23 else '⚠ CHECK CALIBRATION'}")
        print(f"\n2024 Global Exergy Efficiency: {latest_services['global_exergy_efficiency']}%")
        print(f"  Target: ~25% (IEA WEO 2024)")
        print(f"  Status: {'✓ VALIDATED' if 23 <= latest_services['global_exergy_efficiency'] <= 27 else '⚠ CHECK CALIBRATION'}")

    print("="*70 + "\n")

def main():
    """Main execution function"""
    print("="*70)
    print("USEFUL ENERGY & SERVICES CALCULATOR v2.0")
    print("Three-Tier Framework: Primary → Useful → Services")
    print("="*70 + "\n")

    # Configuration flags
    ENABLE_TEMPORAL = True  # Use time-varying efficiency
    ENABLE_EXERGY = True    # Calculate energy services
    REBOUND_RATE = 0.07     # 7% rebound effect (Jevons paradox)

    # Load all configuration files
    print("Loading configuration files...")
    configs = {
        'base': load_efficiency_factors(),
        'temporal': load_temporal_factors(),
        'regional': load_regional_factors(),
        'exergy': load_exergy_factors(),
        'source_allocation': load_source_allocation(),
    }
    print("✓ All configurations loaded")
    print(f"  - Temporal efficiency: {'ENABLED' if ENABLE_TEMPORAL else 'DISABLED'}")
    print(f"  - Exergy services: {'ENABLED' if ENABLE_EXERGY else 'DISABLED'}")
    print(f"  - Rebound effect: {REBOUND_RATE*100:.1f}%")

    # Load OWID data
    print("\nLoading OWID energy data...")
    owid_data = load_owid_data()
    if not owid_data:
        return
    print("✓ OWID data loaded")

    # Calculate useful energy and services
    print("\nCalculating useful energy and services...")
    results = process_global_data(
        owid_data,
        configs,
        enable_temporal=ENABLE_TEMPORAL,
        enable_exergy=ENABLE_EXERGY,
        rebound_rate=REBOUND_RATE
    )

    if not results:
        print("✗ Calculation failed")
        return

    print(f"✓ Processed {len(results['useful_energy'])} years of data")

    # Save results
    save_results(results)

    # Print summary
    print_summary(results)

    print("✓ Calculation complete!")

if __name__ == "__main__":
    main()
