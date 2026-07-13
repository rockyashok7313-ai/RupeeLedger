import fs from 'fs';
import readline from 'readline';

async function recover() {
  const logPath = 'C:/Users/AK/.gemini/antigravity/brain/a2f31a27-16b4-4a3a-9262-07fd954f7517/.system_generated/logs/transcript_full.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestAppContent = '';
  
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'default_api:write_to_file' || tc.name === 'default_api:replace_file_content' || tc.name === 'default_api:multi_replace_file_content') {
            // We can track if it was writing to App.tsx but they are deltas.
            // Better to find a view_file response or something that contains the full file?
            // view_file doesn't contain the whole file.
            // Wait, replace_file_content returns a diff.
          }
        }
      }
    } catch (e) {}
  }
}

recover();
