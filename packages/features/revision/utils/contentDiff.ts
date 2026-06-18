/**
 * Content diff utility — compares two revision snapshots.
 *
 * Generates a line-by-line diff suitable for side-by-side comparison.
 * Inspired by WordPress revision comparison.
 */

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  lineNumber: number;
  content: string;
}

export interface DiffResult {
  oldTitle: string;
  newTitle: string;
  titleChanged: boolean;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

/**
 * Compare two text strings and produce a line-by-line diff.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: diff algorithm with LCS-based line matching has inherent branching
export function computeDiff(
  oldText: string,
  newText: string,
  oldTitle: string,
  newTitle: string,
): DiffResult {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const lcs = longestCommonSubsequence(oldLines, newLines);
  const lines: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  let lineNumber = 1;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const lcsLine = lcsIdx < lcs.length ? lcs[lcsIdx] : undefined;
    const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : undefined;
    const newLine = newIdx < newLines.length ? newLines[newIdx] : undefined;

    if (lcsLine !== undefined && oldLine === lcsLine && newLine === lcsLine) {
      lines.push({ type: "unchanged", lineNumber: lineNumber++, content: lcsLine });
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (newLine !== undefined && (lcsLine === undefined || newLine !== lcsLine)) {
      lines.push({ type: "added", lineNumber: lineNumber++, content: newLine });
      newIdx++;
    } else if (oldLine !== undefined && (lcsLine === undefined || oldLine !== lcsLine)) {
      lines.push({ type: "removed", lineNumber: lineNumber++, content: oldLine });
      oldIdx++;
    }
  }

  return {
    oldTitle,
    newTitle,
    titleChanged: oldTitle !== newTitle,
    additions: lines.filter((l) => l.type === "added").length,
    deletions: lines.filter((l) => l.type === "removed").length,
    lines,
  };
}

/**
 * Standard LCS algorithm for diff computation.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: standard LCS algorithm with inherent branching
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    const row = dp[i] as number[];
    const prevRow = dp[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        row[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(prevRow[j] ?? 0, row[j - 1] ?? 0);
      }
    }
  }

  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1] as string);
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) > (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}
