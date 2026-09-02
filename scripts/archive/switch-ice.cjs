const fs = require('fs');

const dashCssIce = `
const DASH_CSS = \`
  .sd-shell {
    min-height: 100vh;
    background: #f8fafc;
    background-image: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.08) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.05) 0px, transparent 50%);
    font-family: inherit;
    color: #1e293b;
  }
  .sd-container { max-width: 1400px; margin: 0 auto; padding: 16px; }
  @media (min-width: 641px){ .sd-container{ padding: 24px 32px; } }
  @media (min-width: 1400px){ .sd-container{ padding: 32px 0; } }

  /* ── top bar ───────────────────────────────────────────────── */
  .sd-topbar{ display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .sd-switcher{ display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; flex: 1; min-width: 0; }
  .sd-switcher::-webkit-scrollbar{ display: none; }
  .sd-switch-btn{ display: flex; align-items: center; gap: 8px; padding: 6px 14px 6px 6px; border-radius: 999px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); font-weight: 700; font-size: 13px; color: #64748b; cursor: pointer; flex-shrink: 0; transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
  .sd-switch-btn:hover { background: rgba(255, 255, 255, 0.9); color: #1e293b; }
  .sd-switch-btn.active{ border-color: transparent; color: #6366f1; background: #fff; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15); }
  .sd-switch-avatar{ width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }

  /* ── hero ──────────────────────────────────────────────────── */
  .sd-hero{ display: grid; grid-template-columns: 1fr; gap: 20px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.9)); border: 1px solid rgba(255, 255, 255, 1); backdrop-filter: blur(20px); border-radius: 28px; padding: 28px; position: relative; overflow: hidden; margin-bottom: 20px; box-shadow: 0 10px 40px -10px rgba(30, 41, 59, 0.08); }
  .sd-hero::before{ content:''; position: absolute; width: 350px; height: 350px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.1), transparent 70%); top: -150px; right: -100px; pointer-events: none; }
  .sd-hero::after{ content:''; position: absolute; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 70, 239, 0.08), transparent 70%); bottom: -120px; left: -80px; pointer-events: none; }
  .sd-hero-top{ display: flex; align-items: center; gap: 18px; position: relative; z-index: 1; flex-wrap: wrap; }
  .sd-hero-name{ font-size: clamp(1.35rem, 3.8vw, 1.85rem); font-weight: 900; color: #1e293b; margin: 0; line-height: 1.2; letter-spacing: -0.02em; }
  .sd-hero-sub{ color: #64748b; font-size: 13px; font-weight: 600; margin-top: 4px; }
  .sd-badge{ display: inline-flex; align-items: center; gap: 6px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; backdrop-filter: blur(8px); }

  .sd-ring-row{ display: flex; align-items: center; gap: 24px; position: relative; z-index: 1; flex-wrap: wrap; }
  .sd-ring{ width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: conic-gradient(#818cf8 var(--pct), rgba(0, 0, 0, 0.05) 0); box-shadow: 0 0 25px rgba(129, 140, 248, 0.1); }
  .sd-ring-inner{ width: 82px; height: 82px; border-radius: 50%; background: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(0, 0, 0, 0.02); box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); }
  .sd-ring-val{ font-size: 1.25rem; font-weight: 900; color: #1e293b; line-height: 1; }
  .sd-ring-label{ font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.05em; }
  .sd-ring-meta{ color: #64748b; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .sd-ring-meta b{ color: #1e293b; font-size: 15px; font-weight: 800; }

  /* ── stat chip strip ──────────────────────────────────────── */
  .sd-chip-strip{ display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 20px; scrollbar-width: none; }
  .sd-chip-strip::-webkit-scrollbar{ display: none; }
  @media (min-width: 761px){ .sd-chip-strip{ display: grid; grid-template-columns: repeat(5, 1fr); overflow: visible; } }
  .sd-chip{ flex: 0 0 auto; width: 130px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 1); backdrop-filter: blur(16px); border-radius: 20px; padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: all .2s ease; box-shadow: 0 10px 30px -10px rgba(30,41,59,0.06); }
  .sd-chip:hover { transform: translateY(-2px); border-color: rgba(99, 102, 241, 0.3); background: rgba(255, 255, 255, 0.9); box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.15); }
  @media (min-width: 761px){ .sd-chip{ width: auto; } }
  .sd-chip-icon{ width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .sd-chip-val{ font-size: 1.25rem; font-weight: 900; color: #1e293b; line-height: 1; letter-spacing: -0.02em; }
  .sd-chip-lbl{ font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }

  /* ── section title ────────────────────────────────────────── */
  .sd-section-title{ display: flex; align-items: center; justify-content: space-between; margin: 26px 0 12px; }
  .sd-section-title h2{ font-size: 13.5px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 8px; margin: 0; }
  .sd-count-badge{ background: #ef4444; color: #fff; border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 800; box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }

  /* ── quick tiles ───────────────────────────────────────────── */
  .sd-tiles{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (min-width: 641px) and (max-width: 1024px){ .sd-tiles{ grid-template-columns: repeat(4, 1fr); } }
  @media (min-width: 1025px){ .sd-tiles{ grid-template-columns: repeat(4, 1fr); } }
  .sd-tile{ border: 1px solid rgba(255, 255, 255, 1); border-radius: 20px; padding: 18px 16px; cursor: pointer; text-align: left; color: #1e293b; display: flex; flex-direction: column; gap: 24px; transition: all .25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 30px -10px rgba(30, 41, 59, 0.06); position: relative; overflow: hidden; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(16px); }
  .sd-tile::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%); opacity: 0; transition: opacity .25s ease; }
  @media (hover:hover){ .sd-tile:hover{ transform: translateY(-4px); box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.3); background: rgba(255,255,255,0.9); } .sd-tile:hover::before { opacity: 1; } }
  .sd-tile-label{ font-weight: 800; font-size: 14px; line-height: 1.2; letter-spacing: -0.01em; }
  .sd-tile-sub{ font-size: 11.5px; opacity: 0.75; font-weight: 600; margin-top: 3px; color: #64748b; }

  /* ── layout split ─────────────────────────────────────────── */
  .sd-split{ display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
  @media (min-width: 1100px){ .sd-split{ grid-template-columns: minmax(0, 1fr) 350px; gap: 24px; } }

  /* ── homework list rows ───────────────────────────────────── */
  .sd-hw-list{ display: flex; flex-direction: column; gap: 10px; }
  .sd-hw-row{ background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 1); backdrop-filter: blur(16px); border-radius: 20px; padding: 16px; display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; transition: all .2s ease; box-shadow: 0 4px 15px rgba(30,41,59,0.03); }
  .sd-hw-row:hover { background: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 25px rgba(30,41,59,0.06); }
  @media (max-width: 520px){ .sd-hw-row{ grid-template-columns: auto 1fr; } .sd-hw-action{ grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 12px; margin-top: 4px; } }
  .sd-hw-icon{ width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
  .sd-hw-title{ font-weight: 800; font-size: 14px; color: #1e293b; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sd-hw-meta{ display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 11.5px; color: #64748b; font-weight: 600; }
  .sd-hw-action{ display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  @media (max-width: 520px) { .sd-hw-action { flex-direction: row; } }
  .sd-hw-btn{ border: none; border-radius: 12px; padding: 9px 16px; color: #fff; font-weight: 800; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all .2s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  .sd-hw-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }

  /* ── empty state ──────────────────────────────────────────── */
  .sd-empty{ background: rgba(255, 255, 255, 0.4); border: 1px dashed rgba(0, 0, 0, 0.1); border-radius: 20px; padding: 40px 20px; text-align: center; backdrop-filter: blur(12px); color: #64748b; }

  /* ── completed exam rows ────────────────────────────────    */
  .sd-exam-list{ background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 1); backdrop-filter: blur(16px); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px -10px rgba(30,41,59,0.06); }
  .sd-exam-row{ display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; transition: background .15s ease; color: #1e293b; }
  .sd-exam-row:hover { background: rgba(255, 255, 255, 0.9); }
  .sd-exam-row:last-child{ border-bottom: none; }

  /* ── side cards ───────────────────────────────────────────── */
  .sd-side{ display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 641px) and (max-width: 1099px){ .sd-side{ grid-template-columns: 1fr 1fr; } }
  .sd-card{ background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 1); backdrop-filter: blur(16px); border-radius: 22px; padding: 20px; box-shadow: 0 10px 30px -10px rgba(30,41,59,0.08); }
  .sd-goal-mini{ border-radius: 14px; padding: 13px; display: flex; flex-direction: column; gap: 8px; transition: all .2s ease; background: #f8fafc; border: 1px solid rgba(0,0,0,0.04); }

  .sd-motiv{ background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05)); border: 1px solid rgba(245, 158, 11, 0.2); backdrop-filter: blur(16px); border-radius: 22px; padding: 20px; color: #9a3412; box-shadow: 0 10px 30px -10px rgba(245,158,11,0.1); }
  .sd-streak-grid{ display: flex; gap: 6px; margin-top: 14px; }

  .sd-coach-card{ border-radius: 24px; padding: 20px 22px; margin-bottom: 16px; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); box-shadow: 0 15px 40px -10px rgba(30,41,59,0.1); border: 1px solid #fff; }

  .sd-modal-overlay{ position: fixed; inset: 0; background: rgba(248, 250, 252, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
  .sd-modal{ background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 26px; padding: 26px; width: 100%; max-width: 460px; box-shadow: 0 25px 50px -12px rgba(30, 41, 59, 0.2); }
  .sd-input{ padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(0, 0, 0, 0.1); background: #f8fafc; font-size: 14px; width: 100%; box-sizing: border-box; outline: none; font-family: inherit; color: #1e293b; transition: all .2s ease; }
  .sd-input:focus { border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
  select.sd-input option { background: #ffffff; color: #1e293b; }
\`;
`;

