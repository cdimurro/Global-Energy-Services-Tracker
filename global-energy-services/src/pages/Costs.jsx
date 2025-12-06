import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/PageLayout';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ENERGY_COLORS, getSourceName } from '../utils/colors';
import { downloadChartAsPNG, downloadDataAsCSV, ChartExportButtons } from '../utils/chartExport';
import ChartFullscreenModal from '../components/ChartFullscreenModal';
import FullscreenButton from '../components/FullscreenButton';
import AIChatbot from '../components/AIChatbot';

export default function Costs() {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fullscreen states
  const [isFullscreenChart1, setIsFullscreenChart1] = useState(false);
  const [isFullscreenChart2, setIsFullscreenChart2] = useState(false);
  const [isFullscreenChart3, setIsFullscreenChart3] = useState(false);

  // Filters
  const [scenario, setScenario] = useState('Baseline');
  const [selectedRegions, setSelectedRegions] = useState(['Global']);
  const [sccEnabled, setSccEnabled] = useState(false);
  const [sccLevel, setSccLevel] = useState('moderate');
  const [selectedSources, setSelectedSources] = useState(['solar', 'wind', 'nuclear', 'gas', 'coal']);
  const [viewMode, setViewMode] = useState('individual'); // 'allSources', 'grouped', 'allFossil', 'allClean', 'individual'
  const [interactiveMode, setInteractiveMode] = useState('trends'); // 'trends', 'scenarios', 'breakdown'

  // Load cost data
  useEffect(() => {
    fetch('/data/full_system_costs.json')
      .then(res => res.json())
      .then(data => {
        setCostData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading cost data:', err);
        setLoading(false);
      });
  }, []);

  const scenarios = useMemo(() => costData ? Object.keys(costData.scenarios) : [], [costData]);
  const allRegions = useMemo(() => costData ? Object.keys(costData.scenarios[scenario]?.regions || {}) : [], [costData, scenario]);
  const sources = useMemo(() => ['solar', 'wind', 'nuclear', 'gas', 'coal', 'hydro', 'oil', 'biofuels', 'other_renewables'], []);

  // Source selection handlers - FIXED LOGIC
  const selectAllSources = () => {
    setViewMode('allSources');
    setSelectedSources(sources);
  };

  const selectGrouped = () => {
    setViewMode('grouped');
    setSelectedSources(['oil', 'gas', 'coal', 'solar', 'wind', 'nuclear', 'hydro', 'biofuels', 'other_renewables']);
  };

  const selectAllFossil = () => {
    setViewMode('allFossil');
    setSelectedSources(['oil', 'gas', 'coal']);
  };

  const selectAllClean = () => {
    setViewMode('allClean');
    setSelectedSources(['solar', 'wind', 'nuclear', 'hydro', 'biofuels', 'other_renewables']);
  };

  const toggleSource = (source) => {
    // FIXED: Only switch to individual mode when transitioning FROM category mode
    if (viewMode !== 'individual') {
      // First click from category mode - replace selection with this source
      setViewMode('individual');
      setSelectedSources([source]);
    } else {
      // Already in individual mode - toggle the source
      setSelectedSources(prev => {
        if (prev.includes(source)) {
          // Remove source (but keep at least one)
          const newSources = prev.filter(s => s !== source);
          return newSources.length > 0 ? newSources : [source];
        } else {
          // Add source
          return [...prev, source];
        }
      });
    }
  };

  // Region selection handler - single selection only
  const selectRegion = (region) => {
    setSelectedRegions([region]);
  };

  // Get timeseries data for selected scenario and primary region
  const primaryRegion = selectedRegions[0] || 'Global';
  const timeseriesData = useMemo(() => {
    if (!costData) return [];
    return costData.scenarios[scenario]?.regions[primaryRegion]?.timeseries || [];
  }, [costData, scenario, primaryRegion]);

  // Prepare chart data: System LCOES Trends over time (primary region)
  const lcoesTrendsData = useMemo(() => {
    return timeseriesData.map(yearData => {
      const point = { year: yearData.year };
      selectedSources.forEach(source => {
        if (yearData.sources[source]) {
          const baseCost = yearData.sources[source].base_lcoe_mwh + yearData.sources[source].total_system_cost_mwh;
          const sccCost = sccEnabled ? yearData.sources[source].scc_cost_mwh : 0;
          point[source] = baseCost + sccCost;
        }
      });
      return point;
    });
  }, [timeseriesData, selectedSources, sccEnabled]);

  // Prepare chart data: Scenario comparison (for first selected source)
  const comparisonSource = selectedSources[0] || 'solar';
  const scenarioComparisonData = useMemo(() => {
    if (!costData || !timeseriesData.length) return [];
    return timeseriesData.map(yearData => {
      const point = { year: yearData.year };
      scenarios.forEach(scen => {
        const scenData = costData.scenarios[scen]?.regions[primaryRegion]?.timeseries.find(y => y.year === yearData.year);
        if (scenData && scenData.sources[comparisonSource]) {
          const baseCost = scenData.sources[comparisonSource].base_lcoe_mwh + scenData.sources[comparisonSource].total_system_cost_mwh;
          const sccCost = sccEnabled ? scenData.sources[comparisonSource].scc_cost_mwh : 0;
          point[scen] = baseCost + sccCost;
        }
      });
      return point;
    });
  }, [timeseriesData, scenarios, costData, primaryRegion, comparisonSource, sccEnabled]);

  // Prepare chart data: Cost breakdown for latest year (stacked bar)
  const latestYear = useMemo(() => timeseriesData[timeseriesData.length - 1], [timeseriesData]);
  const costBreakdownData = useMemo(() => {
    return selectedSources.map(source => {
      const sourceData = latestYear?.sources?.[source];
      if (!sourceData) return null;

      const sccCost = sccEnabled ? sourceData.scc_cost_mwh : 0;

      return {
        source: getSourceName(source),
        sourceKey: source,
        'Base LCOE': sourceData.base_lcoe_mwh,
        'Firming': sourceData.system_costs?.firming || 0,
        'Storage': sourceData.system_costs?.storage || 0,
        'Grid': sourceData.system_costs?.grid || 0,
        'Capacity': sourceData.system_costs?.capacity || 0,
        'SCC': sccCost,
        total: sourceData.base_lcoe_mwh + sourceData.total_system_cost_mwh + sccCost
      };
    }).filter(d => d !== null);
  }, [selectedSources, latestYear, sccEnabled]);

  // Prepare chart data: Regional comparison for latest year (always show all sources)
  const regionalData = useMemo(() => {
    if (!costData) return [];
    const data = [];
    selectedRegions.forEach(regionName => {
      const regionData = costData.scenarios[scenario]?.regions[regionName];
      const yearData = regionData?.timeseries[regionData.timeseries.length - 1];
      if (yearData) {
        const dataPoint = { region: regionName };
        sources.forEach(source => {
          if (yearData.sources[source]) {
            const baseCost = yearData.sources[source].base_lcoe_mwh + yearData.sources[source].total_system_cost_mwh;
            const sccCost = sccEnabled ? yearData.sources[source].scc_cost_mwh : 0;
            dataPoint[source] = baseCost + sccCost;
          }
        });
        data.push(dataPoint);
      }
    });
    return data;
  }, [costData, scenario, selectedRegions, sources, sccEnabled]);

  // Early return after all hooks are defined
  if (loading || !costData) {
    return (
      <PageLayout
        title="Full System Costs"
        description="Loading comprehensive energy cost analysis..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading cost data...</div>
        </div>
      </PageLayout>
    );
  }

  // Helper functions for chart export
  const handleDownloadPNG = (chartId, filename) => {
    downloadChartAsPNG(chartId, filename);
  };

  const handleDownloadCSV = (data, filename) => {
    downloadDataAsCSV(data, filename);
  };

  // Render function for interactive chart
  const renderInteractiveChart = () => {
    switch(interactiveMode) {
      case 'trends':
        // Handle Fossil vs Clean aggregation
        if (viewMode === 'grouped') {
          const fossilSources = ['oil', 'gas', 'coal'];
          const cleanSources = ['solar', 'wind', 'nuclear', 'hydro', 'biofuels', 'other_renewables'];

          const aggregatedData = lcoesTrendsData.map(yearData => {
            // Calculate weighted average for fossil fuels
            let fossilTotal = 0;
            let fossilCount = 0;
            fossilSources.forEach(source => {
              if (yearData[source] !== undefined) {
                fossilTotal += yearData[source];
                fossilCount++;
              }
            });

            // Calculate weighted average for clean energy
            let cleanTotal = 0;
            let cleanCount = 0;
            cleanSources.forEach(source => {
              if (yearData[source] !== undefined) {
                cleanTotal += yearData[source];
                cleanCount++;
              }
            });

            return {
              year: yearData.year,
              Fossil: fossilCount > 0 ? fossilTotal / fossilCount : 0,
              Clean: cleanCount > 0 ? cleanTotal / cleanCount : 0
            };
          });

          return (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Average total cost per MWh for fossil fuels vs clean energy sources.
                Scenario: <strong>{scenario}</strong>, Region: <strong>{primaryRegion}</strong>
              </p>
              <ResponsiveContainer width="100%" height={400} id="chart-interactive-explorer">
                <LineChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                    formatter={(value) => `$${value.toFixed(0)}/MWh`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Fossil"
                    name="Fossil Fuels"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Clean"
                    name="Clean Energy"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          );
        }

        // Default trends view
        return (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Total cost per MWh including base LCOE + system integration costs{sccEnabled ? ' + social cost of carbon' : ''}.
              Scenario: <strong>{scenario}</strong>, Region: <strong>{primaryRegion}</strong>
            </p>
            <ResponsiveContainer width="100%" height={400} id="chart-interactive-explorer">
              <LineChart data={lcoesTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                  formatter={(value) => `$${value.toFixed(0)}/MWh`}
                />
                <Legend />
                {selectedSources.map(source => (
                  <Line
                    key={source}
                    type="monotone"
                    dataKey={source}
                    name={getSourceName(source)}
                    stroke={ENERGY_COLORS[source]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        );

      case 'scenarios':
        return (
          <>
            <p className="text-sm text-gray-600 mb-4">
              How total system cost evolves under different policy pathways for <strong>{getSourceName(comparisonSource)}</strong>.
              Region: <strong>{primaryRegion}</strong>
            </p>
            <ResponsiveContainer width="100%" height={400} id="chart-interactive-explorer">
              <LineChart data={scenarioComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                  formatter={(value) => `$${value.toFixed(0)}/MWh`}
                />
                <Legend />
                {scenarios.map((scen, idx) => (
                  <Line
                    key={scen}
                    type="monotone"
                    dataKey={scen}
                    name={scen}
                    stroke={['#3B82F6', '#10B981', '#F59E0B'][idx % 3]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <strong>Insight:</strong> Conservative shows slower cost declines (no breakthroughs), Baseline assumes expected progress, Optimistic includes accelerated learning curves and breakthrough technologies.
            </div>
          </>
        );

      case 'breakdown':
        return (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Base generation cost (LCOE) plus system integration costs (firming, storage, grid, capacity){sccEnabled ? ' plus social cost of carbon' : ''}.
              Scenario: <strong>{scenario}</strong>, Region: <strong>{primaryRegion}</strong>, Year: <strong>{latestYear?.year || 2050}</strong>
            </p>
            <ResponsiveContainer width="100%" height={400} id="chart-interactive-explorer">
              <BarChart data={costBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                  formatter={(value) => `$${value.toFixed(0)}/MWh`}
                />
                <Legend />
                <Bar dataKey="Base LCOE" stackId="a" fill="#3B82F6" />
                <Bar dataKey="Firming" stackId="a" fill="#EF4444" />
                <Bar dataKey="Storage" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Grid" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="Capacity" stackId="a" fill="#10B981" />
                {sccEnabled && <Bar dataKey="SCC" stackId="a" fill="#6B7280" />}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-gray-600">
              <strong>Key Insights:</strong>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Fossil fuels have low base LCOE but high external costs (SCC)</li>
                <li>Solar and wind have declining base costs but increasing system costs at high penetration</li>
                <li>Nuclear provides negative system costs at high VRE penetration (grid stability value)</li>
                <li>System costs include: Firming (backup power), Storage (batteries), Grid (transmission), Capacity (reliability)</li>
              </ul>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Full System Costs"
      description="Comprehensive analysis of total energy system costs including generation, integration, and external costs"
    >

      {/* Interactive Chart 1: Unified Cost Comparison */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Interactive Cost Explorer
            </h2>
            <p className="text-sm text-gray-600">
              Comprehensive cost analysis with multiple visualization modes
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* SCC Toggle */}
            <div className="flex items-center gap-3 mr-4">
              <label className="text-sm font-semibold text-gray-700">Social Cost of Carbon</label>
              <button
                onClick={() => setSccEnabled(!sccEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  sccEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sccEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {sccEnabled && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setSccLevel('conservative')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      sccLevel === 'conservative'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    $50
                  </button>
                  <button
                    onClick={() => setSccLevel('moderate')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      sccLevel === 'moderate'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    $200
                  </button>
                  <button
                    onClick={() => setSccLevel('aggressive')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      sccLevel === 'aggressive'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    $400
                  </button>
                </div>
              )}
            </div>

            <ChartExportButtons
              onDownloadPNG={() => handleDownloadPNG('chart-interactive-explorer', `cost_explorer_${interactiveMode}.png`)}
              onDownloadCSV={() => {
                let csvData;
                if (interactiveMode === 'trends') {
                  csvData = lcoesTrendsData.map(d => ({
                    Year: d.year,
                    ...Object.fromEntries(selectedSources.map(s => [getSourceName(s), d[s] ? d[s].toFixed(2) : '']))
                  }));
                } else if (interactiveMode === 'scenarios') {
                  csvData = scenarioComparisonData.map(d => ({
                    Year: d.year,
                    ...Object.fromEntries(scenarios.map(s => [s, d[s] ? d[s].toFixed(2) : '']))
                  }));
                } else {
                  csvData = costBreakdownData.map(d => ({
                    Source: d.source,
                    'Base LCOE': d['Base LCOE'].toFixed(2),
                    Firming: d.Firming.toFixed(2),
                    Storage: d.Storage.toFixed(2),
                    Grid: d.Grid.toFixed(2),
                    Capacity: d.Capacity.toFixed(2),
                    ...(sccEnabled ? { SCC: d.SCC.toFixed(2) } : {}),
                    Total: d.total.toFixed(2)
                  }));
                }
                handleDownloadCSV(csvData, `cost_explorer_${interactiveMode}.csv`);
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart1(true)} />
          </div>
        </div>

        {/* Controls Section - Mode Selection and Relevant Filters */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">

          {/* Scenario Selection (shown for all modes) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-3 text-gray-700">Policy Scenario</label>
            <div className="flex flex-wrap gap-2">
              {scenarios.map(scen => (
                <button
                  key={scen}
                  onClick={() => setScenario(scen)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    scenario === scen
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {scen}
                </button>
              ))}
            </div>
          </div>

          {/* Source Selection (shown for trends and breakdown) */}
          {(interactiveMode === 'trends' || interactiveMode === 'breakdown') && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-3 text-gray-700">Energy Sources</label>

              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={selectAllSources}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    viewMode === 'allSources'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Sources
                </button>
                <button
                  onClick={selectGrouped}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    viewMode === 'grouped'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Fossil vs Clean
                </button>
                <button
                  onClick={selectAllFossil}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    viewMode === 'allFossil'
                      ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Fossil
                </button>
                <button
                  onClick={selectAllClean}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    viewMode === 'allClean'
                      ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Clean
                </button>
              </div>

              {/* Individual Source Buttons */}
              <div className="flex flex-wrap gap-2">
                {sources.map(source => (
                  <button
                    key={source}
                    onClick={() => toggleSource(source)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSources.includes(source) && viewMode === 'individual'
                        ? 'text-white ring-2 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: (selectedSources.includes(source) && viewMode === 'individual') ? ENERGY_COLORS[source] : undefined,
                      ringColor: ENERGY_COLORS[source]
                    }}
                  >
                    {getSourceName(source)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source Selection for Scenario Comparison (single source only) */}
          {interactiveMode === 'scenarios' && (
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">Energy Source (select one)</label>
              <div className="flex flex-wrap gap-2">
                {sources.map(source => (
                  <button
                    key={source}
                    onClick={() => {
                      setViewMode('individual');
                      setSelectedSources([source]);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedSources.includes(source)
                        ? 'text-white ring-2 ring-offset-2'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: selectedSources.includes(source) ? ENERGY_COLORS[source] : undefined,
                      ringColor: ENERGY_COLORS[source]
                    }}
                  >
                    {getSourceName(source)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart Display */}
        {renderInteractiveChart()}
      </div>

      {/* Chart 2: Regional Cost Comparison */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              Regional Cost Comparison ({latestYear?.year || 2050})
            </h3>
            <p className="text-sm text-gray-600">
              How total system costs vary by region - Scenario: <strong>{scenario}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => handleDownloadPNG('chart-regional-comparison', 'regional_cost_comparison.png')}
              onDownloadCSV={() => {
                const csvData = regionalData.map(d => ({
                  Region: d.region,
                  ...Object.fromEntries(sources.map(s => [getSourceName(s), d[s] ? d[s].toFixed(2) : '']))
                }));
                handleDownloadCSV(csvData, 'regional_cost_comparison.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart2(true)} />
          </div>
        </div>

        {/* Region Selection Controls */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <label className="block text-lg font-semibold mb-3 text-gray-700">Select Region</label>

          {/* Individual Region Buttons */}
          <div className="flex flex-wrap gap-2">
            {allRegions.map(region => (
              <button
                key={region}
                onClick={() => selectRegion(region)}
                className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedRegions.includes(region)
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={450} id="chart-regional-comparison">
          <BarChart data={regionalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="region"
              tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
              height={100}
              interval={0}
            />
            <YAxis
              label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
              formatter={(value) => `$${value.toFixed(0)}/MWh`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {sources.map(source => (
              <Bar
                key={source}
                dataKey={source}
                name={getSourceName(source)}
                fill={ENERGY_COLORS[source]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-gray-600">
          <strong>Note:</strong> Regional variations reflect differences in labor costs, resource quality, infrastructure maturity, and local policies.
        </div>
      </div>

      {/* Chart 3: Cost Component Breakdown (Always Visible) */}
      <div className="metric-card bg-white mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              Cost Component Analysis ({latestYear?.year || 2050})
            </h3>
            <p className="text-sm text-gray-600">
              Understanding what drives total system costs for each energy source
            </p>
          </div>
          <div className="flex gap-2">
            <ChartExportButtons
              onDownloadPNG={() => handleDownloadPNG('chart-component-analysis', 'cost_component_analysis.png')}
              onDownloadCSV={() => {
                const csvData = costBreakdownData.map(d => ({
                  Source: d.source,
                  'Base LCOE': d['Base LCOE'].toFixed(2),
                  Firming: d.Firming.toFixed(2),
                  Storage: d.Storage.toFixed(2),
                  Grid: d.Grid.toFixed(2),
                  Capacity: d.Capacity.toFixed(2),
                  ...(sccEnabled ? { SCC: d.SCC.toFixed(2) } : {}),
                  Total: d.total.toFixed(2)
                }));
                handleDownloadCSV(csvData, 'cost_component_analysis.csv');
              }}
            />
            <FullscreenButton onClick={() => setIsFullscreenChart3(true)} />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400} id="chart-component-analysis">
          <BarChart data={costBreakdownData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
              formatter={(value) => `$${value.toFixed(0)}/MWh`}
            />
            <Legend />
            <Bar dataKey="Base LCOE" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Firming" stackId="a" fill="#EF4444" />
            <Bar dataKey="Storage" stackId="a" fill="#F59E0B" />
            <Bar dataKey="Grid" stackId="a" fill="#8B5CF6" />
            <Bar dataKey="Capacity" stackId="a" fill="#10B981" />
            {sccEnabled && <Bar dataKey="SCC" stackId="a" fill="#6B7280" />}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <strong>Component Definitions:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
            <li><strong>Base LCOE:</strong> Capital costs, fuel, operations & maintenance per MWh</li>
            <li><strong>Firming:</strong> Backup power to maintain reliability when primary source unavailable</li>
            <li><strong>Storage:</strong> Batteries and other storage to shift energy across time</li>
            <li><strong>Grid:</strong> Transmission and distribution infrastructure upgrades</li>
            <li><strong>Capacity:</strong> Reserve margins and system adequacy costs</li>
            {sccEnabled && <li><strong>SCC:</strong> Social cost of carbon - climate damage externality</li>}
          </ul>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Analyze with AI
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Ask questions about energy costs, compare scenarios, or explore cost trends and drivers.
        </p>
        <AIChatbot pageContext="Costs" />
      </div>

      {/* Educational Section: Key Insights */}
      <div className="metric-card bg-white mb-8 border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Understanding Total System Costs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1: Base LCOE vs Total System LCOES */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-600">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Base LCOE vs Total System LCOES
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              LCOE only measures generation cost. Total System LCOES includes: Base LCOE, Firming, Storage, Grid, and Capacity costs.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Example:</strong> Solar base LCOE ~$40/MWh, but total system cost reaches ~$150-200/MWh at high grid penetration.
            </p>
          </div>

          {/* Card 2: The VRE Integration Challenge */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-600">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              VRE Integration Challenge
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Solar and wind system costs scale with grid penetration:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 ml-5 list-disc">
              <li>0-20% VRE: ~$10-20/MWh</li>
              <li>20-40% VRE: ~$40-60/MWh</li>
              <li>60-80% VRE: ~$150-200/MWh</li>
            </ul>
          </div>

          {/* Card 3: Regional Cost Variations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-600">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Regional Variations
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Costs vary by labor, resource quality, infrastructure, and policy environment.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Example:</strong> Solar in India (~$35/MWh) is 40% lower than Europe (~$55/MWh).
            </p>
          </div>

          {/* Card 4: The Clean Energy Economic Advantage */}
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-600">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Clean Energy Advantage
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Zero fuel costs, declining prices, no air pollution, and energy independence.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Result:</strong> By 2050, renewables + nuclear: $130-165/MWh vs coal: $400+/MWh.
            </p>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="metric-card bg-white mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Methodology & Data Sources</h3>
        <p className="text-sm text-gray-700 mb-3">
          This analysis uses comprehensive public datasets on full system energy costs. We calculate not just
          generation costs (LCOE), but the complete System LCOES including firming, storage, grid infrastructure, and capacity adequacy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <strong>Base LCOE Sources:</strong>
            <ul className="list-disc ml-5 mt-1">
              <li>IEA World Energy Outlook 2024</li>
              <li>IRENA Renewable Cost Database 2024</li>
              <li>Lazard LCOE Analysis v17.0 (2024)</li>
              <li>NREL ATB 2024</li>
            </ul>
          </div>
          <div>
            <strong>System Cost Sources:</strong>
            <ul className="list-disc ml-5 mt-1">
              <li>IEA System Integration of Renewables 2024</li>
              <li>NREL VRE Integration Studies 2024</li>
              <li>RMI Clean Energy Portfolio 2024</li>
              <li>MIT Energy Initiative 2024</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-700">
          <strong>Calculation Method:</strong> Total System LCOES = Base LCOE + Firming + Storage + Grid + Capacity + (Optional) Social Cost of Carbon. System costs scale with VRE penetration based on empirical integration studies.
        </div>
      </div>

      {/* Fullscreen Modals */}
      <ChartFullscreenModal
        isOpen={isFullscreenChart1}
        onClose={() => setIsFullscreenChart1(false)}
        title="Interactive Cost Explorer"
      >
        {renderInteractiveChart()}
      </ChartFullscreenModal>

      <ChartFullscreenModal
        isOpen={isFullscreenChart2}
        onClose={() => setIsFullscreenChart2(false)}
        title={`Regional Cost Comparison (${latestYear?.year || 2050})`}
      >
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={regionalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="region"
              tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
              height={100}
              interval={0}
            />
            <YAxis
              label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
              formatter={(value) => `$${value.toFixed(0)}/MWh`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {sources.map(source => (
              <Bar
                key={source}
                dataKey={source}
                name={getSourceName(source)}
                fill={ENERGY_COLORS[source]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartFullscreenModal>

      <ChartFullscreenModal
        isOpen={isFullscreenChart3}
        onClose={() => setIsFullscreenChart3(false)}
        title={`Cost Component Analysis (${latestYear?.year || 2050})`}
      >
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={costBreakdownData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
            <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
              formatter={(value) => `$${value.toFixed(0)}/MWh`}
            />
            <Legend />
            <Bar dataKey="Base LCOE" stackId="a" fill="#3B82F6" />
            <Bar dataKey="Firming" stackId="a" fill="#EF4444" />
            <Bar dataKey="Storage" stackId="a" fill="#F59E0B" />
            <Bar dataKey="Grid" stackId="a" fill="#8B5CF6" />
            <Bar dataKey="Capacity" stackId="a" fill="#10B981" />
            {sccEnabled && <Bar dataKey="SCC" stackId="a" fill="#6B7280" />}
          </BarChart>
        </ResponsiveContainer>
      </ChartFullscreenModal>
    </PageLayout>
  );
}
