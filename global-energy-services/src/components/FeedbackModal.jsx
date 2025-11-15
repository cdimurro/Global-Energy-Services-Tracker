import { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose }) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim()) return;

    setIsSubmitting(true);

    try {
      // Save feedback to JSON file
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          page: window.location.pathname,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFeedback('');
      } else {
        // Fallback: save to localStorage if server fails
        const existingFeedback = JSON.parse(localStorage.getItem('feedbackSubmissions') || '[]');
        existingFeedback.push({
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          page: window.location.pathname,
        });
        localStorage.setItem('feedbackSubmissions', JSON.stringify(existingFeedback));
        setIsSubmitted(true);
        setFeedback('');
      }
    } catch (error) {
      // Fallback: save to localStorage if fetch fails
      const existingFeedback = JSON.parse(localStorage.getItem('feedbackSubmissions') || '[]');
      existingFeedback.push({
        feedback: feedback.trim(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        page: window.location.pathname,
      });
      localStorage.setItem('feedbackSubmissions', JSON.stringify(existingFeedback));
      setIsSubmitted(true);
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setFeedback('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6">
          {!isSubmitted ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Submit Feedback</h2>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-base"
                  disabled={isSubmitting}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={!feedback.trim() || isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Feedback Submitted!</h3>
              <p className="text-gray-600">Thank you for your feedback. We appreciate your input.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
