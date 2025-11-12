import { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '@react-hook/window-size';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { downloadChartAsPNG, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from './ChartFullscreenModal';
import FullscreenButton from './FullscreenButton';

export default function DisplacementTracker() {
  const [width] = useWindowSize();  // Dynamic window size for responsive charts
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [periodData, setPeriodData] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetch('/data/energy_services_timeseries.json')
      .then(res => res.json())
      .then(data => {
        setEnergyData(data);
        calculateDisplacement(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading energy data:', err);
        setLoading(false);
      });
  }, []);

  const calculateDisplacement = (data) => {
    const timeseries = data.data;
    if (timeseries.length < 2) return;

    // Define periods
    const periods = {
      current: { years: 1, label: '2024' },
      '5year': { years: 5, label: 'Last 5 Years (2019-2024)' },
      '10year': { years: 10, label: 'Last 10 Years (2014-2024)' },
      'all': { years: timeseries.length - 1, label: 'All Years (1965-2024)' }
    };

    const calculations = {};

    Object.keys(periods).forEach(periodKey => {
      const period = periods[periodKey];
      const startIdx = Math.max(0, timeseries.length - 1 - period.years);
      const endIdx = timeseries.length - 1;

      const startYear = timeseries[startIdx];
      const endYear = timeseries[endIdx];

      // Calculate fossil fuel growth
      const fossilGrowthValue = endYear.fossil_services_ej - startYear.fossil_services_ej;

      // Calculate clean growth
      const cleanGrowth = endYear.clean_services_ej - startYear.clean_services_ej;

      // Displacement (D) = clean energy growth (positive only)
      const displacementValue = Math.max(0, cleanGrowth);

      // Total Energy Service Growth (Energy Services Demand)
      const totalEnergyGrowthValue = endYear.total_services_ej - startYear.total_services_ej;
      const totalEnergyGrowthPercentValue = startYear.total_services_ej > 0
        ? (totalEnergyGrowthValue / startYear.total_services_ej) * 100
        : 0;

      // Net Change = Fossil Fuel Growth - Clean Displacement
      // Positive value means growth exceeds displacement (fossil rising)
      // Negative value means displacement exceeds growth (fossil declining)
      const netChangeValue = fossilGrowthValue - displacementValue;
      const netChangePercentValue = startYear.fossil_services_ej > 0
        ? (netChangeValue / startYear.fossil_services_ej) * 100
        : 0;

      // Relative changes for clean and fossil
      const cleanRelativeChangeValue = startYear.clean_services_ej > 0
        ? (cleanGrowth / startYear.clean_services_ej) * 100
        : 0;
      const fossilRelativeChangeValue = startYear.fossil_services_ej > 0
        ? (fossilGrowthValue / startYear.fossil_services_ej) * 100
        : 0;

      // Determine status based on net change
      let status;
      if (cleanGrowth < 0) {
        status = 'recarbonization';
      } else if (netChangeValue > 0.5) {
        // Fossil consumption is rising significantly
        status = 'rising';
      } else if (Math.abs(netChangeValue) <= 0.5) {
        // Fossil consumption is roughly flat (within 0.5 EJ)
        status = 'peak';
      } else {
        // Fossil consumption is declining
        status = 'declining';
      }

      calculations[periodKey] = {
        displacementRate: displacementValue,
        fossilGrowth: fossilGrowthValue,
        netChange: netChangeValue,
        totalEnergyGrowth: totalEnergyGrowthValue,
        totalEnergyGrowthPercent: totalEnergyGrowthPercentValue,
        netChangePercent: netChangePercentValue,
        cleanRelativeChange: cleanRelativeChangeValue,
        fossilRelativeChange: fossilRelativeChangeValue,
        status,
        period: period.label
      };
    });

    setPeriodData(calculations);
  };

  if (loading || !energyData || !periodData.current) {
    return <div className="text-center py-8">Loading displacement data...</div>;
  }

  const currentData = periodData[selectedPeriod];

  // Bar chart data
  const barChartData = [
    {
      name: 'Clean Displacement',
      value: Math.max(0, currentData.displacementRate),
      percent: currentData.cleanRelativeChange,
      color: '#16A34A',
      label: 'Clean Displacement (D)'
    },
    {
      name: 'Fossil Fuel Growth',
      value: Math.max(0, currentData.fossilGrowth),
      percent: currentData.fossilRelativeChange,
      color: '#DC2626',
      label: 'Fossil Fuel Growth'
    },
    {
      name: 'Net Change',
      value: currentData.netChange,
      percent: currentData.netChangePercent,
      color: '#9333EA',
      label: 'Net Change'
    }
  ];

  // Custom tooltip for bar chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 mb-2">{data.label}</p>
          <p className="text-sm text-gray-700">
            Annual Change: {data.value > 0 ? '+' : ''}{data.value.toFixed(2)} EJ ({data.percent > 0 ? '+' : ''}{data.percent.toFixed(2)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recarbonization': return '#7C2D12'; // dark red/brown
      case 'rising': return '#DC2626'; // red
      case 'peak': return '#F59E0B'; // yellow/orange
      case 'declining': return '#16A34A'; // green
      default: return '#6B7280'; // gray
    }
  };

  const getStatusText = (status, periodLabel) => {
    const periodText = periodLabel === '2024' ? 'in 2024' : `(${periodLabel})`;
    switch (status) {
      case 'recarbonization': return 'Recarbonization';
      case 'rising': return `Fossil Fuel Consumption\nIncreased ${periodText}`;
      case 'peak': return 'Peak Reached';
      case 'declining': return `Consumption Declining ${periodText}`;
      default: return 'Unknown';
    }
  };

  const getStatusDescription = (status, periodLabel) => {
    const periodText = periodLabel === '2024' ? 'in 2024' : `over ${periodLabel.toLowerCase()}`;
    switch (status) {
      case 'recarbonization':
        return `Clean energy services shrank ${periodText}. Fossil fuels expanded to meet all energy demand.`;
      case 'rising':
        return `Clean energy grew ${periodText}, but fossil fuel demand grew by more.`;
      case 'peak':
        return `Clean growth perfectly balanced fossil demand changes ${periodText}. Fossil consumption was flat.`;
      case 'declining':
        return `Clean energy growth exceeded fossil demand growth ${periodText}. Fossil consumption declined.`;
      default:
        return '';
    }
  };

  const downloadPNG = () => {
    downloadChartAsPNG(chartRef, 'displacement_tracker_2024');
  };

  const downloadCSV = () => {
    if (!energyData) return;

    const timeseries = energyData.data;
    const csvData = [];

    // Add header
    csvData.push(['Year', 'Displacement (EJ/year)', 'Fossil Growth (EJ/year)', 'Clean Growth (EJ/year)', 'Net Change (EJ/year)', 'Status', 'Fossil Total (EJ)', 'Clean Total (EJ)']);

    // Calculate for all years
    for (let i = 1; i < timeseries.length; i++) {
      const prev = timeseries[i - 1];
      const curr = timeseries[i];

      const fossilGrowthValue = curr.fossil_services_ej - prev.fossil_services_ej;
      const cleanGrowthValue = curr.clean_services_ej - prev.clean_services_ej;

      // Displacement is clean growth (if positive)
      const displacementValue = Math.max(0, cleanGrowthValue);

      // Net Change = Fossil Fuel Growth - Clean Displacement
      const netChangeValue = fossilGrowthValue - displacementValue;

      let status;
      if (displacementValue < fossilGrowthValue) {
        status = 'Displacement < Fossil Fuel Growth (Consumption Rising)';
      } else if (Math.abs(displacementValue - fossilGrowthValue) < 0.01) {
        status = 'Displacement = Fossil Fuel Growth (Peak Reached)';
      } else {
        status = 'Displacement > Fossil Fuel Growth (Consumption Declining)';
      }

      csvData.push([
        curr.year,
        displacementValue.toFixed(4),
        fossilGrowthValue.toFixed(4),
        cleanGrowthValue.toFixed(4),
        netChangeValue.toFixed(4),
        status,
        curr.fossil_services_ej.toFixed(4),
        curr.clean_services_ej.toFixed(4)
      ]);
    }

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'displacement_tracker_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Responsive chart heights: maximized for fullscreen with room for metrics cards
  // In fullscreen, the 2-column layout with metrics cards is displayed alongside chart
  const getChartHeight = () => {
    if (isFullscreen) {
      return width < 640 ? 500 : width < 1024 ? 700 : 850;
    }
    return 350;
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
          {Object.keys(periodData).map(periodKey => (
            <button
              key={periodKey}
              onClick={() => setSelectedPeriod(periodKey)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                selectedPeriod === periodKey
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
              }`}
            >
              {periodData[periodKey].period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Bar Chart Visualization */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full">
            <ResponsiveContainer width="100%" height={getChartHeight()}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status indicator below chart */}
          <div className="mt-4 text-center w-full">
            <div
              className="text-xl font-bold mb-1"
              style={{ color: getStatusColor(currentData.status) }}
            >
              {getStatusText(currentData.status, currentData.period)}
            </div>
            <div className="text-sm text-gray-600">
              Net Change: {currentData.netChange > 0 ? '+' : ''}{currentData.netChange.toFixed(2)} EJ
            </div>
          </div>

          {/* Color-coded legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16A34A' }}></div>
              <span className="text-sm font-medium text-gray-700">Clean Displacement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
              <span className="text-sm font-medium text-gray-700">Fossil Fuel Growth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9333EA' }}></div>
              <span className="text-sm font-medium text-gray-700">Net Change</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics and Status */}
        <div className="flex flex-col justify-center space-y-6">
          {/* Total Energy Service Growth */}
          <div className="p-4 sm:p-6 bg-green-50 rounded-lg border-l-4 border-green-600">
            <div className="text-green-700 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">
              Total Energy Service Growth
            </div>
            <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
              {currentData.totalEnergyGrowth > 0 ? '+' : ''}{currentData.totalEnergyGrowth.toFixed(2)}
              <span className="text-base sm:text-xl md:text-2xl ml-1 sm:ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-green-600 mt-2">
              {currentData.totalEnergyGrowthPercent > 0 ? '+' : ''}{currentData.totalEnergyGrowthPercent.toFixed(2)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">
              New demand for energy services ({currentData.period})
            </div>
          </div>

          {/* Net Change in Fossil Fuel Consumption */}
          <div className="p-4 sm:p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
            <div className="text-red-700 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2">
              Net Change in Fossil Fuel Consumption
            </div>
            <div className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
              {currentData.netChange > 0 ? '+' : ''}{currentData.netChange.toFixed(2)}
              <span className="text-base sm:text-xl md:text-2xl ml-1 sm:ml-2 text-gray-500">EJ</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-red-600 mt-2">
              {currentData.netChangePercent > 0 ? '+' : ''}{currentData.netChangePercent.toFixed(2)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">
              Change in fossil fuel consumption ({currentData.period})
            </div>
          </div>

          {/* Status Description */}
          <div
            className="p-6 rounded-lg border-l-4"
            style={{
              backgroundColor: `${getStatusColor(currentData.status)}10`,
              borderLeftColor: getStatusColor(currentData.status)
            }}
          >
            <div
              className="text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: getStatusColor(currentData.status) }}
            >
              Current Status
            </div>
            <div className="text-gray-700">
              {getStatusDescription(currentData.status, currentData.period)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Formula Explanation */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-gray-800 mb-2">
            Peak Fossil Fuel Consumption Occurs When:
          </div>
          <div className="text-2xl font-mono text-gray-900">
            Clean Energy Displacement ≥ Fossil Fuel Growth
          </div>
        </div>
        <div className="text-sm text-gray-600 text-center max-w-3xl mx-auto">
          When clean energy displacement (D) meets or exceeds fossil fuel growth for a sustained period,
          fossil fuel consumption peaks and begins to decline. Net Change shows the actual change in fossil consumption.
        </div>
        <div className="text-xs text-gray-500 text-center mt-4">
          Data sources: Our World in Data, BP Statistical Review
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Normal View */}
      <div className="metric-card bg-white mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Fossil Fuel Displacement Tracker (2024)
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
        title="Fossil Fuel Displacement Tracker (2024)"
        description="Real-time tracking of clean energy displacement vs fossil fuel growth"
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
