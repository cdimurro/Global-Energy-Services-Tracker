import { useState, useEffect, useRef, useMemo } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';
import { getRegionColor } from '../utils/colors';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

// Default regions to show (major economies + regions)
const DEFAULT_REGIONS = ['China', 'United States', 'Europe', 'India', 'Japan'];

// All available regions categorized
const REGION_CATEGORIES = {
  'Major Economies': ['China', 'United States', 'India', 'Japan', 'Germany', 'United Kingdom', 'France', 'Brazil', 'Canada', 'South Korea', 'Russia', 'Indonesia', 'Mexico', 'Saudi Arabia', 'Australia', 'Spain', 'South Africa'],
  'Continental': ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'],
  'Economic Groups': ['European Union', 'OECD', 'Non-OECD']
};

export default function DisplacementByRegion() {
  const [width] = useWindowSize();
  const [regionalData, setRegionalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState(DEFAULT_REGIONS);
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/data/regional_energy_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setRegionalData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading regional data:', err);
        setLoading(false);
      });
  }, []);

  // Get timeline data for selected regions - showing net change in fossil fuel consumption
  const timelineData = useMemo(() => {
    if (!regionalData || !selectedRegions.length) return [];

    // Find common year range
    const years = [];
    const firstRegion = selectedRegions[0];
    if (regionalData.regions[firstRegion]) {
      regionalData.regions[firstRegion].data.forEach(d => {
        if (d.year >= 2000) { // Show from 2000 onwards for clarity
          years.push(d.year);
        }
      });
    }

    return years.map(year => {
      const point = { year };
      selectedRegions.forEach(region => {
        const regionData = regionalData.regions[region]?.data;
        if (regionData) {
          const yearData = regionData.find(d => d.year === year);
          if (yearData) {
            // Calculate net change in fossil fuel consumption from previous year
            const prevYearData = regionData.find(d => d.year === year - 1);
            if (prevYearData) {
              const fossilChange = (yearData.fossil_useful_ej || 0) - (prevYearData.fossil_useful_ej || 0);
              point[region] = fossilChange;
            }
          }
        }
      });
      return point;
    });
  }, [regionalData, selectedRegions]);

  const toggleRegion = (region) => {
    if (selectedRegions.includes(region)) {
      if (selectedRegions.length > 1) {
        setSelectedRegions(selectedRegions.filter(r => r !== region));
      }
    } else {
      if (selectedRegions.length < 8) {
        setSelectedRegions([...selectedRegions, region]);
      }
    }
  };

  const selectCategory = (category) => {
    const regions = REGION_CATEGORIES[category];
    setSelectedRegions(regions.slice(0, 8)); // Max 8 regions
  };

  if (loading || !regionalData) {
    return <div className="text-center py-8">Loading regional displacement data...</div>;
  }

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, 'net_fossil_change_by_region');
  };

  const downloadCSV = () => {
    const csvData = [];
    const headers = ['Year', ...selectedRegions];
    csvData.push(headers);

    timelineData.forEach(d => {
      const row = [d.year];
      selectedRegions.forEach(region => {
        row.push(d[region]?.toFixed(3) || '');
      });
      csvData.push(row);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'net_fossil_change_by_region.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-3">{label}</div>
        <div className="space-y-2 text-sm">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium">{entry.name}:</span>
              <span className={entry.value < 0 ? 'text-green-600' : 'text-red-600'}>
                {entry.value > 0 ? '+' : ''}{entry.value?.toFixed(3)} EJ
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 500 : width < 1024 ? 700 : 800;
    }
    return 450;
  };

  const renderChartContent = () => (
    <>
      {/* Region Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Select Regions to Compare (max 8):
        </label>
        <div className="flex gap-2 mb-3 flex-wrap">
          {Object.keys(REGION_CATEGORIES).map(category => (
            <button
              key={category}
              onClick={() => selectCategory(category)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(regionalData.regions).map(region => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedRegions.includes(region)
                  ? 'ring-2 ring-offset-1'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedRegions.includes(region) ? {
                backgroundColor: getRegionColor(region),
                color: 'white',
                ringColor: getRegionColor(region)
              } : {}}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Net Change in Fossil Fuel Consumption</h3>
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <LineChart
            data={timelineData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{
                value: 'Net Change (EJ/year)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 13, fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            {selectedRegions.map(region => (
              <Line
                key={region}
                type="monotone"
                dataKey={region}
                stroke={getRegionColor(region)}
                strokeWidth={2}
                dot={false}
                name={region}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-gray-500 text-center mt-4">
        Negative values indicate fossil fuel consumption is declining. Data sources: Our World in Data, BP Statistical Review, Energy Institute
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Displacement by Region
          </h2>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={downloadPNG}
              onDownloadCSV={downloadCSV}
            />
            <FullscreenButton onClick={() => setIsFullscreen(true)} />
          </div>
        </div>

        <div ref={chartRef}>
          {renderChartContent()}
        </div>
      </div>

      {/* Fullscreen View */}
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Displacement by Region"
        description="Compare net change in fossil fuel consumption across different countries and regions"
        exportButtons={
          <ChartExportButtons
            onDownloadPNG={downloadPNG}
            onDownloadCSV={downloadCSV}
          />
        }
      >
        {renderChartContent()}
      </ChartFullscreenModal>
    </>
  );
}
