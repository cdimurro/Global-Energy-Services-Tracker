import { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

// Sector color palette
const SECTOR_COLORS = {
  'transport_road': '#3b82f6',
  'transport_aviation': '#60a5fa',
  'transport_shipping': '#93c5fd',
  'transport_rail': '#dbeafe',
  'industry_iron_steel': '#ef4444',
  'industry_chemicals': '#f87171',
  'industry_cement': '#fca5a5',
  'industry_aluminum': '#fecaca',
  'industry_pulp_paper': '#fee2e2',
  'other_industry': '#fef2f2',
  'residential_heating': '#f59e0b',
  'residential_appliances': '#fbbf24',
  'residential_cooling': '#fcd34d',
  'commercial_buildings': '#10b981',
  'agriculture': '#34d399'
};

const SECTOR_NAMES = {
  'transport_road': 'Road Transport',
  'transport_aviation': 'Aviation',
  'transport_shipping': 'Shipping',
  'transport_rail': 'Rail',
  'industry_iron_steel': 'Iron & Steel',
  'industry_chemicals': 'Chemicals',
  'industry_cement': 'Cement',
  'industry_aluminum': 'Aluminum',
  'industry_pulp_paper': 'Pulp & Paper',
  'other_industry': 'Other Industry',
  'residential_heating': 'Residential Heating',
  'residential_appliances': 'Residential Appliances',
  'residential_cooling': 'Residential Cooling',
  'commercial_buildings': 'Commercial Buildings',
  'agriculture': 'Agriculture'
};

export default function DisplacementBySector() {
  const [width] = useWindowSize();
  const [sectorData, setSectorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displacementData, setDisplacementData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'current', '5year', '10year', 'all'
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/data/sectoral_energy_timeseries_2004_2024.json')
      .then(res => res.json())
      .then(data => {
        setSectorData(data);
        calculateSectorDisplacement(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading sectoral data:', err);
        setLoading(false);
      });
  }, []);

  const calculateSectorDisplacement = (data) => {
    const timeseries = data.data;

    // Define time periods
    const periods = {
      current: { years: 1, label: '2023-2024' },
      '5year': { years: 5, label: 'Last 5 Years (2019-2024)' },
      '10year': { years: 10, label: 'Last 10 Years (2014-2024)' },
      'all': { years: timeseries.length - 1, label: 'All Years (2004-2024)' }
    };

    const sectorDisplacement = {};

    Object.keys(periods).forEach(periodKey => {
      const period = periods[periodKey];
      const startIdx = Math.max(0, timeseries.length - 1 - period.years);
      const endIdx = timeseries.length - 1;

      const startYear = timeseries[startIdx];
      const endYear = timeseries[endIdx];

      // Get all sector keys
      const sectorKeys = Object.keys(startYear.sectors);

      // Calculate displacement for each sector
      const sectors = sectorKeys.map(sectorKey => {
        const startData = startYear.sectors[sectorKey];
        const endData = endYear.sectors[sectorKey];

        const cleanGrowth = endData.clean_ej - startData.clean_ej;
        const fossilChange = endData.fossil_ej - startData.fossil_ej;
        const totalGrowth = endData.total_ej - startData.total_ej;
        const annualCleanGrowth = cleanGrowth / period.years;
        const annualTotalGrowth = totalGrowth / period.years;

        // Calculate growth rate
        let growthRate;
        if (startData.total_ej > 0) {
          growthRate = ((endData.total_ej / startData.total_ej) - 1) * 100 / period.years;
        } else {
          growthRate = 0;
        }

        // Calculate fossil intensity change
        const fossilIntensityChange = endData.fossil_share - startData.fossil_share;

        return {
          sector: sectorKey,
          name: SECTOR_NAMES[sectorKey] || sectorKey,
          cleanGrowth: cleanGrowth,
          fossilChange: fossilChange,
          totalGrowth: totalGrowth,
          annualCleanGrowth: annualCleanGrowth,
          annualTotalGrowth: annualTotalGrowth,
          growthRate: growthRate,
          startTotal: startData.total_ej,
          endTotal: endData.total_ej,
          startFossilShare: startData.fossil_share,
          endFossilShare: endData.fossil_share,
          fossilIntensityChange: fossilIntensityChange,
          color: SECTOR_COLORS[sectorKey] || '#9ca3af'
        };
      });

      // Sort by clean growth (descending)
      sectors.sort((a, b) => b.cleanGrowth - a.cleanGrowth);

      // Calculate totals
      const totalCleanGrowth = sectors.reduce((sum, s) => sum + Math.max(0, s.cleanGrowth), 0);
      const totalAnnualClean = sectors.reduce((sum, s) => sum + Math.max(0, s.annualCleanGrowth), 0);

      sectorDisplacement[periodKey] = {
        sectors,
        totalCleanGrowth,
        totalAnnualClean,
        period: period.label
      };
    });

    setDisplacementData(sectorDisplacement);
  };

  if (loading || !sectorData || !displacementData.all) {
    return <div className="text-center py-8">Loading sector displacement data...</div>;
  }

  const currentData = displacementData[selectedPeriod];

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, `displacement_by_sector_${selectedPeriod}`);
  };

  const downloadCSV = () => {
    const csvData = [];

    // Add header
    csvData.push(['Sector', 'Start Total (EJ)', 'End Total (EJ)', 'Total Growth (EJ)', 'Clean Growth (EJ)', 'Fossil Change (EJ)', 'Annual Clean Growth (EJ/year)', 'Annual Growth Rate (%)', 'Fossil Share Change']);

    // Add data rows
    currentData.sectors.forEach(sector => {
      csvData.push([
        sector.name,
        sector.startTotal.toFixed(3),
        sector.endTotal.toFixed(3),
        sector.totalGrowth.toFixed(3),
        sector.cleanGrowth.toFixed(3),
        sector.fossilChange.toFixed(3),
        sector.annualCleanGrowth.toFixed(3),
        sector.growthRate.toFixed(2),
        sector.fossilIntensityChange.toFixed(3)
      ]);
    });

    // Add totals
    csvData.push([
      'TOTAL',
      '',
      '',
      '',
      currentData.totalCleanGrowth.toFixed(3),
      '',
      currentData.totalAnnualClean.toFixed(3),
      '',
      ''
    ]);

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `displacement_by_sector_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-lg mb-3">{label}</div>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Annual Clean Growth:</strong> {data.annualCleanGrowth > 0 ? '+' : ''}{data.annualCleanGrowth.toFixed(3)} EJ/year
          </div>
          <div>
            <strong>Total Clean Growth:</strong> {data.cleanGrowth > 0 ? '+' : ''}{data.cleanGrowth.toFixed(2)} EJ
          </div>
          <div>
            <strong>Total Growth Rate:</strong> {data.growthRate > 0 ? '+' : ''}{data.growthRate.toFixed(1)}% per year
          </div>
          <div className="border-t pt-2 mt-2">
            <div><strong>Fossil Change:</strong> {data.fossilChange > 0 ? '+' : ''}{data.fossilChange.toFixed(2)} EJ</div>
            <div><strong>Fossil Share Change:</strong> {data.fossilIntensityChange > 0 ? '+' : ''}{(data.fossilIntensityChange * 100).toFixed(1)}%</div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div><strong>Start Total:</strong> {data.startTotal.toFixed(2)} EJ</div>
            <div><strong>End Total:</strong> {data.endTotal.toFixed(2)} EJ</div>
          </div>
        </div>
      </div>
    );
  };

  // Responsive chart heights
  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 500 : width < 1024 ? 700 : 1000;
    }
    return 500;
  };

  // Render chart content (used in both normal and fullscreen modes)
  const renderChartContent = () => (
    <>
      {/* Period Selector */}
      <div className="mb-8">
        <label className="block text-lg font-semibold mb-3 text-gray-700">
          Time Period:
        </label>
        <div className="flex gap-3 flex-wrap">
          {Object.keys(displacementData).map(periodKey => (
            <button
              key={periodKey}
              onClick={() => setSelectedPeriod(periodKey)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedPeriod === periodKey
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {displacementData[periodKey].period}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
          <div className="text-green-700 text-sm font-semibold uppercase tracking-wide mb-2">
            Total Clean Energy Growth
          </div>
          <div className="text-5xl font-bold text-gray-900">
            {currentData.totalCleanGrowth.toFixed(1)}
            <span className="text-2xl ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Total clean exergy services added across all sectors
          </div>
        </div>

        <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-600">
          <div className="text-blue-700 text-sm font-semibold uppercase tracking-wide mb-2">
            Annual Average
          </div>
          <div className="text-5xl font-bold text-gray-900">
            {currentData.totalAnnualClean.toFixed(2)}
            <span className="text-2xl ml-2 text-gray-500">EJ/year</span>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Average annual clean energy growth rate
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Annual Clean Energy Growth by Sector</h3>
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <BarChart
            data={currentData.sectors}
            margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13 }}
              angle={-45}
              textAnchor="end"
              height={120}
            />
            <YAxis
              tick={{ fontSize: 13 }}
              label={{
                value: 'Annual Clean Growth (EJ/year)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 14, fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" strokeWidth={1.5} />
            <Bar dataKey="annualCleanGrowth" radius={[8, 8, 0, 0]}>
              {currentData.sectors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="mt-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sector</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Start (EJ)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">End (EJ)</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Growth</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Clean Growth</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Fossil Change</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Annual Clean</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Growth Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Fossil Δ</th>
              </tr>
            </thead>
            <tbody>
              {currentData.sectors.map((sector, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: sector.color }}
                      />
                      <span className="font-semibold text-gray-900">{sector.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sector.startTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sector.endTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={sector.totalGrowth > 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {sector.totalGrowth > 0 ? '+' : ''}{sector.totalGrowth.toFixed(2)} EJ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={sector.cleanGrowth > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {sector.cleanGrowth > 0 ? '+' : ''}{sector.cleanGrowth.toFixed(2)} EJ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={sector.fossilChange > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {sector.fossilChange > 0 ? '+' : ''}{sector.fossilChange.toFixed(2)} EJ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={sector.annualCleanGrowth > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {sector.annualCleanGrowth > 0 ? '+' : ''}{sector.annualCleanGrowth.toFixed(3)} EJ/yr
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {sector.growthRate > 0 ? '+' : ''}{sector.growthRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={sector.fossilIntensityChange < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {sector.fossilIntensityChange > 0 ? '+' : ''}{(sector.fossilIntensityChange * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{currentData.totalCleanGrowth.toFixed(2)} EJ
                </td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-green-600">
                  +{currentData.totalAnnualClean.toFixed(3)} EJ/year
                </td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center mt-4">
        Data sources: Our World in Data, IEA Energy End-uses database 2024
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Clean Energy Displacement by Sector
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
        title="Clean Energy Displacement by Sector"
        description="Analysis of clean energy growth across different energy sectors"
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
