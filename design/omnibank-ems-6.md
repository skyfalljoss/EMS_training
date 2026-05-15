
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OmniBank — Employee Management</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --primary:#003A72;
  --primary-light:#1a5a9e;
  --primary-glow:rgba(0,58,114,.18);
  --arc:#DB230B;
  --arc-glow:rgba(219,35,11,.15);
  
  /* Lighter Base Canvas */
  --bg-color: #f7f9fc;
  --bg-blob-mix: multiply;
  
  /* Light Mode Foreground */
  --fg:#1a1a2e;
  --fg-muted:rgba(26,26,46,.7);
  --fg-dim:rgba(26,26,46,.45);
  --border-subtle:rgba(0,0,0,.06);
  
  /* Light Mode Hyper Glass */
  --glass-base-opacity: 0.15;
  --glass-highlight: rgba(255, 255, 255, 0.7);
  --glass-bg: linear-gradient(135deg, var(--glass-highlight) 0%, rgba(255, 255, 255, var(--glass-base-opacity)) 25%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.2) 100%);
  
  --glass-border-top: rgba(255,255,255,0.9);
  --glass-border-left: rgba(255,255,255,0.7);
  --glass-border-right: rgba(255,255,255,0.2);
  --glass-border-bottom: rgba(255,255,255,0.1);
  
  --glass-thickness: inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.05);
  --glass-shadow: 0 16px 40px rgba(0, 30, 60, 0.1), 0 4px 12px rgba(0, 0, 0, 0.03);
  --glass-shadow-hover: 0 24px 54px rgba(0, 30, 60, 0.15), 0 8px 24px rgba(0, 0, 0, 0.05);
  
  --glass-blur: 40px;
  --glass-saturation: 140%;
  --glass-radius: 24px;
  
  --sidebar-w:260px;
  --topbar-h:72px;
  --font-display:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif;
  --font-body:-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace;
  --success:#16a34a;
  --warn:#d97706;
  --danger:#dc2626;
  --scrollbar-w:6px;
}

/* Dark Mode Overrides */
[data-theme="dark"] {
  --bg-color: #080c14;
  --bg-blob-mix: normal;
  
  --primary-glow: rgba(0,136,255,.25);
  --arc-glow: rgba(219,35,11,.25);

  --fg: #ffffff;
  --fg-muted: rgba(255,255,255,0.7);
  --fg-dim: rgba(255,255,255,0.45);
  --border-subtle: rgba(255,255,255,0.08);
  
  --glass-base-opacity: 0.05;
  --glass-highlight: rgba(255, 255, 255, 0.15);
  --glass-bg: linear-gradient(135deg, var(--glass-highlight) 0%, rgba(255, 255, 255, var(--glass-base-opacity)) 25%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.03) 100%);
  
  --glass-border-top: rgba(255,255,255,0.3);
  --glass-border-left: rgba(255,255,255,0.15);
  --glass-border-right: rgba(255,255,255,0.05);
  --glass-border-bottom: rgba(255,255,255,0.02);
  
  --glass-thickness: inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.6);
  --glass-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2);
  --glass-shadow-hover: 0 24px 54px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3);
  
  --glass-saturation: 120%;
}

html,body{height:100%;overflow:hidden}
body{font-family:var(--font-body);color:var(--fg);background:var(--bg-color);-webkit-font-smoothing:antialiased;transition:background-color 0.4s ease, color 0.4s ease;}

