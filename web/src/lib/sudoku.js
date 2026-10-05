// Kids Sudoku generator (pure functions, unit-tested in tests/sudoku.test.js).
// Sizes: 3 (no boxes, icons for toddlers), 4 (2x2 boxes), 6 (2x3 boxes).
export const BOXES = { 3: null, 4: [2, 2], 6: [2, 3] };

const shuffled = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Full valid solution grid with values 1..n. */
export function solution(n, rnd = Math.random) {
  const box = BOXES[n];
  if (!box) {
    const rows = shuffled([...Array(n).keys()], rnd);
    const cols = shuffled([...Array(n).keys()], rnd);
    const sym = shuffled([...Array(n).keys()].map((x) => x + 1), rnd);
    return rows.map((r) => cols.map((c) => sym[(r + c) % n]));
  }
  const [br, bc] = box; // box rows, box cols
  const pattern = (r, c) => (bc * (r % br) + Math.floor(r / br) + c) % n;
  const bands = shuffled([...Array(n / br).keys()], rnd);
  const rows = bands.flatMap((b) => shuffled([...Array(br).keys()], rnd).map((r) => b * br + r));
  const stacks = shuffled([...Array(n / bc).keys()], rnd);
  const cols = stacks.flatMap((s) => shuffled([...Array(bc).keys()], rnd).map((c) => s * bc + c));
  const sym = shuffled([...Array(n).keys()].map((x) => x + 1), rnd);
  return rows.map((r) => cols.map((c) => sym[pattern(r, c)]));
}

/** Puzzle = solution with some cells blanked (0). */
export function puzzle(n, holes, rnd = Math.random) {
  const sol = solution(n, rnd);
  const grid = sol.map((r) => [...r]);
  const cells = shuffled([...Array(n * n).keys()], rnd).slice(0, holes);
  for (const k of cells) grid[Math.floor(k / n)][k % n] = 0;
  return { solution: sol, grid };
}

/** Set of "r,c" keys that break a rule (duplicate in row, column or box). */
export function conflicts(grid) {
  const n = grid.length;
  const box = BOXES[n];
  const bad = new Set();
  const groups = [];
  for (let i = 0; i < n; i++) {
    groups.push([...Array(n).keys()].map((c) => [i, c]));
    groups.push([...Array(n).keys()].map((r) => [r, i]));
  }
  if (box) {
    const [br, bc] = box;
    for (let r0 = 0; r0 < n; r0 += br)
      for (let c0 = 0; c0 < n; c0 += bc) {
        const g = [];
        for (let r = r0; r < r0 + br; r++) for (let c = c0; c < c0 + bc; c++) g.push([r, c]);
        groups.push(g);
      }
  }
  for (const g of groups) {
    const seen = {};
    for (const [r, c] of g) {
      const v = grid[r][c];
      if (!v) continue;
      (seen[v] = seen[v] || []).push(`${r},${c}`);
    }
    Object.values(seen).forEach((ks) => ks.length > 1 && ks.forEach((k) => bad.add(k)));
  }
  return bad;
}

export const isSolved = (grid) => grid.every((r) => r.every(Boolean)) && conflicts(grid).size === 0;
