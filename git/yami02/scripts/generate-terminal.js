#!/usr/bin/env node
/**
 * generate-terminal.js  — plain Node.js, zero dependencies
 * Generates terminal.svg for the GitHub README.
 *
 * Run: node scripts/generate-terminal.js
 * Output: terminal.svg  (or $OUTPUT_FILE)
 *
 * ════════════════════════════════════════════════════════════════
 *  ⚙  EDITE SEUS COMANDOS AQUI
 * ════════════════════════════════════════════════════════════════
 */

const COMMANDS = [
  {
    cmd: 'whoami',
    out: [
      '[+] yami02 :: Security Intern',
      '[*] loc: Belo Horizonte, MG — BR',
      '[*] UFMG (Math) · IFES (IT/Networks)',
      '[*] mode: OFFENSIVE',
    ],
  },
  {
    cmd: 'nmap -sV --open 10.0.1.1',
    out: [
      'PORT    STATE SERVICE  VERSION',
      '22/tcp  open  ssh      OpenSSH 8.9p1',
      '80/tcp  open  http     Apache 2.4.52',
      '[!] CVE-2021-41773 detected on :80',
    ],
  },
  {
    cmd: 'python3 exploit.py --target 10.0.1.1',
    out: [
      '[*] sending payload...',
      '[+] RCE confirmed',
      '[+] uid=0(root) gid=0(root) groups=0(root)',
    ],
  },
  {
    cmd: 'cat /flag.txt',
    out: [
      '[+] flag{y4m1_w4s_h3r3_4nd_l3ft_n0_tr4c3}',
    ],
  },
];

/* ════════════════════════════════════════════════════════════════
   CONFIG — raramente precisa mudar
   ════════════════════════════════════════════════════════════════ */
const W        = 640;
const FONT_PX  = 13;
const LINE_H   = 20;
const CHROME_H = 32;
const PAD_X    = 18;
const PROMPT   = 'root@yami02:~# ';
const CHAR_W   = 7.84;   // monospace 13px ≈ 7.84 px/char
const PROMPT_W = PROMPT.length * CHAR_W;

// Timing (seconds)
const T_CHAR  = 0.075;  // per character typed
const T_PAUSE = 0.38;   // after command done
const T_LINE  = 0.13;   // between output lines
const T_AFTER = 1.15;   // after last output line
const T_GAP   = 0.6;    // loop gap at end

const C = {
  bg:     '#050a05', chrome: '#0d1a0d', border: '#1c3a1c',
  green:  '#39FF14', cyan:   '#00FFFF', mag:    '#FF00FF',
  yellow: '#FFE900', dim:    '#3a6a3a', text:   '#b8d8b8', white: '#e0e8e0',
};

