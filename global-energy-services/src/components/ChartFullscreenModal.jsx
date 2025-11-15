import { useEffect } from 'react';

/**
 * Fullscreen Modal Component for Charts
 * Displays chart content in a fullscreen overlay with all interactive controls
 */
const ChartFullscreenModal = ({ isOpen, onClose, title, description, exportButtons, children }) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right buttons: Export buttons and Close button */}
        <div className="absolute top-4 right-4 z-[1010] flex gap-2">
          {exportButtons}
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors border border-gray-300"
            aria-label="Close fullscreen"
            title="Close fullscreen (Esc)"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Title and Description */}
          {(title || description) && (
            <div className="mb-4">
              {title && (
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm sm:text-base text-gray-600">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Chart Content */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartFullscreenModal;
