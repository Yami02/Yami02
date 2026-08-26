/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  CYBER-BONSAI GENERATOR v2.0 :: root@yami02:~#      ║
 * ║  デジタルボンサイ生成システム                             ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Procedurally generates a neon ASCII bonsai tree (SVG)
 * based on GitHub contribution data.
 *
 * Usage: GITHUB_TOKEN=<token> GITHUB_USERNAME=yami02 npx ts-node generate-bonsai.ts
 */

import * as fs from "fs";
import * as https from "https";
import * as path from "path";

// ── Types ──────────────────────────────────────────────────────────────────
interface Cell {
  char: string;
  color: CellColor;
}

type CellColor =
  | "trunk"
  | "branch"
  | "twig"
  | "leaf-green"
  | "leaf-cyan"
  | "leaf-magenta"
  | "leaf-yellow"
  | "pot"
  | "pot-rim"
  | "ground"
  | "empty";

interface BonsaiConfig {
  cols: number;
  rows: number;
  contributions: number;
  seed: number;
}

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

// ── Bonsai Grid ───────────────────────────────────────────────────────────
class BonsaiGrid {
  private cells: Cell[][];
  private cols: number;
  private rows: number;
  private rand: () => number;
  private contributions: number;

  constructor(cfg: BonsaiConfig) {
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.contributions = cfg.contributions;
    this.rand = makePRNG(cfg.seed);
    this.cells = Array.from({ length: cfg.rows }, () =>
      Array.from({ length: cfg.cols }, () => ({ char: " ", color: "empty" as CellColor }))
    );
  }

