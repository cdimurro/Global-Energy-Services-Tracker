# Feedback System Documentation

## Overview

A complete feedback system has been implemented allowing users to submit feedback from any page on the website. Feedback is automatically saved and can be viewed later.

## Features

### User-Facing
- **Feedback Button**: Subtle blue button in the bottom-left corner of every page footer
- **Modal Form**: Clean popup form with textarea for feedback input
- **Success Confirmation**: Visual confirmation after submission with checkmark icon
- **Close Button**: X button in top-right to close the modal
- **Responsive**: Works on all device sizes (mobile, tablet, desktop)

### Backend
- **Automatic Storage**: Feedback saved to JSON file (`server/feedback-submissions.json`)
- **Fallback Storage**: Uses localStorage if server is unavailable
- **Metadata Capture**: Stores timestamp, page URL, and user agent
- **Unique IDs**: Each submission gets a unique identifier

## User Flow

1. User clicks "Feedback" button in footer (bottom-left)
2. Modal opens with text area
3. User types feedback and clicks "Submit Feedback"
4. System saves feedback to backend
5. Success message displays with green checkmark
6. User clicks X to close modal

## Viewing Feedback

### Command Line
Run this command to view all feedback submissions:

```bash
npm run view-feedback
```

This will display:
- Total number of submissions
- Each submission with:
  - ID
  - Date/time
  - Page where submitted
  - Feedback content
  - User agent info

### Programmatically
Access the feedback file directly:
```
server/feedback-submissions.json
```

### Via API
While dev server is running, visit:
```
http://localhost:5173/api/feedback
```

## Files Created

### Components
- `src/components/FeedbackModal.jsx` - Modal form component
- `src/components/Footer.jsx` - Updated with feedback button

### Backend
- `server/feedback.js` - API endpoint handler
- `server/feedback-submissions.json` - Feedback storage (auto-created)

### Scripts
- `view-feedback.js` - Command-line viewer for feedback
- `package.json` - Added "view-feedback" script

### Configuration
- `vite.config.js` - Updated with API proxy

## Data Structure

Each feedback submission contains:

```json
{
  "id": "1699564800000",
  "feedback": "User's feedback text here",
  "timestamp": "2024-11-09T20:00:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "page": "/energy-supply"
}
```

## Storage Behavior

### Primary (Server)
- Feedback saved to `server/feedback-submissions.json`
- Persists across sessions
- Accessible via API endpoint

### Fallback (LocalStorage)
- If server unavailable, saves to browser localStorage
- Key: `feedbackSubmissions`
- Only accessible in that browser
- Should be migrated to server when available

## Maintenance

### Viewing Feedback
```bash
# View all feedback in terminal
npm run view-feedback

# Or access file directly
cat server/feedback-submissions.json
```

### Clearing Feedback
To reset feedback submissions:
```bash
# Delete the file
rm server/feedback-submissions.json

# Or clear its contents
echo "[]" > server/feedback-submissions.json
```

### Exporting Feedback
The JSON file can be:
- Copied for backup
- Imported into spreadsheet software
- Processed with scripts
- Analyzed with data tools

## Technical Details

### API Endpoints

**POST /api/feedback**
- Accepts feedback submission
- Returns: `{ success: true, id: "..." }`

**GET /api/feedback**
- Returns all feedback submissions
- Useful for admin dashboard (future enhancement)

### Error Handling
- Server unavailable → Falls back to localStorage
- Invalid JSON → Logs error, returns 500
- Empty feedback → Submission button disabled

### Security Considerations
- No authentication (intentional for ease of use)
- Consider adding rate limiting for production
- User agent logged for context, not authentication
- No PII collected beyond what user provides

## Future Enhancements

Possible improvements:
1. **Admin Dashboard**: View feedback in browser UI
2. **Email Notifications**: Alert on new submissions
3. **Categories**: Allow users to categorize feedback
4. **Attachments**: Support screenshots
5. **Reply System**: Respond to user feedback
6. **Export Options**: CSV/Excel download
7. **Search/Filter**: Find specific feedback
8. **Analytics**: Track feedback trends

## Testing

To test the feedback system:

1. Start dev server: `npm run dev`
2. Navigate to any page
3. Click "Feedback" button in footer
4. Enter test feedback
5. Submit and verify success message
6. Run `npm run view-feedback` to confirm storage
7. Check `server/feedback-submissions.json` exists

## Troubleshooting

### Button not visible
- Check Footer.jsx is imported in PageLayout
- Verify CSS classes are loading
- Check console for errors

### Submission fails
- Check dev server is running
- Verify vite.config.js has proxy setup
- Check browser console for errors
- Feedback will save to localStorage as fallback

### Can't view feedback
- Ensure `server/feedback-submissions.json` exists
- Run `npm run view-feedback` from project root
- Check file permissions

## Integration

The feedback button appears on all pages automatically because:
1. `PageLayout.jsx` includes `<Footer />`
2. All pages use `PageLayout` component
3. Footer component contains feedback button
4. Modal state managed within Footer

No additional setup needed for new pages!

---

**Last Updated**: 2025-11-10
**Status**: ✅ Fully implemented and tested
