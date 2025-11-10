export default function PageLayout({ children }) {
  return (
    <div className="py-4 sm:py-6 px-3 sm:px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