  private set(x: number, y: number, char: string, color: CellColor): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.cols || yi < 0 || yi >= this.rows) return;
    // don't overwrite heavier elements
    const priority: CellColor[] = [
      "empty", "leaf-green", "leaf-cyan", "leaf-magenta", "leaf-yellow",
      "twig", "branch", "trunk", "pot", "pot-rim", "ground",
    ];
    const cur = priority.indexOf(this.cells[yi][xi].color);
    const nxt = priority.indexOf(color);
    if (nxt >= cur) {
      this.cells[yi][xi] = { char, color };
    }
  }

  private get(x: number, y: number): Cell | null {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= this.cols || yi < 0 || yi >= this.rows) return null;
    return this.cells[yi][xi];
  }

  // Recursive branch growth
  private growBranch(
    x: number, y: number,
    dir: number,        // horizontal bias (-1 left, 0 up, 1 right)
    life: number,       // remaining steps
    depth: number       // recursion depth
  ): void {
    if (life <= 0 || y < 1) return;

    // Choose character based on direction
    let char: string;
    if (Math.abs(dir) < 0.25) char = depth < 2 ? "┃" : "|";
    else if (dir < 0) char = depth < 2 ? "╱" : "/";
    else char = depth < 2 ? "╲" : "\\";

    const color: CellColor =
      depth === 0 ? "trunk"
      : depth === 1 ? "branch"
      : "twig";

    this.set(x, y, char, color);

    // Random horizontal wobble
    const wobble = (this.rand() - 0.5) * 0.6;
    const newDir = dir * 0.75 + wobble;
    const newX = x + newDir;
    const newY = y - 1;

    // Chance to fork
    const forkChance = this.contributions > 200 ? 0.45
      : this.contributions > 100 ? 0.35
      : 0.25;

    if (life > 3 && depth < 4 && this.rand() < forkChance) {
      const spread = 0.3 + this.rand() * 0.4;
      this.growBranch(x - spread, y - 1, dir - spread, Math.floor(life * 0.65), depth + 1);
      this.growBranch(x + spread, y - 1, dir + spread, Math.floor(life * 0.65), depth + 1);
    }

    this.growBranch(newX, newY, newDir, life - 1, depth);
  }

  private addLeaves(): void {
    const leafChars = ["✿", "❋", "✦", "◉", "@", "*", "·", "∘", "꙳"];
    const leafColors: CellColor[] = ["leaf-green", "leaf-cyan", "leaf-magenta", "leaf-yellow"];
    const density = Math.min(0.9, 0.2 + this.contributions / 400);

    for (let y = 0; y < this.rows - 4; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];
        if (cell.color === "twig" || cell.color === "branch" || cell.color === "trunk") {
          const neighbors: [number, number][] = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1],
          ];
          for (const [dx, dy] of neighbors) {
            if (this.rand() < density) {
              const ch = leafChars[Math.floor(this.rand() * leafChars.length)];
              const cl = leafColors[Math.floor(this.rand() * leafColors.length)];
              this.set(x + dx, y + dy, ch, cl);
            }
          }
        }
      }
    }
  }

  private drawPot(): void {
    const cx = Math.floor(this.cols / 2);
    const py = this.rows - 3;
    const pw = 10;  // half-width

    // Rim
    for (let x = cx - pw; x <= cx + pw; x++) {
      this.set(x, py, "═", "pot-rim");
    }
    this.set(cx - pw, py, "╔", "pot-rim");
    this.set(cx + pw, py, "╗", "pot-rim");

    // Sides & interior
    for (let x = cx - pw + 1; x <= cx + pw - 1; x++) {
      this.set(x, py + 1, " ", "pot");
    }
    this.set(cx - pw, py + 1, "║", "pot-rim");
    this.set(cx + pw, py + 1, "║", "pot-rim");

    // Kanji label inside pot
    const label = "木 盆 栽";
    const ls = Math.floor(cx - label.length / 2);
    for (let i = 0; i < label.length; i++) {
      this.set(ls + i, py + 1, label[i], "pot");
    }

    // Bottom rim
    for (let x = cx - pw; x <= cx + pw; x++) {
      this.set(x, py + 2, "═", "pot-rim");
    }
    this.set(cx - pw, py + 2, "╚", "pot-rim");
    this.set(cx + pw, py + 2, "╝", "pot-rim");

    // Ground/base
    for (let x = cx - pw - 1; x <= cx + pw + 1; x++) {
      this.set(x, py + 3, "▄", "ground");
    }
  }

  build(): void {
    const cx = Math.floor(this.cols / 2);
    const baseY = this.rows - 4;

    // Trunk
    const trunkH = Math.min(9, 3 + Math.floor(this.contributions / 50));
    for (let i = 0; i < trunkH; i++) {
      this.set(cx, baseY - i, i < 3 ? "█" : "┃", "trunk");
      if (i < 3) {
        this.set(cx - 1, baseY - i, "║", "trunk");
        this.set(cx + 1, baseY - i, "║", "trunk");
      }
    }

    const topY = baseY - trunkH;
    const energy = Math.min(14, 4 + Math.floor(this.contributions / 35));

    // Main branches
    this.growBranch(cx, topY, 0, energy, 0);
    this.growBranch(cx - 1, topY + 1, -0.4, Math.floor(energy * 0.8), 1);
    this.growBranch(cx + 1, topY + 1, 0.4, Math.floor(energy * 0.8), 1);

    if (this.contributions > 80) {
      this.growBranch(cx - 2, topY + 3, -0.6, Math.floor(energy * 0.6), 1);
      this.growBranch(cx + 2, topY + 3, 0.6, Math.floor(energy * 0.6), 1);
    }

    this.addLeaves();
    this.drawPot();
  }

  // ── SVG renderer ──────────────────────────────────────────────────────────
  toSVG(): string {
    const FW = 10;   // font-width  per cell (px)
    const FH = 16;   // font-height per cell (px)
    const PAD = 16;
    const W = this.cols * FW + PAD * 2;
    const H = this.rows * FH + PAD * 2;

    const palette: Record<CellColor, string> = {
      trunk:         "#8B4513",
      branch:        "#A0522D",
      twig:          "#CD853F",
      "leaf-green":  "#39FF14",
      "leaf-cyan":   "#00FFFF",
      "leaf-magenta":"#FF00FF",
      "leaf-yellow": "#FFE900",
      pot:           "#00FFFF",
      "pot-rim":     "#888888",
      ground:        "#555555",
      empty:         "transparent",
    };

    // Build text elements
    let textEls = "";
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const { char, color } = this.cells[y][x];
        if (char === " " || color === "empty") continue;
        const fill = palette[color] ?? "#39FF14";
        const px = PAD + x * FW;
        const py = PAD + (y + 1) * FH - 2;
        const esc = char
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        textEls += `  <text x="${px}" y="${py}" fill="${fill}">${esc}</text>\n`;
      }
    }

    const date = new Date().toISOString().split("T")[0];

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      text {
        font-family: 'Courier New', 'Lucida Console', monospace;
        font-size: 13px;
      }
      .hdr { font-size: 10px; }
      .ftr { font-size: 9px; }
      @keyframes scanline {
        0%   { y: -4; }
        100% { y: ${H}; }
      }
      @keyframes glitch {
        0%,94%,100% { transform: translate(0,0); opacity:1; }
        95%  { transform: translate(-3px, 1px); opacity:.85; }
        97%  { transform: translate(3px, -1px); opacity:.9; }
        99%  { transform: translate(-1px, 2px); opacity:.85; }
      }
      @keyframes flicker {
        0%,100% { opacity:1; }
        50%     { opacity:.93; }
        75%     { opacity:.97; }
      }
      .tree { animation: glitch 8s infinite, flicker 0.15s infinite; }
    </style>

    <!-- CRT glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- Noise / static -->
    <filter id="static" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
      <feBlend in="SourceGraphic" in2="gray" mode="screen" result="blend"/>
      <feComponentTransfer in="blend">
        <feFuncA type="linear" slope="0.97"/>
      </feComponentTransfer>
    </filter>

    <!-- Scanline mask -->
    <pattern id="scanlines" x="0" y="0" width="${W}" height="4" patternUnits="userSpaceOnUse">
      <rect width="${W}" height="2" y="0" fill="rgba(0,0,0,0.25)"/>
      <rect width="${W}" height="2" y="2" fill="rgba(0,0,0,0.05)"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0a0f0a" rx="6"/>

  <!-- Static noise overlay -->
  <rect width="${W}" height="${H}" fill="rgba(57,255,20,0.02)" filter="url(#static)" rx="6"/>

  <!-- Bonsai characters -->
  <g class="tree" filter="url(#glow)">
