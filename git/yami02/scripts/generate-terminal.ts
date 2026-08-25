/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TERMINAL SVG GENERATOR v1.0 :: root@yami02                 ║
 * ║  Outputs terminal.svg — pure CSS animation, GitHub-ready    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Runs via GitHub Actions daily, or: npx ts-node scripts/generate-terminal.ts
 *
 * ════════════════════════════════════════════════════════════════
 *  ⚙  EDIT YOUR COMMANDS BELOW
 * ════════════════════════════════════════════════════════════════
 */

import * as fs from "fs";
import * as path from "path";

// ── ⚙ Configure your commands here ───────────────────────────────────────────
const COMMANDS: Array<{ cmd: string; out: string[] }> = [
  {
    cmd: "whoami",
    out: [
      "[+] yami02 :: Security Intern",
      "[*] loc: Belo Horizonte, MG — BR",
      "[*] UFMG (Math) · IFES (IT/Networks)",
      "[*] mode: OFFENSIVE",
    ],
  },
  {
    cmd: "nmap -sV --open 10.0.1.1",
    out: [
      "PORT    STATE SERVICE  VERSION",
      "22/tcp  open  ssh      OpenSSH 8.9p1",
      "80/tcp  open  http     Apache 2.4.52",
      "[!] CVE-2021-41773 detected on :80",
    ],
  },
  {
    cmd: "python3 exploit.py --target 10.0.1.1",
    out: [
      "[*] sending payload...",
      "[+] RCE confirmed",
      "[+] uid=0(root) gid=0(root) groups=0(root)",
    ],
  },
  {
    cmd: "cat /flag.txt",
    out: ["[+] flag{y4m1_w4s_h3r3_4nd_l3ft_n0_tr4c3}"],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

// ── Layout & timing constants ─────────────────────────────────────────────────
const W         = 640;
const FONT_PX   = 13;
const LINE_H    = 20;
const CHROME_H  = 32;
const PAD_X     = 18;
const PROMPT    = "root@yami02:~# ";
const CHAR_W    = 7.84;   // monospace 13px ≈ 7.84px per char
const PROMPT_PX = PROMPT.length * CHAR_W;

const T_CHAR    = 0.075;  // s per character typed
const T_PAUSE   = 0.38;   // s pause after command finishes
const T_LINE    = 0.13;   // s between each output line
const T_AFTER   = 1.15;   // s pause after all output
const T_GAP     = 0.5;    // s pause before loop restarts

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#050a05",
  chrome:  "#0d1a0d",
  border:  "#1c3a1c",
  green:   "#39FF14",
  cyan:    "#00FFFF",
  magenta: "#FF00FF",
  yellow:  "#FFE900",
  dim:     "#3a6a3a",
  text:    "#b8d8b8",
  white:   "#e8e8e8",
};

function lineColor(line: string): string {
  if (line.startsWith("[+]")) return C.green;
  if (line.startsWith("[!]")) return C.yellow;
  if (line.startsWith("[*]")) return C.cyan;
  if (line.startsWith("[-]")) return C.magenta;
  return C.text;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Build flat timeline ───────────────────────────────────────────────────────
interface TEvent {
  kind:      "prompt" | "mask" | "output";
  y:         number;
  text?:     string;
  color?:    string;
  cmdX?:     number;    // x of command text (for mask)
  maskW?:    number;    // initial mask width
  maskDur?:  number;    // how long mask slides
  t:         number;    // start time (seconds)
}

function buildTimeline(): { events: TEvent[]; totalDur: number; height: number } {
  const events: TEvent[] = [];
  let t = 0.25;
  let y = CHROME_H + 14 + FONT_PX; // baseline of first text line

  for (const { cmd, out } of COMMANDS) {
    // Prompt appears
    events.push({ kind: "prompt", y, t });

    // Mask slides away to reveal command text (typing effect)
    const typeDur = cmd.length * T_CHAR;
    const cmdX    = PAD_X + PROMPT_PX;
    const maskW   = Math.ceil(cmd.length * CHAR_W) + 4;
    events.push({ kind: "mask", y, text: cmd, cmdX, maskW, maskDur: typeDur, t });

    t += typeDur + T_PAUSE;
    y += LINE_H;

    // Output lines
    for (const line of out) {
      events.push({ kind: "output", y, text: line, color: lineColor(line), t });
      t += T_LINE;
      y += LINE_H;
    }

    // Blank spacing after output block
    y += 6;
    t += T_AFTER;
  }

  const totalDur = t + T_GAP;
  const height   = y + 18; // some bottom padding

  return { events, totalDur, height: Math.min(height, 480) };
}

// ── SVG generation ────────────────────────────────────────────────────────────
function pct(t: number, total: number, digits = 3): string {
  return ((t / total) * 100).toFixed(digits) + "%";
}

function generateSVG(): string {
  const { events, totalDur, height } = buildTimeline();
  const H = height;
  const DUR = totalDur.toFixed(2) + "s";
  const HIDE_T = totalDur - T_GAP; // elements hide just before loop

  let els = "";

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const id = `e${i}`;

    // All elements are hidden initially (opacity 0) and appear at ev.t
    const p0    = pct(0,       totalDur);
    const pOn   = pct(ev.t,    totalDur);
    const pHide = pct(HIDE_T,  totalDur);
    const p1    = "100%";

    if (ev.kind === "prompt") {
      // Prompt text — appears instantly at ev.t, hides at HIDE_T
      els += `
  <text id="${id}" x="${PAD_X}" y="${ev.y}" font-family="monospace" font-size="${FONT_PX}" fill="${C.green}" opacity="0">
    ${esc(PROMPT)}
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pHide};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </text>`;

    } else if (ev.kind === "mask") {
      // Command text underneath the sliding mask
      const endT  = ev.t + (ev.maskDur ?? 1);
      const pEnd  = pct(endT, totalDur);

      // Command text (starts visible at ev.t, hidden before)
      els += `
  <text id="${id}-t" x="${ev.cmdX}" y="${ev.y}" font-family="monospace" font-size="${FONT_PX}" fill="${C.white}" opacity="0">
    ${esc(ev.text ?? "")}
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pHide};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </text>`;

      // Sliding mask rect — covers text and slides right→left to reveal it
      const mW = ev.maskW ?? 100;
      els += `
  <rect id="${id}-m" x="${ev.cmdX}" y="${ev.y - FONT_PX - 1}" width="${mW}" height="${FONT_PX + 4}" fill="${C.bg}" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pHide};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
    <animate attributeName="width" values="${mW};${mW};0;0;${mW}"
      keyTimes="${p0};${pOn};${pEnd};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

      // Blinking cursor during typing — small rect at end of typed text
      // We use a separate rect positioned at cmdX, using clipPath or just at start
      els += `
  <rect id="${id}-cur" x="${ev.cmdX}" y="${ev.y - FONT_PX + 1}" width="7" height="${FONT_PX + 1}" fill="${C.green}" opacity="0">
    <animate attributeName="opacity" values="0;0;1;0;1;0;1;0;0;0"
      keyTimes="${p0};${pOn};${pOn};${pct(ev.t + 0.2, totalDur)};${pct(ev.t + 0.4, totalDur)};${pct(ev.t + 0.6, totalDur)};${pct(ev.t + 0.8, totalDur)};${pEnd};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

    } else if (ev.kind === "output") {
      // Output line — appears at ev.t
      els += `
  <text id="${id}" x="${PAD_X + 4}" y="${ev.y}" font-family="monospace" font-size="${FONT_PX}" fill="${ev.color ?? C.text}" opacity="0">
    ${esc(ev.text ?? "")}
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pHide};${pHide};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </text>`;
    }
  }

  // ── Chrome dots
  const chromeDots = [
    { x: 14, color: "#ff5f56" },
    { x: 30, color: "#ffbd2e" },
    { x: 46, color: "#27c93f" },
  ].map(({ x, color }) =>
    `<circle cx="${x}" cy="${CHROME_H / 2}" r="5" fill="${color}"/>`
  ).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Scanline pattern -->
    <pattern id="sl" x="0" y="0" width="${W}" height="4" patternUnits="userSpaceOnUse">
      <rect width="${W}" height="2" fill="rgba(0,0,0,0.12)"/>
    </pattern>
    <!-- Rounded clip -->
    <clipPath id="frame">
      <rect width="${W}" height="${H}" rx="6" ry="6"/>
    </clipPath>
    <!-- Glow filter -->
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g clip-path="url(#frame)">
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="${C.bg}"/>

    <!-- Chrome bar -->
    <rect width="${W}" height="${CHROME_H}" fill="${C.chrome}"/>
    <rect y="${CHROME_H - 1}" width="${W}" height="1" fill="${C.border}"/>
    ${chromeDots}
    <text x="${W / 2}" y="${CHROME_H / 2 + 4}" text-anchor="middle"
      font-family="monospace" font-size="11" fill="${C.dim}">
      root@yami02 :: intrusion terminal
    </text>

    <!-- Terminal content (glow group) -->
    <g filter="url(#glow)">
${els}
    </g>

    <!-- Scanlines overlay -->
    <rect width="${W}" height="${H}" fill="url(#sl)" opacity="0.7"/>

    <!-- Animated scan beam -->
    <rect width="${W}" height="3" fill="rgba(0,255,255,0.04)">
      <animate attributeName="y" from="-3" to="${H}" dur="5s" repeatCount="indefinite"/>
    </rect>

    <!-- Border -->
    <rect width="${W - 1}" height="${H - 1}" x="0.5" y="0.5"
      fill="none" stroke="${C.border}" stroke-width="1" rx="6"/>
  </g>
</svg>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main(): void {
  const outFile = process.env.OUTPUT_FILE ?? path.join(process.cwd(), "terminal.svg");
  const svg     = generateSVG();

  fs.writeFileSync(outFile, svg, "utf8");

  const kb = (svg.length / 1024).toFixed(1);
  console.log(`[TERMINAL] ╔═ SVG GENERATOR ══════════════════╗`);
  console.log(`[TERMINAL] ║ commands : ${COMMANDS.length}                           ║`);
  console.log(`[TERMINAL] ║ output   : terminal.svg (${kb} KB)${"".padEnd(Math.max(0, 10 - kb.length))}║`);
  console.log(`[TERMINAL] ╚══════════════════════════════════╝`);
}

main();