/* Vibrant Mesh Gradient Background */
.bg-canvas{position:fixed;inset:0;z-index:0;overflow:hidden;background:var(--bg-color);transition:background-color 0.4s ease;}
.bg-blob{position:absolute;border-radius:50%;filter:blur(90px);animation:float 28s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;mix-blend-mode:var(--bg-blob-mix);transition:opacity 0.4s ease;}
.bg-blob.b1{width:65vw;height:65vh;background:#003A72;top:-10vh;left:-10vw;animation-delay:0s;opacity:0.25}
.bg-blob.b2{width:55vw;height:55vh;background:#DB230B;bottom:-5vh;right:-5vw;animation-delay:-5s;opacity:0.18}
.bg-blob.b3{width:50vw;height:50vh;background:#0088ff;bottom:10vh;left:20vw;animation-delay:-12s;opacity:0.22}
.bg-blob.b4{width:60vw;height:60vh;background:#ffaa00;top:5vh;right:15vw;animation-delay:-19s;opacity:0.12}

[data-theme="dark"] .bg-blob.b1 { opacity: 0.35; background: #0056a8; }
[data-theme="dark"] .bg-blob.b2 { opacity: 0.25; background: #ff3311; }
[data-theme="dark"] .bg-blob.b3 { opacity: 0.28; }
[data-theme="dark"] .bg-blob.b4 { opacity: 0.15; }

@keyframes float{
  0%{transform:translate(0,0) scale(1) rotate(0deg)}
  33%{transform:translate(8vw,8vh) scale(1.1) rotate(10deg)}
  66%{transform:translate(-5vw,15vh) scale(0.9) rotate(-5deg)}
  100%{transform:translate(-12vw,-8vh) scale(1.05) rotate(15deg)}
}

/* Hyper Glass Surface Engine */
.glass-surface {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  border-top: 1px solid var(--glass-border-top);
  border-left: 1px solid var(--glass-border-left);
  border-right: 1px solid var(--glass-border-right);
  border-bottom: 1px solid var(--glass-border-bottom);
  box-shadow: var(--glass-shadow), var(--glass-thickness);
}

.glass-card{
  border-radius:var(--glass-radius);
  transition:transform .4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .4s cubic-bezier(0.16, 1, 0.3, 1), background .4s;
  position:relative;
}
.glass-card:hover{
  transform:translateY(-4px) scale(1.01);
  box-shadow:var(--glass-shadow-hover), var(--glass-thickness);
}

.glass-panel{
  border-radius:var(--glass-radius);
}

/* Specific component glass */
.glass-inset{
  background:rgba(255,255,255,.2);
  box-shadow:inset 0 2px 10px rgba(0,0,0,.06), 0 1px 0 var(--glass-border-top);
  border-radius: 16px;
  border: 1px solid var(--glass-border-left);
}
[data-theme="dark"] .glass-inset {
  background:rgba(0,0,0,.3);
  box-shadow:inset 0 2px 10px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,0.1);
}

.app{position:relative;z-index:1;display:flex;height:100vh}
.sidebar{width:var(--sidebar-w);height:100vh;display:flex;flex-direction:column;padding:24px 16px;flex-shrink:0;z-index:10;border-right:1px solid var(--glass-border-left)}
.logo{display:flex;align-items:center;gap:12px;padding:4px 14px 24px;font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:-.01em;border-bottom:1px solid var(--border-subtle);margin-bottom:16px;color:var(--fg)}
.logo-icon{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--arc));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;box-shadow:0 6px 16px var(--primary-glow), inset 0 2px 2px rgba(255,255,255,0.5)}
.arc-divider{display:inline-block;width:4px;height:24px;background:var(--arc);border-radius:2px;margin:0 6px;vertical-align:middle;box-shadow:0 2px 12px var(--arc-glow)}

.nav{display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto;padding-right:4px}
.nav::-webkit-scrollbar{width:var(--scrollbar-w)}
.nav::-webkit-scrollbar-thumb{background:var(--border-subtle);border-radius:3px}
.nav-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;font-size:14px;font-weight:600;color:var(--fg-muted);cursor:pointer;transition:all .2s;border:1px solid transparent;background:transparent;width:100%;text-align:left;font-family:var(--font-body)}
.nav-item:hover{background:var(--glass-highlight);color:var(--fg);border-top-color:var(--glass-border-top);border-left-color:var(--glass-border-left);box-shadow:0 4px 12px rgba(0,0,0,.02)}
.nav-item.active{background:rgba(255,255,255,.7);color:var(--primary);border-top-color:rgba(255,255,255,1);border-left-color:rgba(255,255,255,0.8);box-shadow:0 6px 16px rgba(0,0,0,.04), inset 0 1px 2px #fff}

[data-theme="dark"] .nav-item.active{background:rgba(255,255,255,.1);color:#fff;border-top-color:rgba(255,255,255,.3);border-left-color:rgba(255,255,255,.15);box-shadow:0 6px 16px rgba(0,0,0,.2), inset 0 1px 1px rgba(255,255,255,.2)}

.nav-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.nav-badge{margin-left:auto;background:var(--danger);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;font-family:var(--font-mono);box-shadow:0 4px 12px rgba(220,38,38,.3), inset 0 1px 1px rgba(255,255,255,0.5)}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{height:var(--topbar-h);display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0;z-index:9;border-radius:0 0 0 24px;margin-bottom:12px;border-top:none;border-right:none;}
.topbar-left{display:flex;align-items:center;gap:12px}
.screen-title{font-family:var(--font-display);font-size:20px;font-weight:800;letter-spacing:-.01em;color:var(--fg)}
.screen-breadcrumb{font-size:13px;color:var(--fg-dim);font-weight:600}
.screen-breadcrumb span{color:var(--fg-muted)}
.topbar-right{display:flex;align-items:center;gap:16px}
.search-box{display:flex;align-items:center;gap:8px;background:var(--glass-highlight);border:1px solid var(--glass-border-left);border-radius:14px;padding:10px 18px;min-width:260px;transition:all .3s;box-shadow:inset 0 2px 6px rgba(0,0,0,.03), 0 4px 12px rgba(0,0,0,.03)}
.search-box:focus-within{border-color:var(--primary);background:var(--glass-border-top);box-shadow:0 0 0 4px var(--primary-glow), inset 0 2px 4px rgba(0,0,0,.02)}
[data-theme="dark"] .search-box:focus-within{background:rgba(0,0,0,.2);}
.search-box input{background:none;border:none;outline:none;font-family:var(--font-body);font-size:14px;color:var(--fg);width:100%;font-weight:600}
.search-box input::placeholder{color:var(--fg-dim);font-weight:500}
.search-icon{color:var(--fg-dim);font-size:15px;font-weight:700}

.theme-btn{width:40px;height:40px;border-radius:12px;background:var(--glass-highlight);border:1px solid var(--glass-border-left);color:var(--fg);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,.03)}
.theme-btn:hover{transform:translateY(-2px);background:var(--glass-border-top);box-shadow:0 6px 16px rgba(0,0,0,.05)}

.avatar-btn{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-light));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;font-family:var(--font-body);transition:transform .3s, box-shadow .3s;box-shadow:0 6px 16px var(--primary-glow), inset 0 2px 2px rgba(255,255,255,0.5)}
.avatar-btn:hover{transform:scale(1.08);box-shadow:0 8px 20px var(--primary-glow), inset 0 2px 2px rgba(255,255,255,0.7)}

.content{flex:1;overflow-y:auto;padding:20px 32px 40px;scroll-behavior:smooth}
.content::-webkit-scrollbar{width:var(--scrollbar-w)}
.content::-webkit-scrollbar-thumb{background:var(--border-subtle);border-radius:3px}
.screen{display:none;animation:fadeIn .5s cubic-bezier(0.16, 1, 0.3, 1)}
.screen.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}

/* Dashboard Layouts */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:32px}
.kpi-card{padding:26px}
.kpi-label{font-size:13px;color:var(--fg-muted);margin-bottom:8px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}
.kpi-value{font-family:var(--font-display);font-size:36px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;color:var(--primary)}
[data-theme="dark"] .kpi-value{color:#fff;}
.kpi-change{font-size:13px;display:flex;align-items:center;gap:6px;font-weight:600}
.kpi-change.up{color:var(--success)}
.kpi-change.down{color:var(--danger)}
.kpi-card .kpi-icon{float:right;font-size:28px;opacity:.15;color:var(--primary)}
[data-theme="dark"] .kpi-card .kpi-icon{color:#fff;opacity:0.2;}

.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.section-title{font-family:var(--font-display);font-size:18px;font-weight:800;letter-spacing:-.01em;color:var(--fg)}
.section-link{font-size:14px;color:var(--primary);cursor:pointer;transition:all .2s;font-weight:700;background:var(--glass-highlight);padding:6px 14px;border-radius:20px;border:1px solid var(--glass-border-left);box-shadow:0 2px 8px rgba(0,0,0,.03)}
.section-link:hover{color:var(--arc);background:var(--glass-border-top);transform:translateY(-1px)}
[data-theme="dark"] .section-link{color:#fff;}

.panel{padding:28px}
.panel-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.dashboard-layout{display:grid;grid-template-columns:1fr 380px;gap:24px}

/* Tables & Lists */
table{width:100%;border-collapse:separate;border-spacing:0;font-size:14px}
thead th{text-align:left;padding:14px 18px;font-weight:700;color:var(--fg-muted);font-size:12px;letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--border-subtle)}
tbody td{padding:16px 18px;border-bottom:1px solid var(--border-subtle);color:var(--fg);font-weight:600}
tbody tr{transition:background .2s;cursor:pointer}
tbody tr:hover{background:var(--glass-highlight)}
tbody tr:last-child td{border-bottom:none}

.status{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,.04)}
.status.active{background:rgba(22,163,74,.15);color:var(--success);border:1px solid rgba(22,163,74,.25)}
.status.on-leave{background:rgba(217,119,6,.15);color:var(--warn);border:1px solid rgba(217,119,6,.25)}
.status.terminated{background:rgba(220,38,38,.15);color:var(--danger);border:1px solid rgba(220,38,38,.25)}
.status.remote{background:rgba(0,58,114,.12);color:var(--primary);border:1px solid rgba(0,58,114,.25)}
[data-theme="dark"] .status.remote{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2);}
[data-theme="dark"] .status { box-shadow:none; }

