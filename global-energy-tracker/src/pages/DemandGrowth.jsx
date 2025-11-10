import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';
import SectoralEnergyGrowth from '../components/SectoralEnergyGrowth';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons, ChartSources } from '../utils/chartExport';

export default function DemandGrowth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('Baseline (STEPS)');

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    fetch('/data/demand_growth_projections.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading projections:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return <div className="text-center py-8">Loading projections...</div>;
  }

  // Prepare data for charts
  const prepareChartData = () => {
    const allYears = data.scenarios[0].data.map(d => d.year);

    return allYears.map(year => {
      const yearData = { year };

      data.scenarios.forEach(scenario => {
        const scenarioData = scenario.data.find(d => d.year === year);
        if (scenarioData) {
          const scenarioKey = scenario.name;
          yearData[`${scenarioKey}_fossil`] = scenarioData.fossil_useful_ej;
          yearData[`${scenarioKey}_clean`] = scenarioData.clean_useful_ej;
          yearData[`${scenarioKey}_total`] = scenarioData.total_useful_ej;
        }
      });

      return yearData;
    });
  };

  const chartData = prepareChartData();

  const COLORS = {
    'Baseline (STEPS)': '#3B82F6',
    'Accelerated (APS)': '#10B981',
    'Net-Zero (NZE)': '#8B5CF6'
  };

  const sources = data.metadata.sources;

  // Export handlers for Total Demand chart
  const handleDownloadTotalPNG = () => {
    const filename = `total-energy-demand-projections-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#total-demand-chart', filename);
  };

  const handleDownloadTotalCSV = () => {
    const filename = `total-energy-demand-projections-${new Date().toISOString().split('T')[0]}`;
    const csvData = chartData.map(row => ({
      Year: row.year,
      'Baseline STEPS (EJ)': row['Baseline (STEPS)_total']?.toFixed(2) || '',
      'Accelerated APS (EJ)': row['Accelerated (APS)_total']?.toFixed(2) || '',
      'Net-Zero NZE (EJ)': row['Net-Zero (NZE)_total']?.toFixed(2) || ''
    }));
    downloadDataAsCSV(csvData, filename);
  };

  // Export handlers for Fossil vs Clean chart
  const handleDownloadMixPNG = () => {
    const filename = `fossil-vs-clean-energy-mix-${selectedScenario.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    downloadChartAsPNG('#energy-mix-chart', filename);
  };

  const handleDownloadMixCSV = () => {
    const filename = `fossil-vs-clean-energy-mix-${selectedScenario.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const csvData = chartData.map(row => ({
      Year: row.year,
      'Fossil Fuels (EJ)': row[`${selectedScenario}_fossil`]?.toFixed(2) || '',
      'Clean Energy (EJ)': row[`${selectedScenario}_clean`]?.toFixed(2) || '',
      'Total (EJ)': row[`${selectedScenario}_total`]?.toFixed(2) || ''
    }));
    downloadDataAsCSV(csvData, filename);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Energy Services Demand Growth Forecast
        </h1>
        <p className="text-sm text-gray-600">
          Comprehensive projections of global useful energy demand (2025-2050) based on IEA, BP, and RMI analysis
        </p>
      </div>

      {/* Sectoral Energy Growth Chart */}
      <SectoralEnergyGrowth />

      {/* Total Demand Projection Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Total Useful Energy Demand Projections
          </h2>
          <ChartExportButtons
            onDownloadPNG={handleDownloadTotalPNG}
            onDownloadCSV={handleDownloadTotalCSV}
          />
        </div>
        <div id="total-demand-chart">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Baseline (STEPS)_total"
                stroke={COLORS['Baseline (STEPS)']}
                strokeWidth={2}
                name="Baseline (STEPS)"
              />
              <Line
                type="monotone"
                dataKey="Accelerated (APS)_total"
                stroke={COLORS['Accelerated (APS)']}
                strokeWidth={2}
                name="Accelerated (APS)"
              />
              <Line
                type="monotone"
                dataKey="Net-Zero (NZE)_total"
                stroke={COLORS['Net-Zero (NZE)']}
                strokeWidth={2}
                name="Net-Zero (NZE)"
              />
            </LineChart>
          </ResponsiveContainer>
          <ChartSources sources={sources} />
        </div>
      </div>

      {/* Fossil vs Clean Stacked Area Chart */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Fossil vs. Clean Energy Mix by Scenario
          </h2>
          <ChartExportButtons
            onDownloadPNG={handleDownloadMixPNG}
            onDownloadCSV={handleDownloadMixCSV}
          />
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mr-2">Select Scenario:</label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="Baseline (STEPS)">Baseline (STEPS)</option>
            <option value="Accelerated (APS)">Accelerated (APS)</option>
            <option value="Net-Zero (NZE)">Net-Zero (NZE)</option>
          </select>
        </div>
        <div id="energy-mix-chart">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Energy (EJ)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={`${selectedScenario}_fossil`}
                stackId="1"
                stroke="#DC2626"
                fill="#DC2626"
                name="Fossil Fuels"
              />
              <Area
                type="monotone"
                dataKey={`${selectedScenario}_clean`}
                stackId="1"
                stroke="#16A34A"
                fill="#16A34A"
                name="Clean Energy"
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartSources sources={sources} />
        </div>
      </div>

      {/* Understanding Demand Growth */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Demand Growth
        </h2>

        <div className="space-y-6 text-gray-700">
          {/* Historical Evolution */}
          <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Historical Evolution (1965-2024)</h3>
            <p className="mb-2">
              Global energy service demand grew from ~80 EJ in 1965 to ~230 EJ in 2024, driven primarily by fossil fuels.
              Industrial sectors (iron & steel, chemicals, cement) dominated early growth, while transport and residential sectors accelerated post-1990.
            </p>
            <p>
              Clean energy's share remained under 20% until 2020, when solar and wind deployment accelerated significantly.
              Fossil fuels still power ~80% of global energy services in 2024.
            </p>
          </div>

          {/* Which Sources Meet Demand */}
          <div className="bg-green-50 p-5 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Which Sources Are Meeting Demand?</h3>
            <p className="mb-2">
              <strong>Fossil fuels</strong> (coal, oil, gas) continue to meet ~80% of new demand growth, particularly in transport and heavy industry.
              Oil dominates road transport and aviation, while coal powers industrial heat in Asia.
            </p>
            <p>
              <strong>Clean energy</strong> (nuclear, hydro, wind, solar) is growing 3x faster than fossil fuels but from a smaller base.
              Solar and wind are rapidly displacing fossil electricity, while EVs are beginning to displace oil in transport.
            </p>
          </div>

          {/* Fastest and Slowest Growing Sectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-5 rounded-lg border-l-4 border-emerald-600">
              <h3 className="font-bold text-lg text-gray-800 mb-2">Fastest Growing Sectors</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Residential Cooling:</strong> Rising temperatures and middle-class growth drive AC demand in Asia and Africa</li>
                <li><strong>Aviation:</strong> Air travel recovering and expanding in emerging markets</li>
                <li><strong>Residential Appliances:</strong> Electrification and rising living standards</li>
              </ul>
              <p className="mt-2 text-sm italic">These sectors offer opportunities for clean electrification.</p>
            </div>

            <div className="bg-red-50 p-5 rounded-lg border-l-4 border-red-600">
              <h3 className="font-bold text-lg text-gray-800 mb-2">Slowest Growing / Declining Sectors</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Pulp & Paper:</strong> Declining due to digitalization</li>
                <li><strong>Iron & Steel:</strong> Slow growth as infrastructure matures in developed economies</li>
                <li><strong>Cement:</strong> Slowing as urbanization peaks in China</li>
              </ul>
              <p className="mt-2 text-sm italic">Fossil-intensive sectors offering limited growth pressure.</p>
            </div>
          </div>

          {/* IEA Forecast Scenarios */}
          <div className="bg-purple-50 p-5 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg text-gray-800 mb-3">IEA Energy Demand Forecasts (2025-2050)</h3>
            <div className="space-y-3">
              <div>
                <strong className="text-blue-800">Baseline (STEPS):</strong>
                <span className="ml-2">Current policies scenario. Fossil fuels peak ~2035 at 150 EJ, then slowly decline as clean energy grows 3 EJ/year. Total demand grows ~1%/year due to efficiency gains.</span>
              </div>
              <div>
                <strong className="text-green-800">Accelerated (APS):</strong>
                <span className="ml-2">All announced pledges implemented. Fossil fuels peak by 2030. Clean energy grows 5 EJ/year. Enhanced efficiency (1.2%/year) moderates total demand growth.</span>
              </div>
              <div>
                <strong className="text-purple-800">Net-Zero (NZE):</strong>
                <span className="ml-2">Paris Agreement targets met. Fossil fuels peak by 2028 and decline rapidly. Aggressive clean deployment (8 EJ/year) plus efficiency gains (1.8%/year) enable net-zero by 2050.</span>
              </div>
            </div>
          </div>

          {/* Uncertainty Note */}
          <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Forecasting Uncertainty</h3>
            <p className="mb-2">
              Energy demand projections carry significant uncertainty. Key variables include:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Economic growth rates:</strong> Especially in China, India, and Africa</li>
              <li><strong>Technology deployment:</strong> Speed of EV, heat pump, and renewable adoption</li>
              <li><strong>Policy implementation:</strong> Whether climate pledges translate to action</li>
              <li><strong>Efficiency improvements:</strong> Actual vs. projected energy intensity reductions</li>
            </ul>
            <p className="mt-2 text-sm italic">
              Historical forecasts have consistently underestimated clean energy growth while overestimating fossil demand.
              The actual trajectory will depend heavily on near-term policy and investment decisions.
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
