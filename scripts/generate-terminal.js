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

// keyTimes for SMIL <animate> must be 0..1 decimals (NOT percentages)
function kt(t, total) {
  return Math.min(1, t / total).toFixed(5);
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
    const k0   = kt(0,       totalDur);
    const kOn  = kt(ev.t,    totalDur);
    const kH   = kt(HIDE,    totalDur);
    const k1   = '1';

    if (ev.kind === 'prompt') {
      els += `
  <text id="${id}" x="${PAD_X}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${C.green}" opacity="0"
  >${esc(PROMPT)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${k0};${kOn};${kOn};${kH};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/></text>`;

    } else if (ev.kind === 'mask') {
      const endT = ev.t + ev.maskDur;
      const kEnd = kt(endT, totalDur);

      // Actual command text
      els += `
  <text id="${id}-t" x="${ev.cmdX}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${C.white}" opacity="0"
  >${esc(ev.text)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${k0};${kOn};${kOn};${kH};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/></text>`;

      // Sliding mask rect — left-to-right reveal (right edge fixed at
      // cmdX+maskW, left edge advances as typing progresses, so text is
      // uncovered in reading order like real typing)
      els += `
  <rect id="${id}-m" x="${ev.cmdX}" y="${ev.y - FONT_PX - 2}"
    width="${ev.maskW}" height="${FONT_PX + 4}" fill="${C.bg}" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0;0"
      keyTimes="${k0};${kOn};${kOn};${kH};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/>
    <animate attributeName="x" values="${ev.cmdX};${ev.cmdX};${ev.cmdX + ev.maskW};${ev.cmdX + ev.maskW};${ev.cmdX}"
      keyTimes="${k0};${kOn};${kEnd};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/>
    <animate attributeName="width" values="${ev.maskW};${ev.maskW};0;0;${ev.maskW}"
      keyTimes="${k0};${kOn};${kEnd};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

      // Typing cursor — tracks the reveal edge while typing (same keyTimes
      // as the mask, guaranteed monotonic), stays solid while characters
      // are appearing, then does a quick double-blink during the fixed
      // T_PAUSE window right after typing ends ("command submitted") before
      // going dark. Blink offsets are fractions of T_PAUSE — a constant
      // duration independent of command length — so they can never land
      // past the pause regardless of how short the command is.
      const kBlink1 = kt(endT + T_PAUSE / 3, totalDur);
      const kBlink2 = kt(endT + T_PAUSE * 2 / 3, totalDur);
      const kPauseEnd = kt(endT + T_PAUSE, totalDur);
      els += `
  <rect id="${id}-cur" x="${ev.cmdX}" y="${ev.y - FONT_PX + 1}"
    width="7" height="${FONT_PX + 1}" fill="${C.green}" opacity="0">
    <animate attributeName="x" values="${ev.cmdX};${ev.cmdX};${ev.cmdX + ev.maskW};${ev.cmdX + ev.maskW};${ev.cmdX}"
      keyTimes="${k0};${kOn};${kEnd};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/>
    <animate attributeName="opacity"
      values="0;1;1;0;1;0;0;0"
      keyTimes="${k0};${kOn};${kEnd};${kBlink1};${kBlink2};${kPauseEnd};${kH};${k1}"
      dur="${DUR}" repeatCount="indefinite"/>
  </rect>`;

    } else if (ev.kind === 'output') {
      els += `
  <text id="${id}" x="${PAD_X + 4}" y="${ev.y}"
    font-family="monospace" font-size="${FONT_PX}" fill="${ev.color}" opacity="0"
  >${esc(ev.text)}<animate attributeName="opacity"
      values="0;0;1;1;0;0"
      keyTimes="${k0};${kOn};${kOn};${kH};${kH};${k1}"
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
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="${C.bg}" rx="6"/>

  <!-- chrome bar -->
  <rect width="${W}" height="${CHROME_H}" fill="${C.chrome}" rx="6"/>
  <rect width="${W}" height="${CHROME_H - 6}" y="6" fill="${C.chrome}"/>
  <rect y="${CHROME_H-1}" width="${W}" height="1" fill="${C.border}"/>
  ${dots}
  <text x="${W/2}" y="${CHROME_H/2+4}" text-anchor="middle"
    font-family="monospace" font-size="11" fill="${C.dim}"
  >root@yami02 :: intrusion terminal</text>

  <!-- animated text (no filter — GitHub strips filter results) -->
${els}

  <!-- scanlines -->
  <rect width="${W}" height="${H}" fill="url(#sl)" opacity="0.5"/>

  <!-- scan line sweep -->
  <rect width="${W}" height="3" fill="rgba(0,255,255,0.05)" y="-3">
    <animate attributeName="y" from="-3" to="${H}" dur="5s" repeatCount="indefinite"/>
  </rect>

  <!-- border -->
  <rect width="${W-1}" height="${H-1}" x="0.5" y="0.5"
    fill="none" stroke="${C.border}" stroke-width="1" rx="6"/>
</svg>`;
}

// ════════════════════════════════════════════════════════════════
//  ⚙  CERTIFICATIONS — edite aqui
// ════════════════════════════════════════════════════════════════
const CERTS = [
  { label: 'HTB CPTS', full: 'HackTheBox Certified Penetration Testing Specialist', pct: 11, status: 'active' },
  { label: 'OSCP',     full: 'Offensive Security Certified Professional',             pct: 0,  status: 'dream'  },
  { label: 'TCM PMAT', full: 'Practical Malware Analysis & Triage — TCM Security',   pct: 0,  status: 'dream'  },
];

// ── Certs SVG ─────────────────────────────────────────────────────────────
function generateCertsSVG() {
  const W       = 640;
  const ROW_H   = 48;
  const CHROME  = 28;
  const MINER_W = 72;           // pixel miner column width on the left
  const PAD_X   = MINER_W + 12;
  const H       = CHROME + CERTS.length * ROW_H + 18;
  const BAR_W   = W - PAD_X - 50;
  const BAR_H   = 8;

  const BG    = '#050a05';
  const CHR   = '#0d1a0d';
  const BORD  = '#1c3a1c';
  const GRN   = '#39FF14';
  const YEL   = '#FFE900';
  const MAG   = '#FF00FF';
  const DIM   = '#3a6a3a';
  const TXT   = '#b8d8b8';
  const TRACK = '#111a11';

  // ── pixel miner sprite (9-col × 14-row, scale=4px)
  // Characters: H=helmet K=skin B=body W=white O=shadow P=pickaxe D=dirt _=empty
  const S = 4; // pixel block size
  const SPRITE = [
    '  HHH    ',
    ' HHHHH   ',
    ' HKKKH   ',
    ' HKOKH   ',
    '  HKKH   ',
    '  BBBBB  ',
    ' BBBBBBB ',
    ' BB B BB ',
    '  B   B  ',
    '  B   B  ',
    ' BB   BB ',
    ' BB   BB ',
    ' WW   WW ',
    ' WW   WW ',
  ];
  const COL = { H:'#3a3a8a', K:'#f5c18a', B:'#4a2a0a', W:'#e8e0d0', O:'#cc5500', _:null };

  const MX = 8;   // miner top-left x
  const MY = CHROME + 6; // miner top-left y

  // build miner pixel blocks
  let minerPixels = '';
  for (let r = 0; r < SPRITE.length; r++) {
    for (let c = 0; c < SPRITE[r].length; c++) {
      const ch = SPRITE[r][c];
      if (ch === ' ' || ch === '_') continue;
      const col = COL[ch] || '#888';
      minerPixels += `<rect x="${MX + c*S}" y="${MY + r*S}" width="${S}" height="${S}" fill="${col}"/>`;
    }
  }

  // ── animated pickaxe (3 frames: up / mid / down)
  // arm tip (right side of body, row 6, col 8)
  const AX = MX + 8*S;
  const AY = MY + 6*S;
  // handle = line of S×S blocks at angle; 3 keyframe angles
  function pickaxeFrame(angle, color='#8B4513') {
    const len = 5; // blocks
    let d = '';
    for (let i = 0; i < len; i++) {
      const hx = Math.round(AX + Math.cos(angle) * i * S);
      const hy = Math.round(AY + Math.sin(angle) * i * S);
      d += `<rect x="${hx}" y="${hy}" width="${S}" height="${S}" fill="${color}"/>`;
    }
    // pickaxe head
    const hpX = Math.round(AX + Math.cos(angle) * len * S);
    const hpY = Math.round(AY + Math.sin(angle) * len * S);
    const px = -Math.sin(angle), py = Math.cos(angle);
    for (let d2 = -2; d2 <= 2; d2++) {
      const ex = Math.round(hpX + px * d2 * S);
      const ey = Math.round(hpY + py * d2 * S);
      d += `<rect x="${ex}" y="${ey}" width="${S}" height="${S}" fill="#aaaaaa"/>`;
    }
    return d;
  }

  const frameUp   = pickaxeFrame(-0.5);   // handle up-right
  const frameMid  = pickaxeFrame(0.1);    // horizontal
  const frameDown = pickaxeFrame(0.7);    // handle down-right (strike)

  // animate opacity: each frame visible for 0.25s, cycle 0.75s
  function frameAnim(visible, total='0.75s') {
    // visible = which 0.25s slot (0,1,2)
    const slots = [0,1,2].map(s => s === visible ? '1' : '0').join(';0;');
    const times = [0, visible*0.25/0.75, visible*0.25/0.75+0.001,
                   (visible*0.25+0.25)/0.75, (visible*0.25+0.25)/0.75+0.001, 1]
      .map(t => t.toFixed(3)).join(';');
    const vals  = [0,0,1,1,0,0].join(';');
    return `<animate attributeName="opacity" dur="${total}" repeatCount="indefinite"
      keyTimes="${times}" values="${vals}"/>`;
  }

  const pickaxeSVG = `
  <!-- pickaxe frame 0: up -->
  <g opacity="0">${frameUp}<animate attributeName="opacity" dur="0.75s" repeatCount="indefinite"
    keyTimes="0;0.001;0.333;0.334;1" values="1;1;1;0;0"/></g>
  <!-- pickaxe frame 1: mid -->
  <g opacity="0">${frameMid}<animate attributeName="opacity" dur="0.75s" repeatCount="indefinite"
    keyTimes="0;0.332;0.333;0.666;0.667;1" values="0;0;1;1;0;0"/></g>
  <!-- pickaxe frame 2: down/strike -->
  <g opacity="0">${frameDown}<animate attributeName="opacity" dur="0.75s" repeatCount="indefinite"
    keyTimes="0;0.665;0.666;0.999;1;1" values="0;0;1;1;0;0"/></g>
  <!-- spark on strike -->
  <g opacity="0">
    <rect x="${AX + 4*S}" y="${AY + 4*S}" width="2" height="2" fill="${YEL}"/>
    <rect x="${AX + 5*S}" y="${AY + 3*S}" width="2" height="2" fill="${GRN}"/>
    <rect x="${AX + 3*S}" y="${AY + 5*S}" width="2" height="2" fill="${YEL}"/>
    <animate attributeName="opacity" dur="0.75s" repeatCount="indefinite"
      keyTimes="0;0.665;0.666;0.75;0.751;1" values="0;0;1;1;0;0"/>
  </g>
  <!-- dust/debris kicked up on strike (earthy chips flying outward from the impact) -->
  <g opacity="0">
    <rect x="${AX + 4*S}" y="${AY + 5*S}" width="2" height="2" fill="#5a4a3a">
      <animate attributeName="x" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AX + 4*S};${AX + 4*S};${AX + 7*S}"/>
      <animate attributeName="y" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AY + 5*S};${AY + 5*S};${AY + 2*S}"/>
    </rect>
    <rect x="${AX + 3*S}" y="${AY + 6*S}" width="2" height="2" fill="#3a2a1a">
      <animate attributeName="x" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AX + 3*S};${AX + 3*S};${AX - S}"/>
      <animate attributeName="y" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AY + 6*S};${AY + 6*S};${AY + 3*S}"/>
    </rect>
    <rect x="${AX + 5*S}" y="${AY + 6*S}" width="1" height="1" fill="#5a4a3a">
      <animate attributeName="x" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AX + 5*S};${AX + 5*S};${AX + 6*S}"/>
      <animate attributeName="y" dur="0.75s" repeatCount="indefinite"
        keyTimes="0;0.666;1" values="${AY + 6*S};${AY + 6*S};${AY + 8*S}"/>
    </rect>
    <animate attributeName="opacity" dur="0.75s" repeatCount="indefinite"
      keyTimes="0;0.665;0.666;0.85;0.999;1" values="0;0;1;1;0;0"/>
  </g>`;

  // ── cert rows
  let rows = '';
  CERTS.forEach((cert, i) => {
    const ry = CHROME + i * ROW_H + 10;
    const isActive = cert.status === 'active';
    const isDream  = cert.status === 'dream';

    const labelCol = isDream ? MAG : isActive ? GRN : DIM;
    const badge    = isActive ? 'INCOMING' : isDream ? 'someday...' : 'queued';
    const badgeCol = isActive ? YEL : isDream ? MAG : DIM;
    const barCol   = isDream ? MAG : isActive ? GRN : '#2a3a2a';
    const fillW    = Math.round((cert.pct / 100) * BAR_W);
    const delay    = `${i * 0.5}s`;

    rows += `
  <!-- ── ${cert.label} ── -->
  <text x="${PAD_X}" y="${ry + 11}"
    font-family="monospace" font-size="11" font-weight="bold" fill="${labelCol}"
  >${cert.label}</text>
  <rect x="${PAD_X + 62}" y="${ry}" width="${badge.length * 6 + 6}" height="13"
    fill="${isActive ? '#1c1c00' : isDream ? '#1c001c' : '#0a120a'}" rx="2"/>
  <text x="${PAD_X + 65}" y="${ry + 10}"
    font-family="monospace" font-size="8" fill="${badgeCol}"
  >${badge}</text>
  <text x="${PAD_X}" y="${ry + 24}"
    font-family="monospace" font-size="8" fill="${DIM}"
  >${cert.full}</text>
  <rect x="${PAD_X}" y="${ry + 28}" width="${BAR_W}" height="${BAR_H}" fill="${TRACK}" rx="2"/>
  <rect x="${PAD_X}" y="${ry + 28}" width="${BAR_W}" height="${BAR_H}"
    fill="none" stroke="${BORD}" stroke-width="0.5" rx="2"/>
  ${fillW > 0 ? `
  <rect x="${PAD_X + 1}" y="${ry + 29}" width="0" height="${BAR_H - 2}" fill="${barCol}" rx="1">
    <animate attributeName="width" from="0" to="${fillW - 1}"
      dur="1.5s" begin="${delay}" fill="freeze"/>
  </rect>
  ${isActive && fillW > 2 ? `<rect x="${PAD_X + fillW - 2}" y="${ry + 29}" width="2" height="${BAR_H - 2}" fill="#ffffff">
    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.8s" repeatCount="indefinite"/>
  </rect>` : ''}` : `
  <text x="${PAD_X + 4}" y="${ry + 35}" font-family="monospace" font-size="7" fill="${DIM}"
  >not started</text>`}
  <text x="${PAD_X + BAR_W + 5}" y="${ry + 36}"
    font-family="monospace" font-size="9" fill="${isActive ? TXT : DIM}"
  >${cert.pct}%</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="sl2" x="0" y="0" width="${W}" height="3" patternUnits="userSpaceOnUse">
      <rect width="${W}" height="1" y="1" fill="rgba(0,0,0,0.09)"/>
    </pattern>
  </defs>

  <!-- bg -->
  <rect width="${W}" height="${H}" fill="${BG}" rx="6"/>

  <!-- chrome -->
  <rect width="${W}" height="${CHROME}" fill="${CHR}" rx="6"/>
  <rect width="${W}" height="${CHROME - 6}" y="6" fill="${CHR}"/>
  <rect y="${CHROME - 1}" width="${W}" height="1" fill="${BORD}"/>
  <circle cx="14" cy="${CHROME/2}" r="4" fill="#ff5f56"/>
  <circle cx="28" cy="${CHROME/2}" r="4" fill="#ffbd2e"/>
  <circle cx="42" cy="${CHROME/2}" r="4" fill="#27c93f"/>
  <text x="${W/2}" y="${CHROME/2 + 4}" text-anchor="middle"
    font-family="monospace" font-size="10" fill="${DIM}"
  >root@yami02:~# cat certs/roadmap.txt</text>

  <!-- miner sprite -->
  ${minerPixels}
  ${pickaxeSVG}

  <!-- divider between miner and rows -->
  <rect x="${MINER_W + 4}" y="${CHROME + 4}" width="1" height="${H - CHROME - 8}" fill="${BORD}"/>

  <!-- cert rows -->
  ${rows}

  <!-- scanlines -->
  <rect width="${W}" height="${H}" fill="url(#sl2)" opacity="0.6"/>

  <!-- border -->
  <rect width="${W-1}" height="${H-1}" x="0.5" y="0.5"
    fill="none" stroke="${BORD}" stroke-width="1" rx="6"/>
</svg>`;
}

// ── Write outputs ──────────────────────────────────────────────────────────
const fs      = require('fs');
const path    = require('path');
const cwd     = process.cwd();

const outFile  = process.env.OUTPUT_FILE  || path.join(cwd, 'terminal.svg');
const certFile = process.env.CERTS_FILE   || path.join(cwd, 'certs.svg');

const svg  = generateSVG();
const csvg = generateCertsSVG();

fs.writeFileSync(outFile,  svg,  'utf8');
fs.writeFileSync(certFile, csvg, 'utf8');

console.log(`[TERMINAL] ✓ ${outFile}   (${(svg.length/1024).toFixed(1)} KB)`);
console.log(`[CERTS]    ✓ ${certFile}  (${(csvg.length/1024).toFixed(1)} KB)`);
