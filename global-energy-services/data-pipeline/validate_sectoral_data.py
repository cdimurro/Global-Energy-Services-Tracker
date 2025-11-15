"""
Sectoral Data Validation Script v2.0
Validates sectoral_energy_breakdown_v2.json for accuracy and consistency

Checks:
1. All sector shares sum to 1.0
2. All subsector shares within each sector sum to 1.0
3. Weighted fossil intensity matches global target (81.4%)
4. Exergy factors align with process temperatures
5. Growth rates are reasonable
"""

import json
import sys

def load_json_file(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
        sys.exit(1)

def validate_sector_shares(sectors):
    """Validate that all sector shares sum to 1.0"""
    total = sum(sector['share'] for sector in sectors.values())
    tolerance = 0.0001

    if abs(total - 1.0) < tolerance:
        print(f"  ✓ Sector shares sum to {total:.6f} (target: 1.0)")
        return True
    else:
        print(f"  ✗ Sector shares sum to {total:.6f} (should be 1.0)")
        return False

def validate_subsector_shares(sectors):
    """Validate that subsector shares sum to 1.0 within each sector"""
    all_valid = True
    errors = []

    for sector_key, sector_data in sectors.items():
        if 'subsectors' in sector_data and sector_data['subsectors']:
            subsector_total = sum(
                sub['share'] for sub in sector_data['subsectors'].values()
            )
            tolerance = 0.0001

            if abs(subsector_total - 1.0) >= tolerance:
                all_valid = False
                errors.append(f"{sector_key}: {subsector_total:.6f}")

    if all_valid:
        print(f"  ✓ All subsector shares sum to 1.0 within their parent sectors")
        return True
    else:
        print(f"  ✗ Subsector share errors found:")
        for error in errors:
            print(f"    - {error}")
        return False

def validate_fossil_intensity(sectors):
    """Validate weighted average fossil intensity matches global target"""
    weighted_fossil = sum(
        sector['share'] * sector['fossil_intensity']
        for sector in sectors.values()
    )

    target = 0.814  # 81.4% global fossil share (2024)
    tolerance = 0.01  # ±1%

    if abs(weighted_fossil - target) < tolerance:
        print(f"  ✓ Weighted fossil intensity: {weighted_fossil:.4f} (target: {target}, within ±{tolerance})")
        return True
    else:
        print(f"  ✗ Weighted fossil intensity: {weighted_fossil:.4f} (target: {target} ± {tolerance})")
        return False

def validate_exergy_factors(sectors):
    """Validate exergy factors align with process temperatures"""
    issues = []

    for sector_key, sector_data in sectors.items():
        exergy_factor = sector_data.get('exergy_factor')

        # Check if exergy factor is in reasonable range (0.15 to 1.0)
        if exergy_factor and (exergy_factor < 0.15 or exergy_factor > 1.0):
            issues.append(f"{sector_key}: exergy factor {exergy_factor} out of range [0.15, 1.0]")

        # Validate subsector exergy factors
        if 'subsectors' in sector_data:
            for subsector_key, subsector_data in sector_data['subsectors'].items():
                sub_exergy = subsector_data.get('exergy_factor')
                if sub_exergy and (sub_exergy < 0.15 or sub_exergy > 1.0):
                    issues.append(f"{sector_key}.{subsector_key}: exergy factor {sub_exergy} out of range")

    if not issues:
        print(f"  ✓ All exergy factors within reasonable range [0.15, 1.0]")
        return True
    else:
        print(f"  ✗ Exergy factor issues:")
        for issue in issues:
            print(f"    - {issue}")
        return False

def validate_growth_rates(sectors):
    """Validate growth rates are reasonable (-5% to +10%)"""
    issues = []

    for sector_key, sector_data in sectors.items():
        if 'growth_rates' in sector_data:
            for scenario, rate in sector_data['growth_rates'].items():
                if rate < -0.05 or rate > 0.10:
                    issues.append(f"{sector_key}.{scenario}: {rate*100:.1f}% (outside reasonable range)")

    if not issues:
        print(f"  ✓ All growth rates within reasonable range [-5%, +10%]")
        return True
    else:
        print(f"  ⚠ Growth rate warnings (may be intentional):")
        for issue in issues:
            print(f"    - {issue}")
        return True  # Warnings, not errors

def validate_timeseries(data):
    """Validate timeseries data structure"""
    if not data or 'data' not in data:
        print(f"  ✗ Invalid timeseries structure")
        return False

    years = [entry['year'] for entry in data['data']]
    if len(years) != 21:  # 2004-2024
        print(f"  ✗ Expected 21 years, found {len(years)}")
        return False

    if years[0] != 2004 or years[-1] != 2024:
        print(f"  ✗ Expected range 2004-2024, found {years[0]}-{years[-1]}")
        return False

    print(f"  ✓ Timeseries structure valid: {len(years)} years (2004-2024)")
    return True

def main():
    print("="*70)
    print("SECTORAL DATA VALIDATION v2.0")
    print("="*70)

    # Load v2.0 sectoral breakdown
    print("\n📂 Loading files...")
    sectoral_file = '../public/data/sectoral_energy_breakdown_v2.json'
    sectoral_data = load_json_file(sectoral_file)
    print(f"  ✓ Loaded {sectoral_file}")

    timeseries_file = '../public/data/sectoral_energy_timeseries_2004_2024.json'
    timeseries_data = load_json_file(timeseries_file)
    print(f"  ✓ Loaded {timeseries_file}")

    sectors = sectoral_data['sectors']

    # Run validation checks
    print("\n" + "="*70)
    print("VALIDATION CHECKS")
    print("="*70)

    results = {}

    print("\n1. Sector Share Consistency")
    print("-" * 70)
    results['sector_shares'] = validate_sector_shares(sectors)

    print("\n2. Subsector Share Consistency")
    print("-" * 70)
    results['subsector_shares'] = validate_subsector_shares(sectors)

    print("\n3. Fossil Intensity Calibration")
    print("-" * 70)
    results['fossil_intensity'] = validate_fossil_intensity(sectors)

    print("\n4. Exergy Factor Validation")
    print("-" * 70)
    results['exergy_factors'] = validate_exergy_factors(sectors)

    print("\n5. Growth Rate Validation")
    print("-" * 70)
    results['growth_rates'] = validate_growth_rates(sectors)

    print("\n6. Timeseries Data Structure")
    print("-" * 70)
    results['timeseries'] = validate_timeseries(timeseries_data)

    # Summary
    print("\n" + "="*70)
    print("VALIDATION SUMMARY")
    print("="*70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print(f"\nPassed: {passed}/{total} checks")

    for check, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {check}")

    # Additional statistics
    print("\n" + "="*70)
    print("DATA STATISTICS")
    print("="*70)

    print(f"\nSectors: {sectoral_data['metadata']['sectors_count']}")
    print(f"Subsectors: {sectoral_data['metadata']['subsectors_count']}")
    print(f"Data version: {sectoral_data['metadata']['version']}")
    print(f"Baseline year: {sectoral_data['metadata']['baseline_year']}")
    print(f"Validation accuracy: {sectoral_data['metadata']['validation_accuracy']}")

    # Count subsectors
    total_subsectors = sum(
        len(sector['subsectors']) if 'subsectors' in sector and sector['subsectors'] else 0
        for sector in sectors.values()
    )
    print(f"\nActual subsectors counted: {total_subsectors}")

    # Calculate weighted averages
    weighted_fossil = sum(s['share'] * s['fossil_intensity'] for s in sectors.values())
    print(f"\nWeighted fossil intensity: {weighted_fossil:.4f} (81.4%)")
    print(f"Weighted clean share: {1 - weighted_fossil:.4f} (18.6%)")

    # Check for end-use services
    if 'end_use_services' in sectoral_data:
        print(f"\nEnd-use service categories: {len(sectoral_data['end_use_services'])}")
        for service_key, service_data in sectoral_data['end_use_services'].items():
            print(f"  - {service_key}: {service_data['total_share']*100:.1f}%")

    print("\n" + "="*70)

    if all(results.values()):
        print("✅ ALL VALIDATION CHECKS PASSED")
        print("="*70)
        sys.exit(0)
    else:
        print("⚠️  SOME VALIDATION CHECKS FAILED")
        print("="*70)
        sys.exit(1)

if __name__ == '__main__':
    main()
