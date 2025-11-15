import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEEDBACK_FILE = path.join(__dirname, 'feedback-submissions.json');

// Ensure feedback file exists
if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2));
}

export function handleFeedback(req, res) {
  if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const feedbackData = JSON.parse(body);

        // Read existing feedback
        const existingFeedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));

        // Add new feedback with ID
        const newFeedback = {
          id: Date.now().toString(),
          ...feedbackData,
        };

        existingFeedback.push(newFeedback);

        // Save updated feedback
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(existingFeedback, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: newFeedback.id }));
      } catch (error) {
        console.error('Error saving feedback:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save feedback' }));
      }
    });
  } else if (req.method === 'GET') {
    // Allow viewing all feedback
    try {
      const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(feedback, null, 2));
    } catch (error) {
      console.error('Error reading feedback:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read feedback' }));
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}
