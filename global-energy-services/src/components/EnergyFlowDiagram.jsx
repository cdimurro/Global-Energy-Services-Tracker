import { useState } from 'react';

export default function EnergyFlowDiagram() {
  const [hoveredStage, setHoveredStage] = useState(null);

  // Example data showing energy losses at each stage (2024 global estimates)
  const stages = [
    {
      id: 'primary',
      name: 'Primary Energy',
      value: 620,
      color: '#9CA3AF', // Gray
      definition: 'Raw energy extracted from nature before any conversion',
      examples: ['Coal from mines', 'Crude oil from wells', 'Natural gas from fields', 'Wind kinetic energy', 'Solar radiation', 'Uranium ore']
    },
    {
      id: 'secondary',
      name: 'Secondary Energy',
      value: 520,
      color: '#F59E0B', // Orange
      definition: 'Primary energy converted into transportable forms',
      examples: ['Electricity from power plants', 'Gasoline from refineries', 'Diesel fuel', 'District heating', 'Hydrogen', 'Biofuels']
    },
    {
      id: 'final',
      name: 'Final Energy',
      value: 420,
      color: '#3B82F6', // Blue
      definition: 'Secondary energy delivered to end consumers',
      examples: ['Electricity at the meter', 'Gasoline at the pump', 'Natural gas to homes', 'District heat delivered', 'Fuel for vehicles', 'Coal for industry']
    },
    {
      id: 'useful',
      name: 'Useful Energy',
      value: 198,
      color: '#10B981', // Green
      definition: 'Final energy after accounting for device/appliance efficiency',
      examples: ['Mechanical work from engines', 'Heat from furnaces', 'Light from bulbs', 'Motion from motors', 'Heat from stoves', 'Cooling from AC units']
    },
    {
      id: 'services',
      name: 'Energy Services',
      value: 149,
      color: '#8B5CF6', // Purple
      definition: 'Thermodynamic work potential (exergy) - the actual benefit to society',
      examples: ['Comfortable indoor temperature', 'Transportation miles traveled', 'Products manufactured', 'Food cooked', 'Spaces illuminated', 'Data processed']
    }
  ];

  // Calculate losses between stages
  const getLoss = (fromIndex) => {
    if (fromIndex >= stages.length - 1) return 0;
    return stages[fromIndex].value - stages[fromIndex + 1].value;
  };

  // Calculate efficiency percentage
  const getEfficiency = (fromIndex) => {
    if (fromIndex >= stages.length - 1) return 100;
    return ((stages[fromIndex + 1].value / stages[fromIndex].value) * 100).toFixed(1);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        The Energy Cascade: From Primary Energy to Energy Services
      </h2>
      <p className="text-gray-600 mb-8">
        This diagram shows how energy is transformed and degraded at each stage of the energy system.
        Hover over each stage to see definitions and examples.
      </p>

      {/* Exergy Tracking Bars */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Exergy Flow (Global 2024 Estimates)</h3>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const usefulPercent = (stage.value / stages[0].value) * 100;
            const wastedPercent = 100 - usefulPercent;
            const loss = getLoss(index);
            const lossPercent = (loss / stages[0].value) * 100;

            return (
              <div key={stage.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-700">{stage.name}</span>
                  <span className="text-gray-600">{stage.value} EJ ({usefulPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300">
                  {/* Useful energy (green) */}
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
                    style={{ width: `${usefulPercent}%` }}
                    onMouseEnter={() => setHoveredStage(stage.id)}
                    onMouseLeave={() => setHoveredStage(null)}
                  >
                    {usefulPercent > 15 && `${stage.value} EJ`}
                  </div>
                  {/* Wasted energy (red) */}
                  <div
                    className="bg-red-400 flex items-center justify-center text-white text-xs font-semibold transition-all"
                    style={{ width: `${wastedPercent}%` }}
                  >
                    {wastedPercent > 15 && `${(stages[0].value - stage.value).toFixed(0)} EJ lost`}
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div className="text-xs text-gray-500 pl-2">
                    ↓ Loss: {loss} EJ ({lossPercent.toFixed(1)}%) • Efficiency: {getEfficiency(index)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Energy Transformation Stages</h3>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-4 w-full md:w-auto">
              {/* Stage Box */}
              <div
                className={`
                  flex-1 md:flex-none md:w-48 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${hoveredStage === stage.id
                    ? 'border-blue-600 shadow-lg scale-105'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
                style={{ backgroundColor: `${stage.color}20` }}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <div className="text-center">
                  <div
                    className="text-lg font-bold mb-2"
                    style={{ color: stage.color }}
                  >
                    {stage.name}
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-1">
                    {stage.value}
                    <span className="text-sm ml-1 text-gray-600">EJ</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {((stage.value / stages[0].value) * 100).toFixed(0)}% of primary
                  </div>
                </div>
              </div>

              {/* Arrow */}
              {index < stages.length - 1 && (
                <div className="hidden md:block">
                  <svg width="40" height="60" className="text-gray-400">
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
                      </marker>
                    </defs>
                    <line
                      x1="0"
                      y1="30"
                      x2="35"
                      y2="30"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    <text x="20" y="20" fontSize="10" fill="currentColor" textAnchor="middle">
                      {getEfficiency(index)}%
                    </text>
                  </svg>
                </div>
              )}

              {/* Mobile Arrow */}
              {index < stages.length - 1 && (
                <div className="md:hidden flex flex-col items-center my-2">
                  <svg width="24" height="40" className="text-gray-400">
                    <defs>
                      <marker
                        id="arrowhead-mobile"
                        markerWidth="10"
                        markerHeight="10"
                        refX="3"
                        refY="9"
                        orient="auto"
                      >
                        <polygon points="0 0, 6 10, 0 10" fill="currentColor" />
                      </marker>
                    </defs>
                    <line
                      x1="12"
                      y1="0"
                      x2="12"
                      y2="35"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead-mobile)"
                    />
                  </svg>
                  <span className="text-xs text-gray-500">{getEfficiency(index)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stage Details */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`
              p-4 rounded-lg border transition-all
              ${hoveredStage === stage.id
                ? 'border-blue-600 shadow-md bg-blue-50'
                : 'border-gray-200 bg-gray-50'
              }
            `}
            onMouseEnter={() => setHoveredStage(stage.id)}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <div
              className="font-bold text-lg mb-2"
              style={{ color: stage.color }}
            >
              {stage.name}
            </div>
            <div className="text-sm text-gray-700 mb-3">
              {stage.definition}
            </div>
            <div className="text-xs text-gray-600">
              <div className="font-semibold mb-1">Examples:</div>
              <ul className="list-disc list-inside space-y-1">
                {stage.examples.slice(0, 3).map((example, idx) => (
                  <li key={idx}>{example}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-4">
        <h3 className="font-bold text-gray-800 mb-2">Key Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>Overall Efficiency:</strong> Only {((stages[4].value / stages[0].value) * 100).toFixed(1)}%
            of primary energy becomes useful energy services. The rest is lost as waste heat and inefficiencies.
          </li>
          <li>
            <strong>Why Exergy Matters:</strong> Energy Services (measured in exergy) accounts for both the quantity
            AND quality of energy. High-temperature heat and electricity have higher exergy than low-temperature heat.
          </li>
          <li>
            <strong>Clean Energy Advantage:</strong> Renewable electricity avoids the massive losses in the Primary →
            Secondary → Final stages, achieving 84-95% efficiency compared to fossil fuels' 20-30%.
          </li>
          <li>
            <strong>The 3x Rule:</strong> Because clean energy is 3-4× more efficient, we only need to replace ~30-35%
            of fossil fuel primary energy to provide the same energy services.
          </li>
        </ul>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Values are approximate global estimates for 2024. Sources: IEA, Brockway et al. 2019
      </div>
    </div>
  );
}
