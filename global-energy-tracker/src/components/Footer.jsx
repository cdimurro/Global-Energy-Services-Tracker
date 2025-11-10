export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white mt-12 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-2">
            Global Energy Services Tracker
          </h3>
          <p className="text-xs sm:text-sm text-blue-200">
            Measuring the true state of the energy transition through useful energy services
          </p>
          <p className="text-xs text-blue-300 mt-3">
            Data sources: Our World in Data, IEA, BP Statistical Review
          </p>
        </div>
      </div>
    </footer>
  );
}
