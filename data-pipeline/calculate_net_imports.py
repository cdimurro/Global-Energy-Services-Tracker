import pandas as pd
import json
import os

# Configuration
INPUT_FILE = 'downloads/owid_energy_data.csv'
OUTPUT_FILE = '../global-energy-tracker/public/data/regional_net_imports_timeseries.json'

# Efficiency factors for converting primary to useful energy
EFFICIENCY_FACTORS = {
    'coal': 0.30,
    'oil': 0.35,
    'gas': 0.40
}

# Continental regions (for aggregation)
CONTINENTAL_REGIONS = {
    'Africa': [
        'South Africa', 'Nigeria', 'Egypt', 'Algeria', 'Morocco', 'Ethiopia',
        'Kenya', 'Tanzania', 'Ghana', 'Angola', 'Sudan', 'Tunisia', 'Libya',
        'Mozambique', 'Zambia', 'Zimbabwe', 'Uganda', 'Senegal', 'Mali',
        'Cameroon', 'Ivory Coast', 'Madagascar', 'Burkina Faso', 'Niger',
        'Malawi', 'Mauritius', 'Namibia', 'Botswana', 'Gabon', 'Guinea',
        'Rwanda', 'Benin', 'Burundi', 'Eritrea', 'Central African Republic',
        'Chad', 'Congo', 'Democratic Republic of Congo', 'Djibouti',
        'Equatorial Guinea', 'Gambia', 'Guinea-Bissau', 'Lesotho', 'Liberia',
        'Mauritania', 'Reunion', 'Sao Tome and Principe', 'Seychelles',
        'Sierra Leone', 'Somalia', 'South Sudan', 'Togo', 'Western Sahara'
    ],
    'Asia': [
        'China', 'India', 'Japan', 'South Korea', 'Indonesia', 'Thailand',
        'Malaysia', 'Taiwan', 'Singapore', 'Philippines', 'Vietnam', 'Pakistan',
        'Bangladesh', 'Iran', 'Iraq', 'Saudi Arabia', 'Turkey', 'United Arab Emirates',
        'Israel', 'Kuwait', 'Qatar', 'Myanmar', 'Sri Lanka', 'Kazakhstan',
        'Uzbekistan', 'Afghanistan', 'Nepal', 'Yemen', 'Syria', 'Jordan',
        'Lebanon', 'Oman', 'Bahrain', 'Cambodia', 'Laos', 'Mongolia',
        'Brunei', 'Timor-Leste', 'North Korea', 'Turkmenistan', 'Tajikistan',
        'Kyrgyzstan', 'Armenia', 'Georgia', 'Azerbaijan', 'Bhutan', 'Maldives',
        'Palestine', 'Hong Kong', 'Macao'
    ],
    'Europe': [
        'Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Poland',
        'Netherlands', 'Belgium', 'Russia', 'Norway', 'Sweden', 'Austria',
        'Switzerland', 'Denmark', 'Finland', 'Portugal', 'Czech Republic',
        'Greece', 'Hungary', 'Romania', 'Ireland', 'Slovakia', 'Bulgaria',
        'Croatia', 'Lithuania', 'Slovenia', 'Latvia', 'Estonia', 'Luxembourg',
        'Cyprus', 'Malta', 'Iceland', 'Albania', 'Serbia', 'Bosnia and Herzegovina',
        'North Macedonia', 'Montenegro', 'Moldova', 'Belarus', 'Ukraine',
        'Liechtenstein', 'Monaco', 'Andorra', 'San Marino', 'Vatican',
        'Kosovo', 'Faroe Islands', 'Gibraltar', 'Greenland', 'Isle of Man',
        'Jersey', 'Guernsey'
    ],
    'North America': [
        'United States', 'Canada', 'Mexico', 'Guatemala', 'Cuba', 'Haiti',
        'Dominican Republic', 'Honduras', 'Nicaragua', 'El Salvador',
        'Costa Rica', 'Panama', 'Jamaica', 'Trinidad and Tobago', 'Belize',
        'Bahamas', 'Barbados', 'Saint Lucia', 'Grenada', 'Saint Vincent and the Grenadines',
        'Antigua and Barbuda', 'Dominica', 'Saint Kitts and Nevis',
        'Aruba', 'Bermuda', 'Cayman Islands', 'Curacao', 'Puerto Rico',
        'Sint Maarten (Dutch part)', 'Turks and Caicos Islands',
        'British Virgin Islands', 'Caribbean Netherlands', 'Guadeloupe',
        'Martinique', 'Montserrat', 'Saint Barthelemy', 'Saint Martin (French part)',
        'Saint Pierre and Miquelon', 'United States Virgin Islands'
    ],
    'South America': [
        'Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela',
        'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname',
        'French Guiana', 'Falkland Islands'
    ],
    'Oceania': [
        'Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Islands',
        'New Caledonia', 'French Polynesia', 'Samoa', 'Vanuatu', 'Guam',
        'Kiribati', 'Micronesia (country)', 'Tonga', 'Palau', 'Cook Islands',
        'Nauru', 'Tuvalu', 'Marshall Islands', 'American Samoa', 'Northern Mariana Islands',
        'Wallis and Futuna', 'Niue', 'Tokelau'
    ]
}

