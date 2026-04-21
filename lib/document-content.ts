export function splitDocumentContent(content: string) {
  const lines = content.split(/\r?\n/);
  const metadata: Record<string, string> = {};
  let index = 0;

  if (lines[0]?.trim() === '---') {
    index = 1;
    while (index < lines.length) {
      const line = lines[index].trim();

      if (line === '---') {
        index += 1;
        break;
      }

      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/);
      if (match) {
        metadata[match[1]] = stripMetadataValue(match[2]);
      }

      index += 1;
    }
  } else {
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }

      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/);
      if (!match) break;

      metadata[match[1]] = stripMetadataValue(match[2]);
      index += 1;
    }
  }

  const body = lines.slice(index).join('\n').trimStart();
  return { metadata, body };
}

function stripMetadataValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}
