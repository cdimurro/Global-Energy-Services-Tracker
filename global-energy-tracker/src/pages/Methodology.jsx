import { useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import AIChatbot from '../components/AIChatbot';

export default function Methodology() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3">
          How This Platform Works
        </h1>
      </div>

      <div className="metric-card bg-white mb-8">
        <div className="space-y-10 text-gray-700 leading-relaxed text-base">
          {/* Three-Tier Energy Framework (v2.0) */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Three-Tier Energy Framework (v2.0)
            </h2>
            <p className="mb-4">
              Traditional energy metrics measure <strong>primary energy</strong> - the raw energy content of fuels before they're converted into useful work. This is fundamentally misleading because it counts massive amounts of wasted heat as if it were useful energy.
            </p>
            <p className="mb-4">
              This platform uses a <strong>three-tier framework</strong> that accounts for both conversion efficiency and thermodynamic quality (exergy):
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <strong className="text-blue-800">Tier 1: Primary Energy</strong>
                  <p className="text-gray-700">The raw energy we extract from nature (coal, oil, wind, sunlight). Global: ~620 EJ/year</p>
                </div>
                <div>
                  <strong className="text-blue-800">Tier 2: Useful Energy</strong>
                  <p className="text-gray-700">Energy that reaches end-users after conversion losses (efficiency × primary). Global: ~198 EJ/year</p>
                </div>
                <div>
                  <strong className="text-blue-800">Tier 3: Energy Services</strong>
                  <p className="text-gray-700">Thermodynamic value delivered, accounting for quality (exergy × useful). Global: ~154 EJ/year</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 border border-gray-300 p-4 text-center">
              <p className="font-semibold mb-2">A Simple Example:</p>
              <p className="text-gray-700">
                <strong>Coal Power:</strong> 1 EJ primary → 0.32 EJ useful → 0.28 EJ services (28% final value)<br/>
                <strong>Wind Power:</strong> 1 EJ primary → 0.70 EJ useful → 0.70 EJ services (70% final value)<br/>
                <strong>Wind is 2.5× more effective per unit of primary energy</strong>
              </p>
            </div>
          </section>

          {/* Why Efficiency Matters */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Why Efficiency Changes Everything
            </h2>
            <p className="mb-4">
              Fossil fuels are incredibly inefficient. Most of the energy they contain is lost as waste heat during combustion and conversion. Clean electricity delivers far more useful energy, though transmission and end-use losses still apply.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">Efficiency by Source (v2.0 - System-Wide):</p>
              <ul className="space-y-2 ml-4">
                <li>• Coal (power plants): <strong>~32% efficient</strong></li>
                <li>• Oil (combustion engines): <strong>~30% efficient</strong></li>
                <li>• Natural Gas (heating, power): <strong>~45% efficient</strong> (IEA global avg)</li>
                <li>• Nuclear (thermal plants): <strong>~33% efficient</strong> (thermal cycle limit)</li>
                <li>• Biomass (traditional use dominant): <strong>~15% efficient</strong></li>
                <li>• Hydro/Wind/Solar (direct electricity): <strong>~70% efficient</strong></li>
              </ul>
            </div>
            <p className="mb-4">
              <strong>Note on v2.0 Updates:</strong> Gas efficiency lowered to 45% (IEA global average accounting for 60% low-temp heating use). Nuclear corrected to 33% (pure thermal efficiency). Biomass reduced to 15% (70% traditional cookstove use in developing countries). Renewables conservatively set to 70% (transmission losses).
            </p>
            <p className="mb-4">
              <strong>Exergy Quality Factors:</strong> Beyond efficiency, v2.0 accounts for thermodynamic quality (exergy). Electricity has 100% quality (can do any work), while low-temperature heat has ~20% quality (limited by Carnot cycle). This gives clean sources an additional advantage: Wind/Solar deliver high-quality electricity (exergy 1.0) while gas for heating delivers low-quality heat (exergy 0.2-0.5).
            </p>
            <p>
              This efficiency + exergy gap is why electrification is so powerful. When we replace a fossil fuel service with renewable electricity (wind/solar), we need 2.0-2.5× less primary energy to accomplish the same thermodynamic work. This is the fundamental advantage of the energy transition.
            </p>
          </section>

          {/* How We Calculate Everything */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              How We Perform Our Calculations (v2.0)
            </h2>
            <p className="mb-4">
              We start with primary energy data from <strong>Our World in Data</strong> (which sources from the Energy Institute Statistical Review). This gives us raw energy consumption by source for every year from 1965 to 2024.
            </p>
            <p className="mb-4">
              We then apply a <strong>three-tier calculation</strong> framework validated against IEA World Energy Outlook 2024, Brockway et al. 2021, and RMI 2024:
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4">
              <p className="font-semibold mb-3 text-gray-800">The Three-Tier Conversion Process:</p>
              <div className="space-y-2 text-sm">
                <p><strong>Tier 1 → 2:</strong> Apply efficiency factors (time-varying, region-specific) to get Useful Energy</p>
                <p className="ml-4 text-gray-600">Example: 154 EJ coal (2024) × 0.32 efficiency = 49.3 EJ useful</p>
                <p><strong>Tier 2 → 3:</strong> Apply exergy quality factors (sector-weighted) to get Energy Services</p>
                <p className="ml-4 text-gray-600">Example: 49.3 EJ useful × 0.85 exergy (coal: 70% power, 30% heat) = 41.9 EJ services</p>
                <p><strong>Final Result:</strong> Sum all sources to get global totals</p>
                <p className="ml-4 text-gray-600">2024: 620 EJ primary → 198 EJ useful → 154 EJ services (25.4% overall exergy efficiency)</p>
              </div>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
              <p className="font-semibold text-gray-800 mb-2">Validation ✓</p>
              <p className="text-sm text-gray-700">
                Our results align with academic benchmarks: Brockway 2021 (~150 EJ services for 2019), IEA WEO 2024 (82% fossil services, 25% exergy efficiency), and RMI 2024 (2.0-2.5× clean advantage). See PROJECT_OVERVIEW.md for detailed validation.
              </p>
            </div>
          </section>

          {/* Tracking Displacement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Tracking Displacement
            </h2>
            <p className="mb-4">
              The displacement tracker answers a critical question: <strong>Is clean energy growing faster than fossil fuel demand?</strong> This is the metric that determines when fossil fuel consumption will peak and begin declining.
            </p>
            <div className="bg-gray-100 border border-gray-300 p-4 my-4 text-center">
              <p className="text-lg font-bold text-blue-600 mb-2">
                Δ Fossil Fuel Consumption = New Services (Fossil) − New Services (Clean)
              </p>
              <p className="text-sm text-gray-600">
                When clean energy displacement exceeds fossil growth, that means that fossil fuel consumption is declining.
              </p>
            </div>
            <p className="mb-4">
              We calculate three key metrics each year:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-green-600 pl-4">
                <strong>Clean Energy Displacement (D):</strong> The annual growth in clean energy services. This represents how much fossil fuel demand clean energy is offsetting.
              </div>
              <div className="border-l-4 border-red-600 pl-4">
                <strong>Fossil Fuel Growth:</strong> The annual change in fossil fuel energy services. When positive, fossil consumption is rising. When negative, it's falling.
              </div>
              <div className="border-l-4 border-gray-600 pl-4">
                <strong>Net Change:</strong> The actual change in fossil fuel consumption after accounting for displacement. This is the number that matters for emissions.
              </div>
            </div>
          </section>

          {/* Understanding the Status */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Understanding the Status
            </h2>
            <p className="mb-4">
              The displacement gauge shows the current relationship between clean energy growth and fossil fuel growth. Here's what each status means:
            </p>
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-600 p-3">
                <strong className="text-red-800">Consumption Rising:</strong>
                <p className="text-gray-700 mt-1">Clean energy is growing, but fossil fuel demand is growing faster. Fossil consumption continues to increase. This is where we are today.</p>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-3">
                <strong className="text-yellow-800">Consumption Plateauing:</strong>
                <p className="text-gray-700 mt-1">Clean energy growth exactly matches fossil fuel growth. Fossil consumption is flat. This is the tipping point - we've reached peak fossil fuel.</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-600 p-3">
                <strong className="text-green-800">Consumption Declining:</strong>
                <p className="text-gray-700 mt-1">Clean energy is growing faster than fossil demand. Fossil consumption is actively falling. The energy transition is in full swing.</p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Data Sources & Validation (v2.0)
            </h2>
            <div className="space-y-4">
              <div>
                <strong className="text-gray-800">Our World in Data (OWID)</strong>
                <p className="mt-1">
                  Primary energy consumption data by source from 1965-2024. OWID aggregates data from the Energy Institute Statistical Review of World Energy (formerly BP Statistical Review).
                </p>
              </div>
              <div>
                <strong className="text-gray-800">IEA World Energy Outlook (WEO) 2024</strong>
                <p className="mt-1">
                  Exergy efficiency benchmarks (~25% global), fossil/clean service shares (80-82% / 18-20%), and efficiency factor validation. Our 2024 results: 25.4% exergy efficiency, 82.6% fossil services ✓
                </p>
              </div>
              <div>
                <strong className="text-gray-800">Brockway et al. 2021</strong>
                <p className="mt-1">
                  Academic foundation for energy services framework. Estimated ~150 EJ global services (2019). Our 2024 result: 154 EJ services ✓ (within 3% accounting for 5 years growth)
                </p>
              </div>
              <div>
                <strong className="text-gray-800">IEA Energy Efficiency Indicators (EEI) 2024</strong>
                <p className="mt-1">
                  Source-specific efficiency factors, regional variations (China coal 40%, US gas 48%), and exergy methodology for sectoral allocation.
                </p>
              </div>
              <div>
                <strong className="text-gray-800">RMI 2024 & Cullen & Allwood 2010</strong>
                <p className="mt-1">
                  Final energy proxy methodology, traditional biomass efficiency (8-15%), and theoretical minimum energy demand for end-use services. Validates our 2.0-2.5× clean efficiency advantage.
                </p>
              </div>
            </div>
          </section>

          {/* Why This Matters */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Why This Matters
            </h2>
            <p className="mb-4">
              By measuring energy services instead of primary energy, we can finally see what's really happening in the energy transition. We can track the true impact of clean energy, understand the power of electrification, and identify exactly how close we are to peak fossil fuel consumption.
            </p>
            <p className="mb-4">
              This isn't just about better metrics - it's about better decision-making. When policymakers, businesses, and citizens understand that electric vehicles displace 3x their weight in fossil fuels, or that heat pumps cut energy use by 70%, it changes the entire conversation about climate action.
            </p>
            <p>
              The energy transition is happening. This dashboard shows you exactly how fast, where we stand, and what it will take to accelerate it.
            </p>
          </section>
        </div>
      </div>

      {/* AI Chatbot */}
      <div className="mb-8">
        <AIChatbot />
      </div>
    </PageLayout>
  );
}
