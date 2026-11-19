// Matches a diff header like "@@ -10,4 +12,6 @@". The number after "+" is the first line in the NEW file.
const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

// Reads a GitHub patch and returns the line numbers (in the new file) that were added or changed
export function parsePatch(patch) {
  const addedLines = new Set();
  let newLine = 0;
  let inHunk = false;

  for (const text of patch.split("\n")) {
    const header = HUNK.exec(text);
    if (header) {
      newLine = parseInt(header[1], 10);
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;

    if (text.startsWith("+")) {
      addedLines.add(newLine);
      newLine++;
    } else if (text.startsWith("-")) {
      // removed line: it does not exist in the new file
    } else if (text.startsWith("\\")) {
      // "\ No newline at end of file"
    } else {
      newLine++; // unchanged context line
    }
  }
  return addedLines;
}

// Turns a patch into text with real line numbers, for the AI:
//   "   13|+ added line"   "   12|  unchanged line"   "     |- removed line"
export function annotatePatch(patch, maxChars = 15000) {
  const out = [];
  let newLine = 0;
  let inHunk = false;
  let size = 0;

  for (const text of patch.split("\n")) {
    const header = HUNK.exec(text);
    let line;

    if (header) {
      newLine = parseInt(header[1], 10);
      inHunk = true;
      line = "     | ...";
    } else if (!inHunk) {
      continue;
    } else if (text.startsWith("+")) {
      line = `${String(newLine).padStart(5)}|+${text.slice(1)}`;
      newLine++;
    } else if (text.startsWith("-")) {
      line = `     |-${text.slice(1)}`;
    } else if (text.startsWith("\\")) {
      continue;
    } else {
      line = `${String(newLine).padStart(5)}| ${text.slice(1)}`;
      newLine++;
    }

    size += line.length + 1;
    if (size > maxChars) {
      out.push("     | [the rest of this diff was cut because it is long]");
      break;
    }
    out.push(line);
  }
  return out.join("\n");
}