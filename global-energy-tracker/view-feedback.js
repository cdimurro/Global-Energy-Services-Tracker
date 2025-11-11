import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEEDBACK_FILE = path.join(__dirname, 'server', 'feedback-submissions.json');

console.log('\n📋 FEEDBACK SUBMISSIONS\n');
console.log('='.repeat(80));

try {
  if (!fs.existsSync(FEEDBACK_FILE)) {
    console.log('\n❌ No feedback file found. No submissions yet.\n');
    process.exit(0);
  }

  const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));

  if (feedback.length === 0) {
    console.log('\n📭 No feedback submissions yet.\n');
    process.exit(0);
  }

  console.log(`\n✅ Total submissions: ${feedback.length}\n`);

  feedback.forEach((item, index) => {
    console.log(`\n[${index + 1}] ID: ${item.id}`);
    console.log(`    Date: ${new Date(item.timestamp).toLocaleString()}`);
    console.log(`    Page: ${item.page}`);
    console.log(`    Feedback:\n    ${item.feedback.split('\n').join('\n    ')}`);
    console.log(`    User Agent: ${item.userAgent.substring(0, 80)}...`);
    console.log('-'.repeat(80));
  });

  console.log('\n');
} catch (error) {
  console.error('\n❌ Error reading feedback:', error.message);
  console.log('\n');
  process.exit(1);
}