function lineColor(t) {
  if (t.startsWith('[+]')) return C.green;
  if (t.startsWith('[!]')) return C.yellow;
  if (t.startsWith('[*]')) return C.cyan;
  if (t.startsWith('[-]')) return C.mag;
  return C.text;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pct(t, total) {
  return ((t / total) * 100).toFixed(4) + '%';
}

// ── Build flat timeline ────────────────────────────────────────────────────
function buildTimeline() {
  const events = [];
  let t = 0.25;
  let y = CHROME_H + 14 + FONT_PX;

  for (const { cmd, out } of COMMANDS) {
    // Prompt appears
    events.push({ kind: 'prompt', y, t });

    // Mask slides away to reveal command (typing simulation)
    const typeDur = cmd.length * T_CHAR;
    const cmdX    = PAD_X + PROMPT_W;
    const maskW   = Math.ceil(cmd.length * CHAR_W) + 4;
    events.push({ kind: 'mask', y, text: cmd, cmdX, maskW, maskDur: typeDur, t });

    t += typeDur + T_PAUSE;
    y += LINE_H;

    for (const line of out) {
      events.push({ kind: 'output', y, text: line, color: lineColor(line), t });
      t += T_LINE;
      y += LINE_H;
    }

    y += 6;
    t += T_AFTER;
  }

  const totalDur = t + T_GAP;
  const height   = Math.min(y + 20, 520);
  return { events, totalDur, height };
}

// ── SVG ───────────────────────────────────────────────────────────────────
function generateSVG() {
  const { events, totalDur, height } = buildTimeline();
  const H    = height;
  const DUR  = totalDur.toFixed(2) + 's';
  const HIDE = totalDur - T_GAP;
  let   els  = '';

  events.forEach((ev, i) => {
    const id   = `e${i}`;
    const p0   = pct(0,       totalDur);
    const pOn  = pct(ev.t,    totalDur);
    const pH   = pct(HIDE,    totalDur);
    const p1   = '100%';

    if (ev.kind === 'prompt') {
      els += `
  <text id="${id}" x="${PAD_X}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${C.green}" opacity="0"
  >${esc(PROMPT)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pH};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/></text>`;

    } else if (ev.kind === 'mask') {
      const endT = ev.t + ev.maskDur;
      const pEnd = pct(endT, totalDur);

      // Actual command text
      els += `
  <text id="${id}-t" x="${ev.cmdX}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${C.white}" opacity="0"
  >${esc(ev.text)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pH};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/></text>`;

      // Sliding mask rect (right-to-left reveal)
      els += `
  <rect id="${id}-m" x="${ev.cmdX}" y="${ev.y - FONT_PX - 2}"
    width="${ev.maskW}" height="${FONT_PX + 4}" fill="${C.bg}" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pH};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
    <animate attributeName="width" values="${ev.maskW};${ev.maskW};0;0;${ev.maskW}"
      keyTimes="${p0};${pOn};${pEnd};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

      // Typing cursor (blinks a few times, then disappears when output shows)
      const c0 = pct(ev.t + 0.1, totalDur);
      const c1 = pct(ev.t + 0.3, totalDur);
      const c2 = pct(ev.t + 0.5, totalDur);
      const c3 = pct(ev.t + 0.7, totalDur);
      els += `
  <rect id="${id}-cur" x="${ev.cmdX}" y="${ev.y - FONT_PX + 1}"
    width="7" height="${FONT_PX + 1}" fill="${C.green}" opacity="0">
    <animate attributeName="opacity"
      values="0;0;1;0;1;0;1;0;0;0"
      keyTimes="${p0};${pOn};${c0};${c1};${c2};${c3};${pEnd};${pEnd};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

    } else if (ev.kind === 'output') {
      els += `
  <text id="${id}" x="${PAD_X + 4}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${ev.color}" opacity="0"
  >${esc(ev.text)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${p0};${pOn};${pOn};${pH};${pH};${p1}"
      dur="${DUR}" repeatCount="indefinite"/></text>`;
    }
  });

  const dots = [
    { x: 14, fill: '#ff5f56' },
    { x: 30, fill: '#ffbd2e' },
    { x: 46, fill: '#27c93f' },
  ].map(d => `<circle cx="${d.x}" cy="${CHROME_H/2}" r="5" fill="${d.fill}"/>`).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="sl" x="0" y="0" width="${W}" height="4" patternUnits="userSpaceOnUse">
      <rect width="${W}" height="2" fill="rgba(0,0,0,0.11)"/>
    </pattern>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="6"/></clipPath>
    <filter id="glow" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect width="${W}" height="${CHROME_H}" fill="${C.chrome}"/>
    <rect y="${CHROME_H-1}" width="${W}" height="1" fill="${C.border}"/>
    ${dots}
    <text x="${W/2}" y="${CHROME_H/2+4}" text-anchor="middle"
      font-family="monospace" font-size="11" fill="${C.dim}"
    >root@yami02 :: intrusion terminal</text>
    <g filter="url(#glow)">
${els}
    </g>
    <rect width="${W}" height="${H}" fill="url(#sl)" opacity="0.65"/>
    <rect width="${W}" height="3" fill="rgba(0,255,255,0.04)">
      <animate attributeName="y" from="-3" to="${H}" dur="5s" repeatCount="indefinite"/>
    </rect>
    <rect width="${W-1}" height="${H-1}" x="0.5" y="0.5"
      fill="none" stroke="${C.border}" stroke-width="1" rx="6"/>
  </g>
</svg>`;
}

// ── Write output ───────────────────────────────────────────────────────────
const fs      = require('fs');
const path    = require('path');
const outFile = process.env.OUTPUT_FILE || path.join(process.cwd(), 'terminal.svg');
const svg     = generateSVG();

fs.writeFileSync(outFile, svg, 'utf8');
const kb = (svg.length / 1024).toFixed(1);
console.log(`[TERMINAL] ✓ ${outFile}  (${kb} KB)`);