# Individual countries to include (targeting key importers and exporters that match Regions page)
COUNTRIES = [
    'Australia', 'Brazil', 'Canada', 'China', 'France', 'Germany',
    'India', 'Indonesia', 'Japan', 'Mexico', 'Russia', 'Saudi Arabia',
    'South Africa', 'South Korea', 'United Kingdom', 'United States'
]

def calculate_net_imports():
    """
    Calculate net energy imports (consumption - production) by region and fuel type.
    Converts from TWh to EJ and applies efficiency factors for useful energy.
    """
    print("Loading OWID energy dataset...")
    df = pd.read_csv(INPUT_FILE)

    # Filter to years with data
    df = df[df['year'] >= 1965]

    # Get all countries that are in continental regions or in our country list
    all_countries_needed = set(COUNTRIES)
    for continent_countries in CONTINENTAL_REGIONS.values():
        all_countries_needed.update(continent_countries)

    # Filter to only the countries we need
    df = df[df['country'].isin(all_countries_needed)]

    print(f"Processing data from {df['year'].min()} to {df['year'].max()}")

    # Initialize results structure
    results = {
        'metadata': {
            'title': 'Regional Net Energy Imports Over Time',
            'description': 'Net imports (consumption - production) by region and fuel type. Positive values indicate net imports, negative values indicate net exports.',
            'units': 'EJ (exajoules)',
            'source': 'Our World in Data - Energy Dataset',
            'last_updated': '2025',
            'conversion_factor': '1 EJ = 277.778 TWh',
            'efficiency_factors': EFFICIENCY_FACTORS
        },
        'regions': []
    }

    # First, calculate Global totals by summing all regions for each year
    print("Calculating global totals...")
    global_years = {}
    for country in df['country'].unique():
        country_data = df[df['country'] == country]
        for _, row in country_data.iterrows():
            year = int(row['year'])
            if year not in global_years:
                global_years[year] = {
                    'coal': {'primary_ej': 0, 'useful_ej': 0},
                    'oil': {'primary_ej': 0, 'useful_ej': 0},
                    'gas': {'primary_ej': 0, 'useful_ej': 0}
                }

            # Handle NaN values
            coal_consumption = 0 if pd.isna(row.get('coal_consumption', 0)) else row.get('coal_consumption', 0)
            coal_production = 0 if pd.isna(row.get('coal_production', 0)) else row.get('coal_production', 0)
            oil_consumption = 0 if pd.isna(row.get('oil_consumption', 0)) else row.get('oil_consumption', 0)
            oil_production = 0 if pd.isna(row.get('oil_production', 0)) else row.get('oil_production', 0)
            gas_consumption = 0 if pd.isna(row.get('gas_consumption', 0)) else row.get('gas_consumption', 0)
            gas_production = 0 if pd.isna(row.get('gas_production', 0)) else row.get('gas_production', 0)

            # Calculate net imports in TWh then convert to EJ
            coal_net_ej = (coal_consumption - coal_production) / 277.778
            oil_net_ej = (oil_consumption - oil_production) / 277.778
            gas_net_ej = (gas_consumption - gas_production) / 277.778

            # Add to global totals
            global_years[year]['coal']['primary_ej'] += coal_net_ej
            global_years[year]['coal']['useful_ej'] += coal_net_ej * EFFICIENCY_FACTORS['coal']
            global_years[year]['oil']['primary_ej'] += oil_net_ej
            global_years[year]['oil']['useful_ej'] += oil_net_ej * EFFICIENCY_FACTORS['oil']
            global_years[year]['gas']['primary_ej'] += gas_net_ej
            global_years[year]['gas']['useful_ej'] += gas_net_ej * EFFICIENCY_FACTORS['gas']

    # Build Global region entry
    global_entry = {
        'region': 'Global',
        'years': []
    }
    for year in sorted(global_years.keys()):
        year_data = global_years[year]
        # Calculate totals
        total_primary = year_data['coal']['primary_ej'] + year_data['oil']['primary_ej'] + year_data['gas']['primary_ej']
        total_useful = year_data['coal']['useful_ej'] + year_data['oil']['useful_ej'] + year_data['gas']['useful_ej']

        global_entry['years'].append({
            'year': year,
            'coal': {
                'primary_ej': round(year_data['coal']['primary_ej'], 4),
                'useful_ej': round(year_data['coal']['useful_ej'], 4)
            },
            'oil': {
                'primary_ej': round(year_data['oil']['primary_ej'], 4),
                'useful_ej': round(year_data['oil']['useful_ej'], 4)
            },
            'gas': {
                'primary_ej': round(year_data['gas']['primary_ej'], 4),
                'useful_ej': round(year_data['gas']['useful_ej'], 4)
            },
            'total': {
                'primary_ej': round(total_primary, 4),
                'useful_ej': round(total_useful, 4)
            }
        })

    # Add Global entry first
    results['regions'].append(global_entry)
    print(f"  - Global totals calculated for {len(global_entry['years'])} years")

    # Calculate continental region totals
    print("Calculating continental region totals...")
    for continent, countries in sorted(CONTINENTAL_REGIONS.items()):
        continent_years = {}

        # Sum data from all countries in this continent
        for country in countries:
            country_data = df[df['country'] == country]
            if country_data.empty:
                continue

            for _, row in country_data.iterrows():
                year = int(row['year'])
                if year not in continent_years:
                    continent_years[year] = {
                        'coal': {'primary_ej': 0, 'useful_ej': 0},
                        'oil': {'primary_ej': 0, 'useful_ej': 0},
                        'gas': {'primary_ej': 0, 'useful_ej': 0}
                    }

                # Handle NaN values
                coal_consumption = 0 if pd.isna(row.get('coal_consumption', 0)) else row.get('coal_consumption', 0)
                coal_production = 0 if pd.isna(row.get('coal_production', 0)) else row.get('coal_production', 0)
                oil_consumption = 0 if pd.isna(row.get('oil_consumption', 0)) else row.get('oil_consumption', 0)
                oil_production = 0 if pd.isna(row.get('oil_production', 0)) else row.get('oil_production', 0)
                gas_consumption = 0 if pd.isna(row.get('gas_consumption', 0)) else row.get('gas_consumption', 0)
                gas_production = 0 if pd.isna(row.get('gas_production', 0)) else row.get('gas_production', 0)

                # Calculate net imports in TWh then convert to EJ
                coal_net_ej = (coal_consumption - coal_production) / 277.778
                oil_net_ej = (oil_consumption - oil_production) / 277.778
                gas_net_ej = (gas_consumption - gas_production) / 277.778

                # Add to continent totals
                continent_years[year]['coal']['primary_ej'] += coal_net_ej
                continent_years[year]['coal']['useful_ej'] += coal_net_ej * EFFICIENCY_FACTORS['coal']
                continent_years[year]['oil']['primary_ej'] += oil_net_ej
                continent_years[year]['oil']['useful_ej'] += oil_net_ej * EFFICIENCY_FACTORS['oil']
                continent_years[year]['gas']['primary_ej'] += gas_net_ej
                continent_years[year]['gas']['useful_ej'] += gas_net_ej * EFFICIENCY_FACTORS['gas']

        # Build continent entry
        if continent_years:
            continent_entry = {
                'region': continent,
                'years': []
            }
            for year in sorted(continent_years.keys()):
                year_data = continent_years[year]
                total_primary = year_data['coal']['primary_ej'] + year_data['oil']['primary_ej'] + year_data['gas']['primary_ej']
                total_useful = year_data['coal']['useful_ej'] + year_data['oil']['useful_ej'] + year_data['gas']['useful_ej']

                continent_entry['years'].append({
                    'year': year,
                    'coal': {
                        'primary_ej': round(year_data['coal']['primary_ej'], 4),
                        'useful_ej': round(year_data['coal']['useful_ej'], 4)
                    },
                    'oil': {
                        'primary_ej': round(year_data['oil']['primary_ej'], 4),
                        'useful_ej': round(year_data['oil']['useful_ej'], 4)
                    },
                    'gas': {
                        'primary_ej': round(year_data['gas']['primary_ej'], 4),
                        'useful_ej': round(year_data['gas']['useful_ej'], 4)
                    },
                    'total': {
                        'primary_ej': round(total_primary, 4),
                        'useful_ej': round(total_useful, 4)
                    }
                })

            results['regions'].append(continent_entry)
            print(f"  - {continent} calculated for {len(continent_entry['years'])} years")

    # Process individual countries
    print("Processing individual countries...")
    for country in COUNTRIES:
        country_data = df[df['country'] == country].sort_values('year')

        region_entry = {
            'region': country,
            'years': []
        }

        # Process each year
        for _, row in country_data.iterrows():
            year = int(row['year'])

            # Calculate net imports for each fuel type (TWh)
            # Net imports = consumption - production (positive = importer, negative = exporter)

            # Handle NaN values from pandas
            coal_consumption = row.get('coal_consumption', 0)
            coal_consumption = 0 if pd.isna(coal_consumption) else coal_consumption
            coal_production = row.get('coal_production', 0)
            coal_production = 0 if pd.isna(coal_production) else coal_production
            coal_net_twh = coal_consumption - coal_production

            oil_consumption = row.get('oil_consumption', 0)
            oil_consumption = 0 if pd.isna(oil_consumption) else oil_consumption
            oil_production = row.get('oil_production', 0)
            oil_production = 0 if pd.isna(oil_production) else oil_production
            oil_net_twh = oil_consumption - oil_production

            gas_consumption = row.get('gas_consumption', 0)
            gas_consumption = 0 if pd.isna(gas_consumption) else gas_consumption
            gas_production = row.get('gas_production', 0)
            gas_production = 0 if pd.isna(gas_production) else gas_production
            gas_net_twh = gas_consumption - gas_production

            # Convert TWh to EJ (1 EJ = 277.778 TWh)
            coal_net_ej = coal_net_twh / 277.778
            oil_net_ej = oil_net_twh / 277.778
            gas_net_ej = gas_net_twh / 277.778

            # Calculate useful energy (apply efficiency factors)
            coal_net_useful_ej = coal_net_ej * EFFICIENCY_FACTORS['coal']
            oil_net_useful_ej = oil_net_ej * EFFICIENCY_FACTORS['oil']
            gas_net_useful_ej = gas_net_ej * EFFICIENCY_FACTORS['gas']

            # Calculate totals
            total_net_primary_ej = coal_net_ej + oil_net_ej + gas_net_ej
            total_net_useful_ej = coal_net_useful_ej + oil_net_useful_ej + gas_net_useful_ej

            year_entry = {
                'year': year,
                'coal': {
                    'primary_ej': round(coal_net_ej, 4),
                    'useful_ej': round(coal_net_useful_ej, 4)
                },
                'oil': {
                    'primary_ej': round(oil_net_ej, 4),
                    'useful_ej': round(oil_net_useful_ej, 4)
                },
                'gas': {
                    'primary_ej': round(gas_net_ej, 4),
                    'useful_ej': round(gas_net_useful_ej, 4)
                },
                'total': {
                    'primary_ej': round(total_net_primary_ej, 4),
                    'useful_ej': round(total_net_useful_ej, 4)
                }
            }

            region_entry['years'].append(year_entry)

        # Only include regions with at least some data
        if region_entry['years']:
            results['regions'].append(region_entry)
            print(f"  - {country} processed for {len(region_entry['years'])} years")

    # Save to JSON
    output_path = OUTPUT_FILE
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nSuccessfully generated {output_path}")
    print(f"  - {len(results['regions'])} regions processed")
    print(f"  - Years covered: {df['year'].min()}-{df['year'].max()}")

    # Print sample statistics
    print("\nSample Net Imports for 2024 (Primary Energy, EJ):")
    for region in results['regions'][:5]:
        latest_year = region['years'][-1]
        if latest_year['year'] >= 2020:
            print(f"  {region['region']}: {latest_year['total']['primary_ej']:+.2f} EJ")

if __name__ == '__main__':
    calculate_net_imports()