.status-dot{width:6px;height:6px;border-radius:50%;display:inline-block;box-shadow:0 0 8px currentColor}
.status.active .status-dot{background:var(--success)}
.status.on-leave .status-dot{background:var(--warn)}
.status.terminated .status-dot{background:var(--danger)}
.status.remote .status-dot{background:currentColor}

.activity-item{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--border-subtle)}
.activity-item:last-child{border-bottom:none;padding-bottom:0}
.activity-dot{width:12px;height:12px;border-radius:50%;margin-top:4px;flex-shrink:0;box-shadow:0 0 10px currentColor, inset 0 2px 2px rgba(255,255,255,0.5)}
.activity-dot.primary{background:var(--primary);color:var(--primary)}
[data-theme="dark"] .activity-dot.primary{background:#0088ff;color:#0088ff}
.activity-dot.green{background:var(--success);color:var(--success)}
.activity-dot.arc{background:var(--arc);color:var(--arc)}
.activity-text{font-size:14px;line-height:1.5;font-weight:600}
.activity-time{font-size:12px;color:var(--fg-dim);margin-top:6px;font-weight:600}

.chart-bars{display:flex;align-items:flex-end;gap:10px;height:180px;padding:10px 0}
.chart-bar{flex:1;border-radius:8px 8px 0 0;background:linear-gradient(to top,var(--primary),var(--primary-light));min-height:8px;transition:height .8s cubic-bezier(0.16, 1, 0.3, 1);position:relative;opacity:.9;box-shadow:inset 1px 1px 1px rgba(255,255,255,0.4), 0 -4px 12px var(--primary-glow)}
.chart-bar:hover{opacity:1;transform:scaleY(1.03);transform-origin:bottom}
.chart-bar-label{position:absolute;bottom:-26px;left:50%;transform:translateX(-50%);font-size:12px;color:var(--fg-dim);white-space:nowrap;font-weight:700}
[data-theme="dark"] .chart-bar{background:linear-gradient(to top,#0056a8,#0088ff);box-shadow:inset 1px 1px 1px rgba(255,255,255,0.2), 0 -4px 16px rgba(0,136,255,0.3)}

/* Filters & Tabs */
.directory-filters{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
.filter-chip{padding:8px 20px;border-radius:24px;font-size:13px;font-weight:700;background:var(--glass-highlight);border:1px solid var(--glass-border-left);color:var(--fg-muted);cursor:pointer;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);font-family:var(--font-body);box-shadow:0 4px 12px rgba(0,0,0,.03), inset 0 2px 2px rgba(255,255,255,0.6)}
.filter-chip:hover{background:var(--glass-border-top);color:var(--fg);transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.06), inset 0 2px 2px rgba(255,255,255,1)}
.filter-chip.active{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 8px 20px var(--primary-glow), inset 0 2px 2px rgba(255,255,255,0.4)}
[data-theme="dark"] .filter-chip.active{background:#fff;border-color:#fff;color:#000;box-shadow:0 4px 16px rgba(255,255,255,0.3)}
.filter-chip.add{margin-left:auto;border-color:var(--arc);background:var(--arc);color:#fff;box-shadow:0 8px 20px var(--arc-glow), inset 0 2px 2px rgba(255,255,255,0.4)}
.filter-chip.add:hover{background:#ed321a}

/* Profile */
.profile-header{display:flex;gap:32px;align-items:flex-start;margin-bottom:32px;padding:32px;border-radius:var(--glass-radius)}
.profile-avatar{width:100px;height:100px;border-radius:28px;background:linear-gradient(135deg,var(--primary),var(--arc));display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 12px 32px var(--primary-glow), inset 0 2px 4px rgba(255,255,255,0.5)}
.profile-info{flex:1}
.profile-name{font-family:var(--font-display);font-size:32px;font-weight:800;letter-spacing:-.02em;color:var(--primary)}
[data-theme="dark"] .profile-name{color:#fff}
.profile-role{font-size:18px;color:var(--fg-muted);margin-top:6px;font-weight:600}
.profile-meta{display:flex;gap:28px;margin-top:16px;font-size:14px;color:var(--fg-dim);flex-wrap:wrap;font-weight:600}
.profile-tabs{display:flex;gap:12px;margin-bottom:32px;border-bottom:1px solid var(--border-subtle);padding-bottom:0}
.profile-tab{padding:12px 24px;font-size:15px;font-weight:700;color:var(--fg-muted);cursor:pointer;border:none;background:transparent;font-family:var(--font-body);border-bottom:3px solid transparent;margin-bottom:-1px;transition:all .2s}
.profile-tab:hover{color:var(--fg)}
.profile-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
[data-theme="dark"] .profile-tab.active{color:#fff;border-bottom-color:#fff}

/* Depts & Leave */
.dept-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.dept-card{padding:28px}
.dept-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;margin-bottom:20px;background:var(--glass-border-top);color:var(--primary);box-shadow:0 6px 16px rgba(0,0,0,.06), inset 0 2px 2px #fff}
[data-theme="dark"] .dept-icon{background:rgba(255,255,255,0.1);color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,0.2)}
.dept-name{font-size:18px;font-weight:800;letter-spacing:-.01em;color:var(--fg)}
.dept-count{font-size:14px;color:var(--fg-muted);margin-top:6px;font-weight:600}
.dept-budget{font-size:13px;color:var(--fg-dim);font-family:var(--font-mono);margin-top:12px;font-weight:700}

.leave-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.balance-card{text-align:center;padding:24px;padding-top:32px;}
.balance-num{font-family:var(--font-display);font-size:42px;font-weight:800;letter-spacing:-.03em}
.balance-label{font-size:14px;color:var(--fg-muted);margin-top:8px;font-weight:700}
.balance-bar{height:8px;border-radius:4px;background:var(--border-subtle);margin-top:20px;overflow:hidden;box-shadow:inset 0 2px 4px rgba(0,0,0,.05)}
.balance-bar-fill{height:100%;border-radius:4px;background:var(--primary);transition:width .8s cubic-bezier(0.16, 1, 0.3, 1)}
[data-theme="dark"] .balance-bar-fill{background:#0088ff}

.approval-item{display:flex;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--border-subtle)}
.approval-name{font-size:15px;font-weight:700;color:var(--fg)}
.approval-reason{font-size:13px;color:var(--fg-dim);margin-top:4px;font-weight:600}
.approval-btn{width:36px;height:36px;border-radius:12px;border:none;font-size:15px;font-weight:800;cursor:pointer;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 2px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,.05)}
[data-theme="dark"] .approval-btn{box-shadow:none;}
.approval-btn.approve{background:rgba(22,163,74,.2);color:var(--success);border:1px solid rgba(22,163,74,.3)}
.approval-btn.approve:hover{background:var(--success);color:#fff;transform:scale(1.1);box-shadow:0 8px 20px rgba(22,163,74,.4), inset 0 2px 2px rgba(255,255,255,0.4)}
.approval-btn.deny{background:rgba(220,38,38,.15);color:var(--danger);border:1px solid rgba(220,38,38,.25)}
.approval-btn.deny:hover{background:var(--danger);color:#fff;transform:scale(1.1);box-shadow:0 8px 20px rgba(220,38,38,.4), inset 0 2px 2px rgba(255,255,255,0.4)}

/* Payroll */
.payroll-run{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-radius:16px;margin-bottom:16px;transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);cursor:pointer;border:1px solid var(--glass-border-left);box-shadow:inset 0 1px 1px var(--glass-border-top), 0 4px 12px rgba(0,0,0,.03)}
.payroll-run:hover{transform:translateY(-3px);background:var(--glass-highlight);box-shadow:inset 0 1px 1px var(--glass-border-top), 0 8px 24px rgba(0,0,0,.06)}
[data-theme="dark"] .payroll-run:hover{background:rgba(255,255,255,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
.payroll-run-date{font-size:15px;font-weight:700;color:var(--fg)}
.payroll-run-amount{font-family:var(--font-mono);font-size:15px;font-weight:700}

/* Tweaks Panel */
.tweak-fab{position:fixed;bottom:32px;right:32px;z-index:100;width:56px;height:56px;border-radius:50%;color:var(--primary);font-size:24px;cursor:pointer;transition:all .4s cubic-bezier(0.16, 1, 0.3, 1);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 32px rgba(0,58,114,.2), inset 0 2px 4px rgba(255,255,255,0.8)}
[data-theme="dark"] .tweak-fab{color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)}
.tweak-fab:hover{transform:scale(1.1) rotate(15deg)}
.tweaks-panel{position:fixed;bottom:100px;right:32px;z-index:100;width:320px;padding:28px;border-radius:28px;display:none;transform-origin:bottom right}
.tweaks-panel.open{display:block;animation:popIn .4s cubic-bezier(0.16, 1, 0.3, 1)}
@keyframes popIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
.tweaks-title{font-size:14px;font-weight:800;letter-spacing:.08em;color:var(--primary);margin-bottom:24px;text-transform:uppercase}
[data-theme="dark"] .tweaks-title{color:#fff;}
.tweak-group{margin-bottom:20px}
.tweak-label{font-size:14px;font-weight:700;color:var(--fg-muted);margin-bottom:10px;display:block}
.tweak-group input[type="range"]{width:100%;height:8px;-webkit-appearance:none;appearance:none;background:var(--border-subtle);border-radius:4px;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.08)}
.tweak-group input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--primary);cursor:pointer;box-shadow:0 4px 12px var(--primary-glow), inset 0 2px 2px rgba(255,255,255,0.6)}
[data-theme="dark"] .tweak-group input[type="range"]::-webkit-slider-thumb{background:#fff;box-shadow:0 0 12px rgba(255,255,255,0.5)}
.tweak-group input[type="color"]{width:100%;height:40px;border:none;border-radius:10px;cursor:pointer;background:none;padding:0;box-shadow:0 4px 12px rgba(0,0,0,.06)}

@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.dept-grid{grid-template-columns:repeat(2,1fr)}.dashboard-layout{grid-template-columns:1fr}.leave-grid{grid-template-columns:1fr}.panel-row{grid-template-columns:1fr}.panel-row.three{grid-template-columns:1fr}}
@media(max-width:768px){.sidebar{display:none}.kpi-grid{grid-template-columns:1fr}.dept-grid{grid-template-columns:1fr}.content{padding:20px}.topbar{padding:0 20px;border-radius:0 0 16px 16px}.search-box{min-width:160px}}
</style>
</head>
<body>
<div class="bg-canvas">
  <div class="bg-blob b1"></div>
  <div class="bg-blob b2"></div>
  <div class="bg-blob b3"></div>
  <div class="bg-blob b4"></div>
</div>
<div class="app">
<aside class="sidebar glass-surface" id="sidebar">
  <div class="logo"><div class="logo-icon">O</div>OmniBank<span class="arc-divider"></span></div>
  <nav class="nav">
    <button class="nav-item active" data-screen="dashboard"><span class="nav-icon">◉</span> Dashboard</button>
    <button class="nav-item" data-screen="directory"><span class="nav-icon">◎</span> Employees</button>
    <button class="nav-item" data-screen="profile"><span class="nav-icon">◐</span> Profile<span class="nav-badge">1</span></button>
    <button class="nav-item" data-screen="departments"><span class="nav-icon">▣</span> Departments</button>
    <button class="nav-item" data-screen="leave"><span class="nav-icon">◷</span> Leave<span class="nav-badge" style="background:var(--warn)">3</span></button>
    <button class="nav-item" data-screen="payroll"><span class="nav-icon">₿</span> Payroll</button>
  </nav>
</aside>
<div class="main">
  <header class="topbar glass-surface">
    <div class="topbar-left"><div><div class="screen-title" id="screenTitle">Dashboard</div><div class="screen-breadcrumb">OmniBank <span>/</span> <span id="screenBreadcrumb">Overview</span></div></div></div>
    <div class="topbar-right">
      <div class="search-box"><span class="search-icon">⌕</span><input type="text" placeholder="Search employees, departments…"></div>
      <button class="theme-btn" id="themeToggle" onclick="toggleTheme()" title="Toggle Dark Mode">◑</button>
      <button class="avatar-btn" title="HR Admin">HR</button>
    </div>
  </header>
  <div class="content" id="content">
    
    <!-- Dashboard -->
    <div class="screen active" id="screen-dashboard">
      <div class="kpi-grid">
        <div class="kpi-card glass-card glass-surface"><div class="kpi-icon">◉</div><div class="kpi-label">Total Employees</div><div class="kpi-value">248</div><div class="kpi-change up">↑ 12 this quarter</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-icon">●</div><div class="kpi-label">Active</div><div class="kpi-value">231</div><div class="kpi-change up">93% of workforce</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-icon">◷</div><div class="kpi-label">On Leave Today</div><div class="kpi-value">14</div><div class="kpi-change down">↑ 2 from last week</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-icon">▣</div><div class="kpi-label">Open Positions</div><div class="kpi-value">9</div><div class="kpi-change up">3 urgent</div></div>
      </div>
      <div class="dashboard-layout">
        <div>
          <div class="section-header"><div class="section-title">Department Headcount</div></div>
          <div class="panel glass-surface glass-panel">
            <div class="chart-bars">
              <div class="chart-bar" style="height:92%"><span class="chart-bar-label">Retail</span></div>
              <div class="chart-bar" style="height:78%"><span class="chart-bar-label">Corp</span></div>
              <div class="chart-bar" style="height:65%"><span class="chart-bar-label">IT</span></div>
              <div class="chart-bar" style="height:58%"><span class="chart-bar-label">Risk</span></div>
              <div class="chart-bar" style="height:45%"><span class="chart-bar-label">Ops</span></div>
              <div class="chart-bar" style="height:38%"><span class="chart-bar-label">HR</span></div>
              <div class="chart-bar" style="height:32%"><span class="chart-bar-label">Legal</span></div>
              <div class="chart-bar" style="height:22%"><span class="chart-bar-label">Mktg</span></div>
            </div>
          </div>
        </div>
        <div>
          <div class="section-header"><div class="section-title">Recent Activity</div><span class="section-link">View all</span></div>
          <div class="panel glass-surface glass-panel" style="padding:24px 28px">
            <div class="activity-item"><div class="activity-dot green"></div><div><div class="activity-text">Sarah Chen joined as VP of Risk</div><div class="activity-time">Today, 10:32 AM</div></div></div>
            <div class="activity-item"><div class="activity-dot primary"></div><div><div class="activity-text">Leave approved for James Okonkwo</div><div class="activity-time">Today, 9:15 AM</div></div></div>
            <div class="activity-item"><div class="activity-dot arc"></div><div><div class="activity-text">Payroll run #042 completed</div><div class="activity-time">Yesterday, 4:00 PM</div></div></div>
            <div class="activity-item"><div class="activity-dot green"></div><div><div class="activity-text">New hire orientation — 6 employees</div><div class="activity-time">Yesterday, 9:00 AM</div></div></div>
            <div class="activity-item" style="border-bottom:none;padding-bottom:0"><div class="activity-dot primary"></div><div><div class="activity-text">Department budget review for Q3</div><div class="activity-time">Mar 10, 2:30 PM</div></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Directory -->
    <div class="screen" id="screen-directory">
      <div class="section-header"><div class="section-title">Employee Directory</div></div>
      <div class="directory-filters">
        <button class="filter-chip active">All</button>
        <button class="filter-chip">Active</button>
        <button class="filter-chip">On Leave</button>
        <button class="filter-chip">Remote</button>
        <button class="filter-chip">Terminated</button>
        <button class="filter-chip add">+ Add Employee</button>
      </div>
      <div class="panel glass-surface glass-panel" style="padding:0; overflow:hidden">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Location</th><th>Status</th><th>Tenure</th></tr></thead>
            <tbody>
              <tr onclick="navigateTo('profile','Sarah Chen')"><td><strong>Sarah Chen</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">sarah.chen@omnibank.com</span></td><td>Risk</td><td>VP of Risk</td><td>New York</td><td><span class="status active"><span class="status-dot"></span>Active</span></td><td>3y 2m</td></tr>
              <tr onclick="navigateTo('profile','James Okonkwo')"><td><strong>James Okonkwo</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">j.okonkwo@omnibank.com</span></td><td>Corporate</td><td>Senior Analyst</td><td>London</td><td><span class="status on-leave"><span class="status-dot"></span>On Leave</span></td><td>5y 8m</td></tr>
              <tr onclick="navigateTo('profile','Maria Torres')"><td><strong>Maria Torres</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">m.torres@omnibank.com</span></td><td>Retail</td><td>Branch Manager</td><td>Miami</td><td><span class="status active"><span class="status-dot"></span>Active</span></td><td>7y 1m</td></tr>
              <tr onclick="navigateTo('profile','David Kim')"><td><strong>David Kim</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">d.kim@omnibank.com</span></td><td>IT</td><td>Security Engineer</td><td>San Francisco</td><td><span class="status remote"><span class="status-dot"></span>Remote</span></td><td>2y 9m</td></tr>
              <tr onclick="navigateTo('profile','Priya Sharma')"><td><strong>Priya Sharma</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">p.sharma@omnibank.com</span></td><td>Legal</td><td>General Counsel</td><td>Mumbai</td><td><span class="status active"><span class="status-dot"></span>Active</span></td><td>11y 4m</td></tr>
              <tr onclick="navigateTo('profile','Michael Okafor')"><td><strong>Michael Okafor</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">m.okafor@omnibank.com</span></td><td>Ops</td><td>Operations Lead</td><td>Lagos</td><td><span class="status active"><span class="status-dot"></span>Active</span></td><td>4y 5m</td></tr>
              <tr onclick="navigateTo('profile','Elena Vasquez')"><td><strong>Elena Vasquez</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">e.vasquez@omnibank.com</span></td><td>Marketing</td><td>Brand Director</td><td>Madrid</td><td><span class="status active"><span class="status-dot"></span>Active</span></td><td>6y 3m</td></tr>
              <tr onclick="navigateTo('profile','Tom Bradley')"><td><strong>Tom Bradley</strong><br><span style="font-size:13px;color:var(--fg-dim);font-weight:600">t.bradley@omnibank.com</span></td><td>Corporate</td><td>Investment Analyst</td><td>New York</td><td><span class="status terminated"><span class="status-dot"></span>Terminated</span></td><td>1y 11m</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Profile -->
    <div class="screen" id="screen-profile">
      <div class="section-header"><div class="section-title" id="profileNameTitle">Employee Profile</div></div>
      <div class="profile-header glass-surface glass-panel">
        <div class="profile-avatar" id="profileAvatar">SC</div>
        <div class="profile-info">
          <div class="profile-name" id="profileName">Sarah Chen</div>
          <div class="profile-role" id="profileRole">VP of Risk Management</div>
          <div class="profile-meta">
            <span id="profileDept">Risk Department</span>
            <span id="profileLocation">New York, NY</span>
            <span id="profileTenure">Joined Mar 2023</span>
            <span id="profileEmail">sarah.chen@omnibank.com</span>
          </div>
        </div>
      </div>
      <div class="profile-tabs">
        <button class="profile-tab active" data-tab="personal">Personal</button>
        <button class="profile-tab" data-tab="employment">Employment</button>
        <button class="profile-tab" data-tab="performance">Performance</button>
        <button class="profile-tab" data-tab="documents">Documents</button>
      </div>
      <div id="profileTabContent">
        <div class="tab-content active" id="tab-personal">
          <div class="panel-row">
            <div class="panel glass-surface glass-panel">
              <div style="font-size:13px;color:var(--fg-dim);letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;font-weight:800">Contact Details</div>
              <div style="display:grid;gap:16px;font-size:15px"><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Email</span><span style="font-weight:700">sarah.chen@omnibank.com</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Phone</span><span style="font-weight:700">+1 (212) 555-0198</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Address</span><span style="font-weight:700">200 Park Ave, New York, NY 10166</span></div></div>
            </div>
            <div class="panel glass-surface glass-panel">
              <div style="font-size:13px;color:var(--fg-dim);letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;font-weight:800">Emergency Contact</div>
              <div style="display:grid;gap:16px;font-size:15px"><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Contact Name</span><span style="font-weight:700">Michael Chen (spouse)</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Phone</span><span style="font-weight:700">+1 (212) 555-0742</span></div></div>
            </div>
          </div>
        </div>
        <div class="tab-content" id="tab-employment">
          <div class="panel glass-surface glass-panel">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;font-size:15px">
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Department</span><span style="font-weight:700">Risk</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Manager</span><span style="font-weight:700">Robert Huang, CRO</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Type</span><span style="font-weight:700">Full-time</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Start Date</span><span style="font-weight:700">Mar 15, 2023</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Tenure</span><span style="font-weight:700">3 years 2 months</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Location</span><span style="font-weight:700">HQ — New York</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Grade</span><span style="font-weight:700">SVP / Grade 15</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Work Pattern</span><span style="font-weight:700">Hybrid (3+2)</span></div>
              <div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Reports To</span><span style="font-weight:700">Board Risk Committee</span></div>
            </div>
          </div>
        </div>
        <div class="tab-content" id="tab-performance">
          <div class="panel glass-surface glass-panel"><div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;font-size:15px"><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Last Review</span><span style="font-weight:700">Q4 2025 — Exceeds Expectations</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Rating</span><span style="font-weight:700">4.7 / 5.0</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Goals Met</span><span style="font-weight:700">8 of 9 CY2025 objectives</span></div><div><span style="color:var(--fg-muted);font-size:14px;display:block;margin-bottom:4px;font-weight:600">Awards</span><span style="font-weight:700">Risk Manager of the Year 2024</span></div></div></div>
        </div>
        <div class="tab-content" id="tab-documents">
          <div class="panel glass-surface glass-panel" style="padding:16px 28px"><div style="display:grid;gap:6px;font-size:15px">
            <div style="display:flex;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:700">Employment Contract</span><span style="color:var(--fg-dim);font-size:14px;font-weight:600">PDF · 2.1 MB · Mar 2023</span></div>
            <div style="display:flex;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:700">NDA Agreement</span><span style="color:var(--fg-dim);font-size:14px;font-weight:600">PDF · 0.8 MB · Mar 2023</span></div>
            <div style="display:flex;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:700">Q4 2025 Performance Review</span><span style="color:var(--fg-dim);font-size:14px;font-weight:600">PDF · 0.4 MB · Jan 2026</span></div>
            <div style="display:flex;justify-content:space-between;padding:16px 0"><span style="font-weight:700">Benefits Enrollment 2026</span><span style="color:var(--fg-dim);font-size:14px;font-weight:600">PDF · 1.2 MB · Nov 2025</span></div>
          </div></div>
        </div>
      </div>
    </div>

    <!-- Departments -->
    <div class="screen" id="screen-departments">
      <div class="section-header"><div class="section-title">Departments</div><span class="section-link">+ Add Department</span></div>
      <div class="dept-grid">
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">RB</div><div class="dept-name">Retail Banking</div><div class="dept-count">72 employees</div><div class="dept-budget">Budget · $18.2M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">CB</div><div class="dept-name">Corporate Banking</div><div class="dept-count">58 employees</div><div class="dept-budget">Budget · $24.6M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">IT</div><div class="dept-name">Information Technology</div><div class="dept-count">45 employees</div><div class="dept-budget">Budget · $9.8M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">RK</div><div class="dept-name">Risk & Compliance</div><div class="dept-count">34 employees</div><div class="dept-budget">Budget · $7.2M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">OP</div><div class="dept-name">Operations</div><div class="dept-count">28 employees</div><div class="dept-budget">Budget · $5.1M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">HR</div><div class="dept-name">Human Resources</div><div class="dept-count">22 employees</div><div class="dept-budget">Budget · $3.8M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">LG</div><div class="dept-name">Legal</div><div class="dept-count">16 employees</div><div class="dept-budget">Budget · $6.4M</div></div>
        <div class="dept-card glass-card glass-surface"><div class="dept-icon">MK</div><div class="dept-name">Marketing</div><div class="dept-count">14 employees</div><div class="dept-budget">Budget · $4.2M</div></div>
      </div>
    </div>

    <!-- Leave -->
    <div class="screen" id="screen-leave">
      <div class="section-header"><div class="section-title">Leave Management</div><span class="section-link">View team calendar</span></div>
      <div class="leave-grid">
        <div class="panel glass-surface glass-panel">
          <div style="font-size:13px;color:var(--fg-dim);letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;font-weight:800">Your Balances</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="balance-card glass-inset"><div class="balance-num" style="color:var(--success)">18</div><div class="balance-label">Annual Leave</div><div class="balance-bar"><div class="balance-bar-fill" style="width:60%;background:var(--success)"></div></div></div>
            <div class="balance-card glass-inset"><div class="balance-num" style="color:var(--warn)">6</div><div class="balance-label">Sick Leave</div><div class="balance-bar"><div class="balance-bar-fill" style="width:30%;background:var(--warn)"></div></div></div>
            <div class="balance-card glass-inset"><div class="balance-num" style="color:var(--primary)">4</div><div class="balance-label">Personal Days</div><div class="balance-bar"><div class="balance-bar-fill" style="width:80%"></div></div></div>
            <div class="balance-card glass-inset"><div class="balance-num" style="color:var(--arc)">2</div><div class="balance-label">Volunteer Days</div><div class="balance-bar"><div class="balance-bar-fill" style="width:40%;background:var(--arc)"></div></div></div>
          </div>
        </div>
        <div class="panel glass-surface glass-panel">
          <div style="font-size:13px;color:var(--fg-dim);letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;font-weight:800">Pending Approvals</div>
          <div class="approval-item"><div class="approval-info"><div class="approval-name">James Okonkwo</div><div class="approval-reason">Annual Leave · Apr 14–18 · 5 days</div></div><div class="approval-actions"><button class="approval-btn approve">✓</button><button class="approval-btn deny">✕</button></div></div>
          <div class="approval-item"><div class="approval-info"><div class="approval-name">Aisha Diallo</div><div class="approval-reason">Sick Leave · Apr 7–9 · 3 days</div></div><div class="approval-actions"><button class="approval-btn approve">✓</button><button class="approval-btn deny">✕</button></div></div>
          <div class="approval-item" style="border:none;padding-bottom:0"><div class="approval-info"><div class="approval-name">Kimiko Tanaka</div><div class="approval-reason">Personal · Apr 20 · 1 day</div></div><div class="approval-actions"><button class="approval-btn approve">✓</button><button class="approval-btn deny">✕</button></div></div>
        </div>
      </div>
    </div>

    <!-- Payroll -->
    <div class="screen" id="screen-payroll">
      <div class="kpi-grid">
        <div class="kpi-card glass-card glass-surface"><div class="kpi-label">Monthly Payroll</div><div class="kpi-value">$1.24M</div><div class="kpi-change up">↑ 3.2% from last month</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-label">Average Salary</div><div class="kpi-value">$82,400</div><div class="kpi-change up">Market competitive</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-label">YTD Payroll</div><div class="kpi-value">$4.96M</div><div class="kpi-change up">On budget · 98%</div></div>
        <div class="kpi-card glass-card glass-surface"><div class="kpi-label">Pending Adjustments</div><div class="kpi-value">7</div><div class="kpi-change up">Awaiting approval</div></div>
      </div>
      <div class="section-header"><div class="section-title">Recent Payroll Runs</div><span class="section-link">Run Payroll</span></div>
      <div class="panel glass-surface glass-panel" style="padding:20px 28px">
        <div class="payroll-run"><div class="payroll-run-info"><div class="payroll-run-date">Mar 31, 2026</div><span style="font-size:13px;color:var(--fg-dim);font-weight:700">Run #042</span></div><div style="display:flex;align-items:center;gap:18px"><div class="payroll-run-amount">$1,241,832.00</div><span class="status active"><span class="status-dot"></span>Processed</span></div></div>
        <div class="payroll-run"><div class="payroll-run-info"><div class="payroll-run-date">Mar 17, 2026</div><span style="font-size:13px;color:var(--fg-dim);font-weight:700">Run #041</span></div><div style="display:flex;align-items:center;gap:18px"><div class="payroll-run-amount">$1,238,115.50</div><span class="status active"><span class="status-dot"></span>Processed</span></div></div>
        <div class="payroll-run"><div class="payroll-run-info"><div class="payroll-run-date">Mar 3, 2026</div><span style="font-size:13px;color:var(--fg-dim);font-weight:700">Run #040</span></div><div style="display:flex;align-items:center;gap:18px"><div class="payroll-run-amount">$1,229,400.00</div><span class="status active"><span class="status-dot"></span>Processed</span></div></div>
        <div class="payroll-run"><div class="payroll-run-info"><div class="payroll-run-date">Feb 28, 2026</div><span style="font-size:13px;color:var(--fg-dim);font-weight:700">Run #039</span></div><div style="display:flex;align-items:center;gap:18px"><div class="payroll-run-amount">$1,227,980.00</div><span class="status on-leave"><span class="status-dot"></span>Pending</span></div></div>
        <div class="payroll-run" style="margin-bottom:0"><div class="payroll-run-info"><div class="payroll-run-date">Feb 14, 2026</div><span style="font-size:13px;color:var(--fg-dim);font-weight:700">Run #038</span></div><div style="display:flex;align-items:center;gap:18px"><div class="payroll-run-amount">$1,225,300.00</div><span class="status active"><span class="status-dot"></span>Processed</span></div></div>
      </div>
    </div>
  </div>
</div>
</div>
<button class="tweak-fab glass-surface" id="tweakBtn" onclick="toggleTweaks()">✦</button>
<div class="tweaks-panel glass-surface" id="tweaksPanel">
  <div class="tweaks-title">Design Tweaks</div>
  <div class="tweak-group"><label class="tweak-label">Primary Color</label><input type="color" id="tweakAccent" value="#003A72" oninput="updateAccent(this.value)"></div>
  <div class="tweak-group"><label class="tweak-label">Glass Base Opacity</label><input type="range" id="tweakOpacity" min="0.02" max="0.3" step="0.02" value="0.15" oninput="updateGlass(this.value)"></div>
  <div class="tweak-group"><label class="tweak-label">Blur Strength</label><input type="range" id="tweakBlur" min="12" max="80" step="2" value="40" oninput="updateBlur(this.value)"></div>
  <div class="tweak-group"><label class="tweak-label">Border Radius</label><input type="range" id="tweakRadius" min="12" max="40" step="2" value="24" oninput="updateRadius(this.value)"></div>
</div>
<script>
// Theme Toggle Logic
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if(isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('omnibank-theme', 'light');
    document.getElementById('tweakOpacity').value = 0.15;
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('omnibank-theme', 'dark');
    document.getElementById('tweakOpacity').value = 0.05;
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('omnibank-theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.getElementById('tweakOpacity').value = 0.05;
}

const screens=document.querySelectorAll('.screen'),navItems=document.querySelectorAll('.nav-item'),screenTitle=document.getElementById('screenTitle'),screenBreadcrumb=document.getElementById('screenBreadcrumb');
const screenMeta={dashboard:{title:'Dashboard',breadcrumb:'Overview'},directory:{title:'Employees',breadcrumb:'Directory'},profile:{title:'Employee Profile',breadcrumb:'Profile'},departments:{title:'Departments',breadcrumb:'Organization'},leave:{title:'Leave',breadcrumb:'Time Off'},payroll:{title:'Payroll',breadcrumb:'Compensation'}};
const employeeData={'Sarah Chen':{initials:'SC',role:'VP of Risk Management',dept:'Risk Department',location:'New York, NY',tenure:'Joined Mar 2023',email:'sarah.chen@omnibank.com'},'James Okonkwo':{initials:'JO',role:'Senior Analyst',dept:'Corporate Banking',location:'London, UK',tenure:'Joined Jul 2020',email:'j.okonkwo@omnibank.com'},'Maria Torres':{initials:'MT',role:'Branch Manager',dept:'Retail Banking',location:'Miami, FL',tenure:'Joined Feb 2019',email:'m.torres@omnibank.com'},'David Kim':{initials:'DK',role:'Security Engineer',dept:'Information Technology',location:'San Francisco, CA',tenure:'Joined Jul 2023',email:'d.kim@omnibank.com'},'Priya Sharma':{initials:'PS',role:'General Counsel',dept:'Legal',location:'Mumbai, India',tenure:'Joined Dec 2014',email:'p.sharma@omnibank.com'},'Michael Okafor':{initials:'MO',role:'Operations Lead',dept:'Operations',location:'Lagos, Nigeria',tenure:'Joined Nov 2021',email:'m.okafor@omnibank.com'},'Elena Vasquez':{initials:'EV',role:'Brand Director',dept:'Marketing',location:'Madrid, Spain',tenure:'Joined Jan 2020',email:'e.vasquez@omnibank.com'},'Tom Bradley':{initials:'TB',role:'Investment Analyst',dept:'Corporate Banking',location:'New York, NY',tenure:'Joined Apr 2024',email:'t.bradley@omnibank.com'}};
navItems.forEach(i=>{i.addEventListener('click',()=>{const s=i.dataset.screen;s==='profile'?showProfile():showScreen(s)})});
function showScreen(id){screens.forEach(s=>s.classList.remove('active'));const t=document.getElementById('screen-'+id);if(t)t.classList.add('active');navItems.forEach(n=>n.classList.remove('active'));const n=document.querySelector(`.nav-item[data-screen="${id}"]`);if(n)n.classList.add('active');const m=screenMeta[id];if(m){screenTitle.textContent=m.title;screenBreadcrumb.textContent=m.breadcrumb}document.getElementById('content').scrollTop=0}
let currentEmployee='Sarah Chen';
function navigateTo(s,n){currentEmployee=n||'Sarah Chen';s==='profile'?showProfile():showScreen(s)}
function showProfile(n){const e=employeeData[n||currentEmployee]||employeeData['Sarah Chen'];currentEmployee=n||currentEmployee;document.getElementById('profileNameTitle').textContent=e.role;document.getElementById('profileAvatar').textContent=e.initials;document.getElementById('profileName').textContent=Object.keys(employeeData).find(k=>employeeData[k]===e)||currentEmployee;document.getElementById('profileRole').textContent=e.role;document.getElementById('profileDept').textContent=e.dept;document.getElementById('profileLocation').textContent=e.location;document.getElementById('profileTenure').textContent=e.tenure;document.getElementById('profileEmail').textContent=e.email;showScreen('profile')}
document.querySelectorAll('.profile-tab').forEach(t=>{t.addEventListener('click',()=>{document.querySelectorAll('.profile-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));document.getElementById('tab-'+t.dataset.tab).classList.add('active')})});
document.querySelectorAll('.filter-chip').forEach(c=>{c.addEventListener('click',()=>{if(c.classList.contains('add'))return;document.querySelectorAll('.filter-chip').forEach(x=>x.classList.remove('active'));c.classList.add('active')})});
document.querySelectorAll('.approval-btn').forEach(b=>{b.addEventListener('click',function(){this.closest('.approval-item').style.opacity='0.4';this.closest('.approval-item').style.pointerEvents='none'})});
const tweaksPanel=document.getElementById('tweaksPanel');
function toggleTweaks(){tweaksPanel.classList.toggle('open')}
function updateAccent(c){document.documentElement.style.setProperty('--primary',c);document.documentElement.style.setProperty('--primary-glow',c+'33');const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);document.documentElement.style.setProperty('--primary-light',`rgb(${Math.min(r+30,255)},${Math.min(g+40,255)},${Math.min(b+60,255)})`)}
function updateGlass(o){
  document.documentElement.style.setProperty('--glass-base-opacity', o);
  document.documentElement.style.setProperty('--glass-bg', `linear-gradient(135deg, var(--glass-highlight) 0%, rgba(255, 255, 255, ${o}) 25%, rgba(255,255,255,0) 65%, rgba(255,255,255,${o}) 100%)`);
}
function updateBlur(b){document.documentElement.style.setProperty('--glass-blur',b+'px')}
function updateRadius(r){document.documentElement.style.setProperty('--glass-radius',r+'px')}
</script>
</body>
</html>