// Inject this into StudentDashboard and MyCoachingPage
function injectDashCss(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const DASH_CSS = `[\s\S]*?`;/, dashCssIce.trim());
  
  // Replace inline white text with dark text where appropriate
  if(file.includes('MyCoachingPage') || file.includes('StudentDashboard')) {
    // text colors
    content = content.replace(/color:\s*'#fff'/g, "color: '#1e293b'");
    content = content.replace(/color:\s*'#f1f5f9'/g, "color: '#1e293b'");
    content = content.replace(/color:\s*'#94a3b8'/g, "color: '#64748b'");
    // Backgrounds for internal components
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "rgba(255,255,255,0.7)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.04\)/g, "rgba(255,255,255,0.8)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, "rgba(255,255,255,0.9)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, "rgba(0,0,0,0.06)"); // internal progress bar backgrounds etc.
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.07\)/g, "rgba(255,255,255,1)"); // borders
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, "rgba(255,255,255,1)"); // borders
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, "rgba(0,0,0,0.05)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.12\)/g, "rgba(0,0,0,0.08)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.15\)/g, "rgba(0,0,0,0.1)");
    content = content.replace(/rgba\(0,\s*0,\s*0,\s*0\.3\)/g, "rgba(30,41,59,0.06)"); // shadow softening
  }
  
  fs.writeFileSync(file, content, 'utf8');
}

injectDashCss('src/pages/StudentDashboard.jsx');
injectDashCss('src/pages/MyCoachingPage.jsx');
console.log('Injected Ice Theme DASH_CSS and inline replacements.');

// Fix App.css sidebar
let appCss = fs.readFileSync('src/App.css', 'utf8');
appCss = appCss.replace(/background:\s*#1e293b;/g, 'background: rgba(255,255,255,0.8);');
appCss = appCss.replace(/color:\s*#fff;/g, 'color: #1e293b;');
appCss = appCss.replace(/color:\s*#94a3b8;/g, 'color: #64748b;');
appCss = appCss.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'rgba(0,0,0,0.05)');
fs.writeFileSync('src/App.css', appCss, 'utf8');
console.log('App.css updated to Ice theme.');

