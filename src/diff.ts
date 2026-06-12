export interface DiffForPrompt {
  text: string;
  wasTruncated: boolean;
  originalLength: number;
  sentLength: number;
  omittedLength: number;
}

function trimToLineBoundary(value: string, preferEnd: boolean): string {
  if (value.length === 0) {
    return value;
  }

  const index = preferEnd ? value.indexOf('\n') : value.lastIndexOf('\n');
  if (index === -1) {
    return value;
  }

  return preferEnd ? value.slice(index + 1) : value.slice(0, index);
}

export function prepareDiffForPrompt(diff: string, maxChars: number): DiffForPrompt {
  const minimum = Math.max(1000, maxChars);
  if (diff.length <= minimum) {
    return {
      text: diff,
      wasTruncated: false,
      originalLength: diff.length,
      sentLength: diff.length,
      omittedLength: 0
    };
  }

  const marker = '\n\n[Diff truncated: middle omitted to stay within the extension limit. Review the beginning and end together.]\n\n';
  const available = Math.max(1000, minimum - marker.length);
  const headLength = Math.floor(available * 0.7);
  const tailLength = available - headLength;
  const head = trimToLineBoundary(diff.slice(0, headLength), false);
  const tail = trimToLineBoundary(diff.slice(diff.length - tailLength), true);
  const text = `${head}${marker}${tail}`;

  return {
    text,
    wasTruncated: true,
    originalLength: diff.length,
    sentLength: text.length,
    omittedLength: Math.max(0, diff.length - head.length - tail.length)
  };
}