${textEls}
  </g>

  <!-- Scanlines overlay -->
  <rect width="${W}" height="${H}" fill="url(#scanlines)" rx="6" opacity="0.6"/>

  <!-- Animated scan beam -->
  <rect width="${W}" height="3" fill="rgba(0,255,255,0.04)" rx="1">
    <animate attributeName="y" from="-4" to="${H}" dur="5s" repeatCount="indefinite"/>
  </rect>

  <!-- Corner glitch decorations -->
  <text class="hdr" x="${PAD}" y="${PAD - 4}" fill="#00FF41">[ CYBER BONSAI :: 木 ]</text>
  <text class="ftr" x="${PAD}" y="${H - 4}" fill="#FF00FF">commits:${this.contributions} | ${date} | ボンサイv2</text>
  <text class="ftr" x="${W - 160}" y="${H - 4}" fill="#00FFFF">root@yami02:~# ./grow</text>

  <!-- Border -->
  <rect width="${W - 1}" height="${H - 1}" x="0.5" y="0.5"
    fill="none" stroke="#1a3a1a" stroke-width="1" rx="6"/>
</svg>`;
  }
}

// ── GitHub API ─────────────────────────────────────────────────────────────
function graphql(query: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const opts: https.RequestOptions = {
      hostname: "api.github.com",
      path: "/graphql",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "cyber-bonsai-bot/2.0",
      },
    };
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function fetchContributions(username: string, token: string): Promise<number> {
  if (!token) {
    console.warn("[BONSAI] No GITHUB_TOKEN — using fallback value");
    return 42;
  }
  try {
    const q = `query {
      user(login: "${username}") {
        contributionsCollection {
          contributionCalendar { totalContributions }
        }
      }
    }`;
    const data = await graphql(q, token) as {
      data?: { user?: { contributionsCollection?: { contributionCalendar?: { totalContributions?: number } } } };
    };
    return data?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
  } catch (err) {
    console.error("[BONSAI] API error:", err);
    return 0;
  }
}

// ── Entry point ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const username = process.env.GITHUB_USERNAME ?? "yami02";
  const token    = process.env.GITHUB_TOKEN ?? "";
  const outFile  = process.env.OUTPUT_FILE  ?? path.join(process.cwd(), "bonsai.svg");

  console.log(`[BONSAI] ╔═ CYBER BONSAI GENERATOR v2.0 ═╗`);
  console.log(`[BONSAI] ║ target : ${username.padEnd(28)} ║`);

  const contributions = await fetchContributions(username, token);
  console.log(`[BONSAI] ║ commits: ${String(contributions).padEnd(28)} ║`);

  const seed = contributions > 0 ? contributions : Date.now();
  const bonsai = new BonsaiGrid({ cols: 64, rows: 32, contributions, seed });
  bonsai.build();

  const svg = bonsai.toSVG();
  fs.writeFileSync(outFile, svg, "utf8");

  const kb = (svg.length / 1024).toFixed(1);
  console.log(`[BONSAI] ║ output : ${outFile.slice(-28).padEnd(28)} ║`);
  console.log(`[BONSAI] ║ size   : ${`${kb} KB`.padEnd(28)} ║`);
  console.log(`[BONSAI] ╚════════════════════════════════╝`);
}

main().catch((e) => {
  console.error("[BONSAI] FATAL:", e);
  process.exit(1);
});
