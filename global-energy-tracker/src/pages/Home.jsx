import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import InteractiveChart from '../components/InteractiveChart';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for charts - must be before conditional return
  const globalEnergyChartRef = useRef(null);
  const fossilBreakdownChartRef = useRef(null);
  const cleanBreakdownChartRef = useRef(null);

  useEffect(() => {
    fetch('/data/useful_energy_timeseries.json')
      .then(res => res.json())
      .then(jsonData => {
        const latestYear = jsonData.data[jsonData.data.length - 1];
        setData(latestYear);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="text-center py-8">Loading data...</div>;
  }

  const {
    year,
    total_useful_ej,
    fossil_useful_ej,
    clean_useful_ej,
    fossil_share_percent,
    clean_share_percent,
    sources_useful_ej
  } = data;

  // Sort sources by energy amount
  const sortedSources = Object.entries(sources_useful_ej)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  const fossilSources = sortedSources.filter(([source]) =>
    ['oil', 'gas', 'coal'].includes(source)
  );

  const cleanSources = sortedSources.filter(([source]) =>
    !['oil', 'gas', 'coal'].includes(source)
  );

  // Pie chart data
  const pieData = [
    { name: 'Fossil Fuels', value: fossil_useful_ej, percentage: fossil_share_percent },
    { name: 'Clean Energy', value: clean_useful_ej, percentage: clean_share_percent }
  ];

  const COLORS = {
    'Fossil Fuels': '#DC2626',
    'Clean Energy': '#16A34A'
  };

  const renderCustomLabel = (entry) => {
    return `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`;
  };

  // Download functions for Global Energy Services chart
  const downloadGlobalEnergyPNG = () => {
    downloadChartAsPNG(globalEnergyChartRef, `global_energy_services_${year}`);
  };

  const downloadGlobalEnergyCSV = () => {
    const csvData = pieData.map(item => ({
      'Energy Type': item.name,
      'Energy Services (EJ)': item.value.toFixed(2),
      'Share (%)': item.percentage.toFixed(2)
    }));
    downloadDataAsCSV(csvData, `global_energy_services_${year}`);
  };

  // Download functions for Fossil Breakdown chart
  const downloadFossilBreakdownPNG = () => {
    downloadChartAsPNG(fossilBreakdownChartRef, `fossil_fuel_breakdown_${year}`);
  };

  const downloadFossilBreakdownCSV = () => {
    const csvData = fossilSources.map(([source, ej]) => ({
      'Source': getSourceName(source),
      'Energy Services (EJ)': ej.toFixed(2),
      'Share of Fossil (%)': ((ej / fossil_useful_ej) * 100).toFixed(2)
    }));
    downloadDataAsCSV(csvData, `fossil_fuel_breakdown_${year}`);
  };

  // Download functions for Clean Breakdown chart
  const downloadCleanBreakdownPNG = () => {
    downloadChartAsPNG(cleanBreakdownChartRef, `clean_energy_breakdown_${year}`);
  };

  const downloadCleanBreakdownCSV = () => {
    const csvData = cleanSources.map(([source, ej]) => ({
      'Source': getSourceName(source),
      'Energy Services (EJ)': ej.toFixed(2),
      'Share of Clean (%)': ((ej / clean_useful_ej) * 100).toFixed(2)
    }));
    downloadDataAsCSV(csvData, `clean_energy_breakdown_${year}`);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-lg sm:text-3xl md:text-4xl font-bold text-gray-800 mb-1 sm:mb-3 px-2">
          Global Energy Services Tracker
        </h1>
        <p className="text-[10px] sm:text-sm text-gray-600 px-4 leading-tight">
          Get a complete view of the energy system and gain valuable insights by measuring energy services instead of primary energy.
        </p>
      </div>

      {/* Interactive Chart Explorer */}
      <div className="mb-8">
        <InteractiveChart />
      </div>

      {/* Global Energy Services */}
      <div className="metric-card mb-8 bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Global Energy Services for {year}
          </h2>
          <ChartExportButtons
            onDownloadPNG={downloadGlobalEnergyPNG}
            onDownloadCSV={downloadGlobalEnergyCSV}
          />
        </div>

        {/* Total Display */}
        <div className="text-center mb-3 sm:mb-6">
          <div className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-3 text-gray-900">
            {total_useful_ej.toFixed(1)}
            <span className="text-base sm:text-2xl md:text-3xl ml-1 sm:ml-2 text-gray-500">EJ</span>
          </div>
          <div className="text-[10px] sm:text-sm md:text-base text-gray-500 px-2">
            Exajoules of useful energy delivered globally
          </div>
        </div>

        {/* Pie Chart */}
        <div className="mb-3 sm:mb-6" ref={globalEnergyChartRef}>
          <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          <div className="text-xs text-gray-500 text-center mt-2">
            Data sources: Our World in Data, BP Statistical Review
          </div>
          </div>

          {/* Fossil vs Clean Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Fossil Card */}
            <div className="p-3 sm:p-5 bg-red-50 rounded-lg border-l-4 border-red-600">
              <div className="text-red-600 text-xs sm:text-base mb-1 sm:mb-3 uppercase tracking-wide font-semibold">
                Fossil Fuels
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {fossil_useful_ej.toFixed(1)}
                <span className="text-sm sm:text-xl md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
                {fossil_share_percent.toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total energy services</div>
            </div>

            {/* Clean Card */}
            <div className="p-3 sm:p-5 bg-green-50 rounded-lg border-l-4 border-green-600">
              <div className="text-green-600 text-xs sm:text-base mb-1 sm:mb-3 uppercase tracking-wide font-semibold">
                Clean Energy
              </div>
              <div className="text-xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-gray-900">
                {clean_useful_ej.toFixed(1)}
                <span className="text-sm sm:text-xl md:text-2xl ml-1 text-gray-500">EJ</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                {clean_share_percent.toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-sm text-gray-500">of total energy services</div>
            </div>
          </div>
        </div>

        {/* Fossil Fuel Breakdown */}
        <div className="metric-card mb-8 bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Fossil Fuel Breakdown for {year}
            </h2>
            <ChartExportButtons
              onDownloadPNG={downloadFossilBreakdownPNG}
              onDownloadCSV={downloadFossilBreakdownCSV}
            />
          </div>

          <div className="mb-6" ref={fossilBreakdownChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={fossilSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / fossil_useful_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {fossilSources.map(([source], index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[source]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-500 text-center mt-2">
              Data sources: Our World in Data, BP Statistical Review
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fossilSources.map(([source, ej]) => {
              const share = (ej / fossil_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-4 bg-gray-50 rounded-lg border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div
                    className="text-base font-bold mb-2 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color }}>
                    {ej.toFixed(1)}
                    <span className="text-lg ml-1 text-gray-500">EJ</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">of fossil energy</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Energy Breakdown */}
        <div className="metric-card mb-8 bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Clean Energy Breakdown for {year}
            </h2>
            <ChartExportButtons
              onDownloadPNG={downloadCleanBreakdownPNG}
              onDownloadCSV={downloadCleanBreakdownCSV}
            />
          </div>

          <div className="mb-6" ref={cleanBreakdownChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={cleanSources.map(([source, ej]) => ({
                    name: getSourceName(source),
                    value: ej,
                    percentage: (ej / clean_useful_ej) * 100
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} EJ (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {cleanSources.map(([source], index) => (
                    <Cell key={`cell-${index}`} fill={ENERGY_COLORS[source]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-500 text-center mt-2">
              Data sources: Our World in Data, BP Statistical Review
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cleanSources.map(([source, ej]) => {
              const share = (ej / clean_useful_ej) * 100;
              const color = ENERGY_COLORS[source];

              return (
                <div
                  key={source}
                  className="p-3 bg-gray-50 rounded-lg border-t-4 text-center"
                  style={{ borderTopColor: color }}
                >
                  <div
                    className="text-xs font-bold mb-1 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {getSourceName(source)}
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color }}>
                    {ej.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">EJ</div>
                  <div className="text-lg font-semibold text-gray-600">
                    {share.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Understanding Energy Services */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Energy Services
        </h2>

        <div className="space-y-6 text-gray-700">
          {/* What Are Energy Services */}
          <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">What Are Energy Services?</h3>
            <p className="mb-2">
              Energy services are the <strong>useful work</strong> delivered by energy systems: heat in your home, motion in your car, light in your office, or computation in your phone.
              Unlike primary energy (coal, oil, gas at the source), energy services represent the actual benefit we derive from energy.
            </p>
            <p>
              For example: A gas furnace burns 100 units of natural gas but delivers only 80 units of heat to your home.
              An electric heat pump uses 30 units of electricity to deliver the same 80 units of heat. Both deliver identical energy services, but with vastly different primary energy consumption.
            </p>
          </div>

          {/* Why Measure Energy Services */}
          <div className="bg-green-50 p-5 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Why Measure Energy Services Instead of Primary Energy?</h3>
            <p className="mb-2">
              Traditional energy statistics track <strong>primary energy</strong> (what we extract from nature), which creates a misleading picture of the energy transition.
              Because fossil fuels are 35-40% efficient while clean electricity is 85-95% efficient, switching to clean energy dramatically reduces total primary energy needs.
            </p>
            <p className="mb-2">
              <strong>The efficiency multiplier effect:</strong> Every 1 EJ of fossil fuel energy services requires ~2.7 EJ of primary energy.
              The same 1 EJ of electric energy services requires only ~1.1 EJ of primary energy. This means clean energy displaces fossil fuels at a 3:1 ratio.
            </p>
            <p>
              By measuring energy services, we see the real story: how much useful energy humanity consumes, which sources provide it, and how efficiency improvements accelerate the transition.
            </p>
          </div>

          {/* Key Platform Features */}
          <div className="bg-purple-50 p-5 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-3">How This Platform Works</h3>
            <div className="space-y-3">
              <div>
                <strong className="text-blue-800">Displacement Tracking:</strong>
                <span className="ml-2">We calculate how much fossil fuel consumption clean energy displaces each year. The displacement rate (D) shows whether fossil fuels are rising or declining. When D ≥ fossil fuel growth, we've reached peak fossil fuels.</span>
              </div>
              <div>
                <strong className="text-green-800">Sectoral Breakdown:</strong>
                <span className="ml-2">Energy demand varies dramatically by sector. Transport (oil-dominated) differs fundamentally from electricity (rapidly decarbonizing) and industrial heat (coal/gas-intensive). Understanding sectoral patterns reveals where displacement is happening and where it's needed most.</span>
              </div>
              <div>
                <strong className="text-purple-800">Regional Analysis:</strong>
                <span className="ml-2">The energy transition looks different everywhere. Europe achieves 50%+ efficiency with 30% clean share. Asia operates at 35% efficiency with 15% clean share. These differences determine regional transition pathways and timelines.</span>
              </div>
              <div>
                <strong className="text-orange-600">Forecast Scenarios:</strong>
                <span className="ml-2">We project three paths forward based on IEA scenarios (STEPS, APS, NZE). Each scenario assumes different rates of clean energy deployment, efficiency improvements, and policy implementation. The spread shows the range of possible futures.</span>
              </div>
            </div>
          </div>

          {/* Example Calculations */}
          <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Example: The 3:1 Displacement Ratio</h3>
            <p className="mb-3">
              Consider replacing 1 million gas cars (30% efficient) with 1 million EVs (85% efficient):
            </p>
            <ul className="list-disc list-inside space-y-2 mb-3">
              <li><strong>Gas cars:</strong> Require 100 TWh of gasoline primary energy to deliver 30 TWh of motion (energy service)</li>
              <li><strong>EVs:</strong> Require 35 TWh of electricity primary energy to deliver the same 30 TWh of motion</li>
              <li><strong>Result:</strong> Switching saves 65 TWh of primary energy while delivering identical transportation service</li>
            </ul>
            <p className="text-sm italic">
              This efficiency advantage means clean energy doesn't need to grow 1:1 with fossil fuel decline. Every EJ of clean growth can displace ~3 EJ of fossil primary energy.
              This is why tracking energy services reveals the true pace of the transition that primary energy statistics obscure.
            </p>
          </div>

          {/* Data Sources Note */}
          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-gray-400">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Data Sources & Methodology</h3>
            <p className="mb-2">
              This platform combines data from Our World in Data, BP Statistical Review, IEA World Energy Outlook, and IEA Energy Efficiency Indicators.
              We apply efficiency factors from RMI's Inefficiency Trap analysis to convert primary energy to useful energy services.
            </p>
            <p className="text-sm">
              All calculations, assumptions, and data transformations are documented in the Methodology page. Source code and raw data are available on GitHub for full transparency and reproducibility.
            </p>
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}
