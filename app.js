/* Ghost Kitchen Command Center - screens and navigation (prototype). */
(function () {
  'use strict';
  var root = document.getElementById('root');
  var modalRoot = document.getElementById('modal-root');
  var S = GK.SEED, CFG = GK.CFG;
  var charts = [];
  var BRAND_IDX = {}; S.brands.forEach(function (b, i) { BRAND_IDX[b] = i; });
  var BRAND_COLORS = ['#2a78d6', '#eb6834', '#1baf7a'];
  var ROLE_KEY = 'gk_role';

  Chart.defaults.font.family = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  Chart.defaults.color = '#4a5160';

  // ---------------------------------------------------------------- helpers
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function money(v) { return '$' + Number(v).toFixed(2); }
  function money0(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function brandTag(b) { return '<span class="brand-dot b' + BRAND_IDX[b] + '"></span>' + h(b); }
  function timeAgo(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var hr = Math.round(m / 60); if (hr < 24) return hr + ' h ago'; return Math.round(hr / 24) + ' d ago';
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.add('hidden'); }, 3200);
  }
  function getRole() { try { return JSON.parse(sessionStorage.getItem(ROLE_KEY)); } catch (e) { return getRole._m || null; } }
  function setRole(r) { getRole._m = r; try { if (r) sessionStorage.setItem(ROLE_KEY, JSON.stringify(r)); else sessionStorage.removeItem(ROLE_KEY); } catch (e) { /* ignore */ } }
  function isOwner() { var r = getRole(); return r && r.role === 'owner'; }
  function chart(canvas, cfg) { var c = new Chart(canvas, cfg); charts.push(c); return c; }
  function clearCharts() { charts.forEach(function (c) { c.destroy(); }); charts = []; }
  var gridColor = '#eceef2';

  // ---------------------------------------------------------------- icons (inline SVG line icons, no emoji)
  var ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    dollar: '<path d="M12 3v18"/><path d="M16.5 7.5c-.8-1.2-2.4-2-4.5-2-2.6 0-4.5 1.3-4.5 3.2 0 4.3 9 2.4 9 6.6 0 1.9-1.9 3.2-4.5 3.2-2.2 0-3.9-.8-4.8-2.1"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    swap: '<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/>',
    reset: '<path d="M4 4v6h6"/><path d="M4.5 15a8 8 0 1 0 1.9-8.3L4 10"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/>',
    okcircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 13l2 2 4-4"/>',
    bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    store: '<path d="M3 9l2-5h14l2 5"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h12L22 7H6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'
  };
  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  // ---------------------------------------------------------------- routing
  var NAV = [
    { id: 'home', label: 'Home', ico: ic('home') },
    { id: 'orders', label: 'Order Hub', ico: ic('list') },
    { id: 'packing', label: 'Packing Check', ico: ic('check') },
    { id: 'staffing', label: 'Staffing', ico: ic('clock') },
    { id: 'profit', label: 'Profit Tracker', ico: ic('dollar'), owner: true },
    { id: 'kpis', label: 'KPIs', ico: ic('trend'), owner: true }
  ];
  var VIEWS = {};

  function route() {
    clearCharts();
    modalRoot.innerHTML = '';
    var page = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
    if (page === 'shop' || page.indexOf('shop/') === 0) { document.body.classList.add('in-shop'); return renderShop(page.split('/').slice(1)); }
    document.body.classList.remove('in-shop');
    document.title = 'Ghost Kitchen Command Center';
    if (root._sc) { root.removeEventListener('click', root._sc); root._sc = null; }
    var role = getRole();
    if (!role || page === 'login' || page === '') { if (role && page === '') { location.hash = '#/home'; return; } return renderLogin(); }
    if (!VIEWS[page]) { location.hash = '#/home'; return; }
    renderShell(page);
    var nav = NAV.find(function (n) { return n.id === page; });
    var main = $('#main');
    if (nav && nav.owner && !isOwner()) return renderLocked(main, nav.label);
    VIEWS[page](main);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------- login
  function renderLogin() {
    root.innerHTML =
      '<div class="login">' +
      ' <section class="login-art">' +
      '  <div class="logo"><div class="logo-mark">GK</div>Ghost Kitchen Command Center</div>' +
      '  <div><h1>One kitchen. Three brands. One clear view inside.</h1>' +
      '   <p>Orders from both delivery apps, phone/text and our own brand websites in one place, a packing check before every order leaves, staffing alerts for the rush, and true profit for the owner. Customers still see three separate brands.</p>' +
      '   <div class="flow-chips"><span>Delivery App 1</span><span>Delivery App 2</span><span>Phone / Text</span><span>Brand websites</span><span>&rarr; one order table</span></div>' +
      '   <div class="login-photos" aria-hidden="true">' + ['margherita-pizza', 'chicken-tikka-bowl', 'cheeseburger', 'tiramisu', 'vegetable-biryani', 'loaded-fries'].map(function (n) { return '<img src="' + n + '.jpg" alt="">'; }).join('') + '</div>' +
      '   <p class="photo-note">From our three brands: Nonna\'s Slice House, Bombay Street Bowls and Flame and Bun.</p></div>' +
      '  <div class="login-foot">MRP prototype &middot; synthetic data &middot; no real customer or payment data</div>' +
      ' </section>' +
      ' <section class="login-pick">' +
      '  <div><h2>Who is using the app?</h2><p class="sub">Staff pick a role to sign in. Each role sees a different set of screens. Customers use the brand websites.</p></div>' +
      '  <div class="name-field"><label for="nm">Your first name (optional)</label><input id="nm" type="text" maxlength="24" placeholder="e.g. Maria" autocomplete="off"></div>' +
      '  <button class="role-card" data-role="owner"><div class="role-icon owner">' + ic('chart') + '</div><div><b>Owner</b><span class="desc">Everything, including profit by brand, item and platform, and the 6 KPIs.</span></div><span class="go">&rsaquo;</span></button>' +
      '  <button class="role-card" data-role="lead"><div class="role-icon lead">' + ic('clipboard') + '</div><div><b>Shift Lead</b><span class="desc">Orders, packing check and staffing during service. No financial screens.</span></div><span class="go">&rsaquo;</span></button>' +
      '  <a class="role-card" href="#/shop"><div class="role-icon cust">' + ic('bag') + '</div><div><b>Customer</b><span class="desc">Order food from one of our three brand websites and pay (demo). No sign-in needed.</span></div><span class="go">&rsaquo;</span></a>' +
      '  <p class="proto-note">Prototype sign-in: no password needed. In the real version each person would log in with their own PIN, and the role would decide what they can see.</p>' +
      ' </section>' +
      '</div>';
    $$('button.role-card').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = $('#nm').value.trim();
        var role = b.getAttribute('data-role');
        setRole({ role: role, name: name || (role === 'owner' ? 'Owner' : 'Shift Lead') });
        GK.log((name || (role === 'owner' ? 'Owner' : 'Shift Lead')) + ' signed in as ' + (role === 'owner' ? 'Owner' : 'Shift Lead') + '.');
        location.hash = '#/home';
      });
    });
  }

  // ---------------------------------------------------------------- shell
  function renderShell(active) {
    var role = getRole();
    var pend = GK.pending().length;
    var links = NAV.map(function (n) {
      var extra = n.owner && role.role !== 'owner' ? '<span class="lock">' + ic('lock') + '</span>' : (n.id === 'packing' && pend ? '<span class="count">' + pend + '</span>' : '');
      return '<a class="nav-link' + (n.id === active ? ' active' : '') + '" href="#/' + n.id + '"><span class="ico">' + n.ico + '</span>' + n.label + extra + '</a>';
    }).join('');
    root.innerHTML =
      '<div class="topbar"><button id="menuBtn" aria-label="Open menu">' + ic('menu') + '</button><b>GK Command Center</b></div>' +
      '<div class="shell">' +
      ' <aside class="side" id="side">' +
      '  <div class="logo"><div class="logo-mark">GK</div><div>Command Center<small>GHOST KITCHEN</small></div></div>' + links +
      '  <div class="side-foot"><div class="who"><div class="avatar">' + h(role.name.charAt(0).toUpperCase()) + '</div><div><b>' + h(role.name) + '</b><span>' + (role.role === 'owner' ? 'Owner' : 'Shift Lead') + '</span></div></div>' +
      '   <button class="side-btn" id="switchRole">' + ic('swap') + '&nbsp; Switch role</button><button class="side-btn small" id="resetBtn">' + ic('reset') + '&nbsp; Reset demo data</button></div>' +
      ' </aside>' +
      ' <main class="main" id="main"></main>' +
      '</div>';
    $('#switchRole').addEventListener('click', function () { setRole(null); location.hash = '#/login'; });
    $('#resetBtn').addEventListener('click', function () {
      var b = $('#resetBtn');
      if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', '1'); b.innerHTML = 'Click again to reset'; return; }
      GK.reset(); toast('Demo data reset. 5 fresh orders are waiting at Packing Check.'); route();
    });
    $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });
    $$('.nav-link').forEach(function (a) { a.addEventListener('click', function () { $('#side').classList.remove('open'); }); });
  }

  function head(crumb, title, sub, actions) {
    return '<div class="page-head"><div><p class="crumb">' + crumb + '</p><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="btn-row">' + actions + '</div>' : '') + '</div>';
  }

  function renderLocked(main, label) {
    main.innerHTML = '<div class="card lockscreen"><div class="big">' + ic('lock') + '</div><h2>' + h(label) + ' is for the Owner only</h2>' +
      '<p class="sub">Shift Leads see operational screens. Financial data stays with the owner (role-based access).</p>' +
      '<div class="btn-row" style="justify-content:center"><a class="btn" href="#/home">Back to Home</a></div></div>';
  }

  function kpiTiles(k, keys) {
    var T = CFG.KPI_TARGETS;
    var defs = {
      accuracy: ['Order Accuracy Rate', k.accuracy.toFixed(1) + '%', k.accuracy >= T.accuracy, 'Target ' + T.accuracy + '%+'],
      profit_after_refunds: ['Avg Profit per Order', money(k.profit_after_refunds), k.profit_after_refunds >= T.profit_after_refunds, 'After refunds, target ' + money(T.profit_after_refunds)],
      peak_staffing_ratio: ['Peak Staffing Ratio', k.peak_staffing_ratio.toFixed(2), k.peak_staffing_ratio <= T.peak_staffing_ratio, 'Orders per staff, target ' + T.peak_staffing_ratio + ' or less'],
      prep_variance: ['Prep-Time Variance', k.prep_variance.toFixed(2) + ' min', k.prep_variance <= T.prep_variance, 'Past quote, target ' + T.prep_variance + ' min or less'],
      rating: ['Customer Rating', k.rating.toFixed(2), k.rating >= T.rating, 'Out of 5, target ' + T.rating],
      refund_rate: ['Refund Rate', k.refund_rate.toFixed(1) + '%', k.refund_rate <= T.refund_rate, 'Target ' + T.refund_rate + '% or less']
    };
    return keys.map(function (key) {
      var d = defs[key];
      return '<div class="card kpi"><p class="name">' + d[0] + '<span class="pill ' + (d[2] ? 'good">On target' : 'warn">Off target') + '</span></p><div class="val">' + d[1] + '</div><div class="meta">' + d[3] + '</div></div>';
    }).join('');
  }

  // ---------------------------------------------------------------- HOME
  VIEWS.home = function (main) {
    var role = getRole();
    var k = GK.kpis();
    var st = GK.state();
    var pend = GK.pending();
    var hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    var snap = st.staffing[0] || { hour: 19, staff: 5, queue: 12, ratio: 2.4, demo: true };
    var level = snap.ratio > CFG.STAFFING_ALERT_THRESHOLD ? 'bad' : snap.ratio > 1.5 ? 'warn' : 'good';
    var need = Math.max(0, Math.ceil(snap.queue / CFG.STAFFING_ALERT_THRESHOLD) - snap.staff);

    main.innerHTML = head('HOME', greet + ', ' + h(role.name), role.role === 'owner' ? 'Here is how the whole kitchen is doing across all three brands.' : 'Here is what needs attention during service.') +
      '<div class="grid g2 mt">' +
      ' <div class="alert ' + level + '"><div class="ai">' + (level === 'bad' ? ic('alert') : level === 'warn' ? ic('hourglass') : ic('okcircle')) + '</div><div class="grow"><b>Staffing ' + (level === 'bad' ? 'alert' : level === 'warn' ? 'watch' : 'on track') + ' at ' + snap.hour + ':00' + (snap.demo ? ' (example rush)' : '') + '</b>' +
      snap.queue + ' orders waiting, ' + snap.staff + ' staff &middot; ratio ' + snap.ratio.toFixed(2) + (need ? ' &middot; call in ' + need + ' more' : '') + '</div><a class="btn small" href="#/staffing">Check staffing</a></div>' +
      ' <div class="alert ' + (pend.length ? 'warn' : 'good') + '"><div class="ai">' + ic('box') + '</div><div class="grow"><b>' + pend.length + ' order' + (pend.length === 1 ? '' : 's') + ' waiting for packing check</b>Mark every item Correct or Wrong before it leaves.</div><a class="btn small" href="#/packing">Start checking</a></div>' +
      '</div>' +
      '<h2 class="mt-lg" style="font-size:17px;margin-bottom:10px">' + (role.role === 'owner' ? 'The 6 KPIs' : 'Service KPIs') + '</h2>' +
      '<div class="grid g3">' + kpiTiles(k, role.role === 'owner' ? ['accuracy', 'profit_after_refunds', 'peak_staffing_ratio', 'prep_variance', 'rating', 'refund_rate'] : ['accuracy', 'peak_staffing_ratio', 'prep_variance']) + '</div>' +
      '<div class="grid g-side mt-lg">' +
      ' <div class="card card-pad"><h2>How data flows through the app</h2><p class="sub">Every order, whatever the channel, ends up in the same standard format.</p>' + flowHtml() + '</div>' +
      ' <div class="card card-pad"><h2>Recent activity</h2><ul class="feed">' + st.activity.slice(0, 6).map(function (a) { return '<li><span class="t">' + timeAgo(a.t) + '</span><span>' + h(a.text) + '</span></li>'; }).join('') + '</ul></div>' +
      '</div>';
  };

  function flowHtml() {
    return '<div class="flow">' +
      '<div class="step"><span class="k">1 GATHER</span><b>4 order sources</b><span>App 1 CSV, App 2 dashboard, phone/text form, customer website</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">2 STANDARDIZE</span><b>Same 10 fields</b><span>Brand, channel, item, price, commission, profit...</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">3 STORE</span><b>One order table</b><span>2,500 history orders + new orders in the browser</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">4 USE</span><b>KPIs and alerts</b><span>Packing, staffing, profit, 6 KPIs</span></div></div>';
  }

  // ---------------------------------------------------------------- ORDER HUB
  var hubState = { channel: '', brand: '', status: '', q: '', page: 0 };
  VIEWS.orders = function (main) {
    var all = GK.allOrders();
    var count = function (p) { return all.filter(function (o) { return o.platform === p; }).length; };
    var owner = isOwner();
    main.innerHTML = head('ORDER HUB', 'All orders, one table', 'Delivery App 1, Delivery App 2, phone/text and customer website orders, converted to the same standard fields.',
      '<button class="btn primary big" id="newOrder">+ New phone/text order</button>') +
      '<div class="grid g4">' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#5b6b8c"></span>Delivery App 1</b><span class="pill info">CSV import</span></div><div class="big">' + count('Delivery App 1').toLocaleString() + '</div><button class="btn" id="importBtn">Import CSV</button></div>' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#8a6bbf"></span>Delivery App 2</b><span class="pill muted">No export</span></div><div class="big">' + count('Delivery App 2').toLocaleString() + '</div><button class="btn" id="app2Btn">Add App 2 order</button></div>' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#e8a33d"></span>Phone / Text</b><span class="pill good">Replaces notebook</span></div><div class="big">' + count('Phone/Text').toLocaleString() + '</div><button class="btn" id="phoneBtn">Add phone/text order</button></div>' +
      ' <div class="card source web"><div class="top"><b><span class="brand-dot" style="background:#7a3fb0"></span>Brand Websites</b><span class="pill info">Customer UI</span></div><div class="big">' + count(GK.WEB).toLocaleString() + '</div><a class="btn" href="#/shop" target="_blank" rel="noopener">Open customer site ' + ic('ext') + '</a></div>' +
      '</div>' +
      '<div class="card mt-lg">' +
      ' <div class="filters">' +
      '  <select id="fChannel" aria-label="Channel"><option value="">All channels</option>' + S.platforms.map(function (p) { return '<option' + (hubState.channel === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select>' +
      '  <select id="fBrand" aria-label="Brand"><option value="">All brands</option>' + S.brands.map(function (b) { return '<option' + (hubState.brand === b ? ' selected' : '') + '>' + h(b) + '</option>'; }).join('') + '</select>' +
      '  <select id="fStatus" aria-label="Status"><option value="">All statuses</option>' + ['Waiting for packing check', 'Sent', 'Sent with error', 'Delivered (imported)', 'Delivered'].map(function (s) { return '<option' + (hubState.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '  <input type="search" id="fQ" placeholder="Search order ID or item" value="' + h(hubState.q) + '" style="flex:1">' +
      ' </div>' +
      ' <div class="table-wrap"><table class="t"><thead><tr><th>Order</th><th>Date</th><th>Brand</th><th>Channel</th><th>Item</th><th class="n">Subtotal</th><th class="n">Commission</th>' + (owner ? '<th class="n">Est. profit</th>' : '') + '<th>Status</th></tr></thead><tbody id="rows"></tbody></table></div>' +
      ' <div class="pager"><span id="pinfo"></span><span class="btn-row"><button class="btn small" id="prev">Previous</button><button class="btn small" id="next">Next</button></span></div>' +
      '</div>';

    function statusPill(s) {
      var cls = s === 'Waiting for packing check' ? 'warn' : s === 'Sent with error' ? 'bad' : s === 'Sent' ? 'good' : s === 'Delivered (imported)' ? 'info' : 'muted';
      return '<span class="pill ' + cls + '">' + s + '</span>';
    }
    function draw() {
      var q = hubState.q.toLowerCase();
      var list = all.filter(function (o) {
        return (!hubState.channel || o.platform === hubState.channel) && (!hubState.brand || o.brand === hubState.brand) &&
          (!hubState.status || o.status === hubState.status) && (!q || o.id.toLowerCase().indexOf(q) >= 0 || o.item.toLowerCase().indexOf(q) >= 0 || (o.ext || '').toLowerCase().indexOf(q) >= 0);
      });
      var per = 20, pages = Math.max(1, Math.ceil(list.length / per));
      hubState.page = Math.min(hubState.page, pages - 1);
      var slice = list.slice(hubState.page * per, hubState.page * per + per);
      $('#rows').innerHTML = slice.map(function (o) {
        return '<tr class="' + (o.source !== 'history' ? 'new' : '') + '"><td class="nw"><b>' + o.id + '</b>' + (o.ext ? '<br><small style="color:#7a8291">' + h(o.ext) + '</small>' : '') + '</td><td class="nw">' + o.date + '<br><small style="color:#7a8291">' + o.hour + ':00</small></td><td>' + brandTag(o.brand) + '</td><td>' + h(o.platform) + (o.source === 'customer' ? '<br><span class="pill info" style="margin-top:3px">Customer UI</span>' : '') + '</td><td>' + o.qty + ' x ' + h(o.item) + (o.customer && o.source === 'customer' ? '<br><small style="color:#7a8291">For ' + h(o.customer) + ' &middot; ' + h(o.fulfilment) + '</small>' : '') + (o.note ? '<br><small style="color:#7a8291">Note: ' + h(o.note) + '</small>' : '') + '</td>' +
          '<td class="n">' + money(o.subtotal) + '</td><td class="n">' + money(o.commission) + '</td>' + (owner ? '<td class="n">' + money(o.profit) + '</td>' : '') + '<td>' + statusPill(o.status) + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="empty">No orders match these filters.</td></tr>';
      $('#pinfo').textContent = list.length.toLocaleString() + ' orders · page ' + (hubState.page + 1) + ' of ' + pages;
      $('#prev').disabled = hubState.page === 0; $('#next').disabled = hubState.page >= pages - 1;
    }
    draw();
    ['fChannel', 'fBrand', 'fStatus'].forEach(function (id, i) {
      $('#' + id).addEventListener('change', function (e) { hubState[['channel', 'brand', 'status'][i]] = e.target.value; hubState.page = 0; draw(); });
    });
    $('#fQ').addEventListener('input', function (e) { hubState.q = e.target.value; hubState.page = 0; draw(); });
    $('#prev').addEventListener('click', function () { hubState.page--; draw(); });
    $('#next').addEventListener('click', function () { hubState.page++; draw(); });
    $('#newOrder').addEventListener('click', function () { orderForm('Phone/Text'); });
    $('#phoneBtn').addEventListener('click', function () { orderForm('Phone/Text'); });
    $('#app2Btn').addEventListener('click', function () { orderForm('Delivery App 2'); });
    $('#importBtn').addEventListener('click', importModal);
  };

  function openModal(title, body, foot, wide) {
    modalRoot.innerHTML = '<div class="modal-bg" id="mbg"><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + h(title) + '"><div class="modal-head"><h2>' + title + '</h2><button class="x" id="mx" aria-label="Close">&times;</button></div><div class="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div></div>';
    $('#mx').addEventListener('click', closeModal);
    $('#mbg').addEventListener('click', function (e) { if (e.target.id === 'mbg') closeModal(); });
    document.addEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() { modalRoot.innerHTML = ''; document.removeEventListener('keydown', escClose); }

  function orderForm(channel) {
    var owner = isOwner();
    openModal(channel === 'Phone/Text' ? 'New phone/text order' : 'Add Delivery App 2 order',
      '<div class="form-grid">' +
      ' <div><label class="f" for="oCh">Channel</label><select id="oCh"><option' + (channel === 'Phone/Text' ? ' selected' : '') + '>Phone/Text</option><option' + (channel === 'Delivery App 2' ? ' selected' : '') + '>Delivery App 2</option></select></div>' +
      ' <div><label class="f" for="oBrand">Brand</label><select id="oBrand">' + S.brands.map(function (b) { return '<option>' + h(b) + '</option>'; }).join('') + '</select></div>' +
      ' <div><label class="f" for="oItem">Item</label><select id="oItem"></select></div>' +
      ' <div><label class="f" for="oQty">Quantity</label><input id="oQty" type="number" min="1" max="20" value="1"></div>' +
      ' <div><label class="f" for="oCust">Customer first name (optional)</label><input id="oCust" type="text" maxlength="30" placeholder="First name only, no phone numbers"></div>' +
      ' <div><label class="f" for="oNote">Special request (optional)</label><input id="oNote" type="text" maxlength="80" placeholder="e.g. no onions"></div>' +
      '</div>' +
      '<div class="calc" id="calc"></div>' +
      '<p class="sub" style="margin-top:12px">Saved orders go to the <b>Packing Check</b> queue. Commission is set automatically by channel: Phone/Text 0%, Delivery App 2 ' + Math.round(S.rates['Delivery App 2'] * 100) + '%.</p>',
      '<button class="btn" id="cancel">Cancel</button><button class="btn primary" id="saveOrder">Save order</button>');
    function fillItems() {
      $('#oItem').innerHTML = S.menu[$('#oBrand').value].map(function (m) { return '<option value="' + h(m[0]) + '">' + h(m[0]) + ' (' + money(m[2]) + ')</option>'; }).join('');
    }
    function calc() {
      var p = GK.preview({ brand: $('#oBrand').value, item: $('#oItem').value, qty: $('#oQty').value, platform: $('#oCh').value });
      $('#calc').innerHTML = '<div><span>Subtotal</span><b>' + money(p.subtotal) + '</b></div><div><span>Commission</span><b>' + money(p.commission) + '</b></div>' +
        (owner ? '<div><span>Est. profit</span><b>' + money(p.profit) + '</b></div>' : '<div><span>Food cost</span><b>' + money(p.foodCost) + '</b></div>') +
        '<div><span>Quoted prep time</span><b>' + p.quoted + ' min</b></div>';
    }
    fillItems(); calc();
    $('#oBrand').addEventListener('change', function () { fillItems(); calc(); });
    ['oItem', 'oQty', 'oCh'].forEach(function (id) { $('#' + id).addEventListener('input', calc); $('#' + id).addEventListener('change', calc); });
    $('#cancel').addEventListener('click', closeModal);
    $('#saveOrder').addEventListener('click', function () {
      var o = GK.addOrder({ platform: $('#oCh').value, brand: $('#oBrand').value, item: $('#oItem').value, qty: $('#oQty').value,
        customer: $('#oCust').value.trim(), note: $('#oNote').value.trim(), source: 'form' });
      closeModal();
      hubState = { channel: '', brand: '', status: '', q: '', page: 0 };
      route();
      toast('Order ' + o.id + ' saved and sent to Packing Check.');
    });
  }

  function importModal() {
    var checked = null;
    openModal('Import Delivery App 1 CSV',
      '<p class="sub">Step 1: choose the CSV file Delivery App 1 exports, or try the sample file.</p>' +
      '<div class="btn-row"><label class="btn" for="csvFile">Choose CSV file<input type="file" id="csvFile" accept=".csv,text/csv" class="hidden"></label><button class="btn amber" id="sampleCsv">Use sample export</button></div>' +
      '<div id="impOut" class="mt"></div>',
      '<button class="btn" id="cancel">Cancel</button><button class="btn primary" id="doImport" disabled>Import orders</button>', true);
    $('#cancel').addEventListener('click', closeModal);
    function show(text) {
      checked = GK.checkImport(text);
      var out = $('#impOut');
      if (checked.error) { out.innerHTML = '<div class="alert bad"><div class="ai">' + ic('alert') + '</div><div>' + h(checked.error) + '</div></div>'; $('#doImport').disabled = true; return; }
      var ok = checked.rows.filter(function (r) { return r.std; }).length;
      out.innerHTML =
        '<p class="sub"><b>Step 2: column mapping.</b> Delivery App 1 uses its own column names. This is how each one maps to our standard fields:</p>' +
        '<div class="table-wrap"><table class="t"><thead><tr><th>App 1 column</th><th>Our field</th><th>Rule</th></tr></thead><tbody>' +
        checked.mapping.map(function (m) { return '<tr><td><code>' + h(m.from) + '</code></td><td><b>' + h(m.to) + '</b></td><td>' + h(m.how) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="sub mt"><b>Step 3: preview.</b> ' + ok + ' of ' + checked.rows.length + ' rows are ready. Rows in red need review and will not be imported.</p>' +
        '<div class="table-wrap"><table class="t imp"><thead><tr><th>Ref</th><th>Date</th><th>Brand</th><th>Item</th><th class="n">Qty</th><th class="n">Subtotal</th><th class="n">Commission</th><th>Check</th></tr></thead><tbody>' +
        checked.rows.map(function (r) {
          var x = r.raw;
          return '<tr class="' + (r.std ? '' : 'err') + '"><td>' + h(x['Order Number']) + '</td><td>' + h(x['Order Placed']) + '</td><td>' + h(x['Store Name']) + '</td><td>' + h(x['Item Name']) + '</td><td class="n">' + h(x['Quantity']) + '</td><td class="n">' + h(x['Item Subtotal']) + '</td><td class="n">' + h(x['Platform Fee']) + '</td><td>' +
            (r.std ? '<span class="pill good">Ready</span>' : '<span class="pill bad">' + h(r.problems.join(', ')) + '</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      $('#doImport').disabled = ok === 0;
      $('#doImport').textContent = 'Import ' + ok + ' order' + (ok === 1 ? '' : 's');
    }
    $('#csvFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { show(String(rd.result)); }; rd.readAsText(f);
    });
    $('#sampleCsv').addEventListener('click', function () {
      fetch('delivery_app_1_export.csv').then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
        .then(show).catch(function () { show(SAMPLE_CSV); });
    });
    $('#doImport').addEventListener('click', function () {
      var n = GK.commitImport(checked);
      closeModal();
      hubState = { channel: 'Delivery App 1', brand: '', status: 'Delivered (imported)', q: '', page: 0 };
      route();
      toast(n + ' Delivery App 1 orders imported and standardized.');
    });
  }
  // fallback when the page is opened straight from disk (file://), where fetch is blocked
  var SAMPLE_CSV = 'Order Number,Order Placed,Store Name,Item Name,Quantity,Item Subtotal,Platform Fee\n' +
    "DA1-880341,2026-10-30 11:42,Nonna's Slice House,Pepperoni Pizza,2,33.1,6.08\nDA1-880342,2026-10-30 11:55,Bombay Street Bowls,Chicken Tikka Bowl,1,13.6,2.51\n" +
    'DA1-880347,2026-10-30 12:08,Flame and Bun,Double Stack Burger,2,31.2,5.74\nDA1-880350,2026-10-30 12:21,Flame and Bun,Loaded Fries,3,22.05,4.06\n' +
    "DA1-880356,2026-10-30 12:40,Nonna's Slice House,Garlic Knots,2,13.65,2.51\nDA1-880361,2026-10-30 18:15,Bombay Street Bowls,Vegetable Biryani,2,28.35,5.22\n" +
    "DA1-880365,2026-10-30 18:33,Nonna's Slice House,Margherita Pizza,1,15.1,2.78\nDA1-880369,2026-10-30 19:02,Flame and Bun,Truffle Burger,1,16.5,3.04\n" +
    'DA1-880372,2026-10-30 19:20,Bombay Street Bowls,Mango Lassi,2,9.45,1.74\nDA1-880376,2026-10-30 20:05,Flame and Bun,Classic Cheeseburger,2,23.1,4.25\n';

  // ---------------------------------------------------------------- PACKING CHECK
  var packSel = null;
  var mistakePeriod = 'month';
  VIEWS.packing = function (main) {
    var pend = GK.pending();
    var st = GK.state();
    if (!pend.some(function (o) { return o.id === packSel; })) packSel = pend.length ? pend[0].id : null;
    var sel = pend.find(function (o) { return o.id === packSel; });
    var checks = st.checks;
    var caught = checks.filter(function (c) { return c.mistake && c.fixed; }).length;
    var passed = checks.filter(function (c) { return !c.mistake; }).length;
    var sentBad = checks.filter(function (c) { return c.mistake && !c.fixed; }).length;

    main.innerHTML = head('PACKING CHECK', 'Check every order before it leaves', 'Mark each line Correct or Wrong. If something is wrong, log why, so the owner can see which mistakes keep happening.') +
      '<div class="grid g4">' +
      '<div class="card kpi"><p class="name">Waiting</p><div class="val">' + pend.length + '</div><div class="meta">orders in the queue</div></div>' +
      '<div class="card kpi"><p class="name">Passed first time</p><div class="val">' + passed + '</div><div class="meta">checked in this app</div></div>' +
      '<div class="card kpi"><p class="name">Mistakes caught</p><div class="val" style="color:var(--good)">' + caught + '</div><div class="meta">fixed before leaving</div></div>' +
      '<div class="card kpi"><p class="name">Sent with error</p><div class="val" style="color:var(--bad)">' + sentBad + '</div><div class="meta">count against accuracy</div></div>' +
      '</div>' +
      '<div class="grid g-pack mt-lg">' +
      ' <div class="card card-pad"><h2>Queue</h2><p class="sub">Oldest first. Tap an order to check it.</p><div class="queue">' +
      (pend.length ? pend.slice().reverse().map(function (o) {
        return '<button class="q-item' + (o.id === packSel ? ' sel' : '') + '" data-id="' + o.id + '"><span class="id">' + o.id + '</span><span class="pill muted">' + h(o.platform) + '</span><span class="what">' + brandTag(o.brand) + ' &middot; ' + o.qty + ' x ' + h(o.item) + '</span></button>';
      }).join('') : '<div class="empty"><div class="big">' + ic('inbox') + '</div>Queue is empty. Add a phone/text order in the Order Hub, or place one on the customer site, to try a check.</div>') +
      ' </div></div>' +
      ' <div class="card card-pad" id="checkPane"></div>' +
      '</div>' +
      '<div class="card card-pad mt-lg"><div class="page-head" style="margin-bottom:6px"><div><h2>Mistake reasons over time</h2><p class="sub" style="margin:0">Every mistake reason, counted per ' + mistakePeriod + '. 2025 wrong orders from our dataset (reasons simulated, since the dataset only records that an order was wrong) plus every mistake logged in this app.</p></div>' +
      '  <div class="seg" role="tablist">' + [['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(function (d) { return '<button data-p="' + d[0] + '" class="' + (d[0] === mistakePeriod ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') + '</div></div>' +
      '  <div class="chart-box tall"><canvas id="reasonChart"></canvas></div><div class="reason-totals" id="reasonTotals"></div></div>' +
      '<div class="grid g2 mt-lg">' +
      ' <div class="card card-pad"><h2>Check log</h2><div class="table-wrap"><table class="t"><thead><tr><th>When</th><th>Order</th><th>Brand</th><th>Result</th></tr></thead><tbody>' +
      (checks.length ? checks.slice(0, 8).map(function (c) {
        return '<tr><td>' + timeAgo(c.t) + '</td><td>' + c.id + '</td><td>' + brandTag(c.brand) + '</td><td>' + (!c.mistake ? '<span class="pill good">Passed</span>' : c.fixed ? '<span class="pill warn">' + h(c.reason) + ', fixed</span>' : '<span class="pill bad">' + h(c.reason) + ', sent</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="empty">No checks yet.</td></tr>') + '</tbody></table></div></div>' +
      ' <div class="card card-pad"><h2>Logged in this app</h2><p class="sub">Mistakes found at the packing station so far, by reason.</p><div id="appReasons"></div></div>' +
      '</div>';

    $$('.q-item').forEach(function (b) { b.addEventListener('click', function () { packSel = b.getAttribute('data-id'); route(); if (window.innerWidth < 980) { var cp = document.getElementById('checkPane'); if (cp) cp.scrollIntoView({ behavior: 'smooth' }); } }); });

    var pane = $('#checkPane');
    if (!sel) { pane.innerHTML = '<div class="empty"><div class="big">' + ic('okcircle') + '</div>Nothing to check right now.</div>'; }
    else {
      // each line: [text, mistake reason used if staff mark it Wrong]
      var lines = [
        [sel.qty + ' x ' + sel.item, 'Wrong item'],
        ['Correct brand bag and sticker: ' + sel.brand, 'Wrong brand bag'],
        ['Sauces, cutlery and napkins included', 'Missing item']
      ];
      if (sel.note) lines.push(['Special request followed: "' + sel.note + '"', 'Request not followed']);
      if (sel.source === 'customer') lines.push([(sel.fulfilment === 'Pickup' ? 'Pickup label shows "' : 'Delivery label shows "') + sel.customer + '" and ' + sel.ext, 'Other']);
      lines.push(['Bag sealed and labelled ' + sel.id, 'Spilled or damaged']);
      var marks = lines.map(function () { return null; });
      pane.innerHTML = '<div class="page-head" style="margin-bottom:6px"><div><h2 style="font-size:20px;margin:0">' + sel.id + '</h2><p style="margin:2px 0 0">' + brandTag(sel.brand) + ' &middot; ' + h(sel.platform) + (sel.ext && sel.source === 'customer' ? ' ' + h(sel.ext) : '') + (sel.customer ? ' &middot; for ' + h(sel.customer) : '') + '</p></div><span class="pill warn">Waiting ' + (sel.minutesAgo || 1) + ' min</span></div>' +
        '<p class="sub" style="margin:0 0 8px">Mark every line Correct or Wrong.</p>' +
        '<div class="check-list">' + lines.map(function (l, i) {
          return '<div class="check" id="ln' + i + '"><span class="ck-text">' + h(l[0]) + '</span><span class="ck-btns"><button class="ck ok" data-i="' + i + '" data-v="ok" aria-label="Correct: ' + h(l[0]) + '">' + ic('check') + ' Correct</button><button class="ck no" data-i="' + i + '" data-v="no" aria-label="Wrong: ' + h(l[0]) + '">' + ic('x') + ' Wrong</button></span></div>';
        }).join('') + '</div>' +
        '<div class="btn-row"><button class="btn good big" id="passBtn" disabled>All correct, send out</button></div>' +
        '<div id="mistakeBox" class="hidden mt"><p class="sub" style="margin-bottom:8px"><b>What was wrong?</b> (picked from the line you marked Wrong, change it if needed)</p><div class="reasons">' +
        ['Wrong item', 'Missing item', 'Request not followed', 'Wrong brand bag', 'Spilled or damaged', 'Other'].map(function (r) { return '<button class="reason" data-r="' + r + '">' + r + '</button>'; }).join('') +
        '</div><p class="sub mt" style="margin-bottom:8px"><b>Was it fixed before the order left?</b></p><div class="btn-row"><button class="btn good" id="fixedYes" disabled>Yes, fixed and sent</button><button class="btn bad" id="fixedNo" disabled>No, sent as is</button></div></div>';
      var reason = null;
      function pickReason(r) {
        reason = r;
        $$('.reason', pane).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-r') === r); });
        $('#fixedYes').disabled = !r; $('#fixedNo').disabled = !r;
      }
      $$('.ck', pane).forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.getAttribute('data-i'), v = b.getAttribute('data-v');
          marks[i] = marks[i] === v ? null : v;
          var row = $('#ln' + i);
          row.classList.toggle('done', marks[i] === 'ok'); row.classList.toggle('wrong', marks[i] === 'no');
          $$('.ck', row).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === marks[i]); });
          var firstWrong = marks.indexOf('no');
          $('#passBtn').disabled = !marks.every(function (x) { return x === 'ok'; });
          $('#mistakeBox').classList.toggle('hidden', firstWrong < 0);
          if (firstWrong >= 0 && (marks[i] === 'no' || !reason)) pickReason(lines[firstWrong][1]);
          if (firstWrong < 0) pickReason(null);
        });
      });
      $('#passBtn').addEventListener('click', function () { GK.completeCheck(sel.id, {}); toast(sel.id + ' passed and sent out.'); route(); });
      $$('.reason', pane).forEach(function (b) { b.addEventListener('click', function () { pickReason(b.getAttribute('data-r')); }); });
      $('#fixedYes').addEventListener('click', function () { GK.completeCheck(sel.id, { reason: reason, fixed: true }); toast('Mistake caught on ' + sel.id + ' and fixed before it left.'); route(); });
      $('#fixedNo').addEventListener('click', function () { GK.completeCheck(sel.id, { reason: reason, fixed: false }); toast(sel.id + ' logged as sent with an error.'); route(); });
    }

    var RC = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'];
    var ser = GK.mistakeSeries(mistakePeriod, mistakePeriod === 'day' ? 31 : mistakePeriod === 'week' ? 26 : 0);
    var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var labels = ser.keys.map(function (k) {
      if (mistakePeriod === 'month') return MN[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4);
      var d = new Date(k + 'T12:00:00'); return (mistakePeriod === 'week' ? 'Wk of ' : '') + MN[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== 2025 ? ' ' + String(d.getFullYear()).slice(2) : '');
    });
    chart($('#reasonChart'), {
      type: 'bar',
      data: { labels: labels, datasets: ser.reasons.map(function (r, i) { return { label: r, data: ser.counts[i], backgroundColor: RC[i], borderColor: '#fff', borderWidth: 1, maxBarThickness: 40 }; }) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } },
          tooltip: { callbacks: { footer: function (it) { var t = it.reduce(function (a, x) { return a + x.raw; }, 0); var app = ser.app[it[0].dataIndex]; return 'Total: ' + t + (app ? ' (' + app + ' logged in this app)' : ''); } } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0 } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor }, title: { display: true, text: 'Mistakes' } } } }
    });
    $('#reasonTotals').innerHTML = ser.reasons.map(function (r, i) { return '<span><i style="background:' + RC[i] + '"></i>' + h(r) + ' <b>' + ser.totals[i] + '</b> (' + Math.round(ser.totals[i] / ser.total * 100) + '%)</span>'; }).join('');
    $$('.seg button[data-p]').forEach(function (b) { b.addEventListener('click', function () { mistakePeriod = b.getAttribute('data-p'); route(); }); });
    var reasons = {};
    checks.forEach(function (c) { if (c.mistake) reasons[c.reason] = (reasons[c.reason] || 0) + 1; });
    var keys = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; });
    $('#appReasons').innerHTML = keys.length ? '<table class="t"><thead><tr><th>Reason</th><th class="n">Count</th></tr></thead><tbody>' + keys.map(function (k) { return '<tr><td>' + h(k) + '</td><td class="n">' + reasons[k] + '</td></tr>'; }).join('') + '</tbody></table>'
      : '<div class="empty"><div class="big">' + ic('clipboard') + '</div>No mistakes logged in this app yet. Mark a line Wrong on an order to add one.</div>';
  };

  // ---------------------------------------------------------------- STAFFING
  var staffState = { hour: 19, staff: 5, queue: 12 };
  VIEWS.staffing = function (main) {
    var hist = GK.hourlyHistory();
    var T = CFG.STAFFING_ALERT_THRESHOLD;
    var sugTotal = hist.reduce(function (s, x) { return s + x.suggested; }, 0);
    main.innerHTML = head('STAFFING', 'Is the kitchen keeping up?', 'The alert turns red when more than ' + T + ' orders are waiting per person on shift.') +
      '<div class="grid g-side">' +
      ' <div class="card card-pad"><h2>Live check</h2><p class="sub">Enter what you see right now. The app tells you if you need help.</p>' +
      '  <div class="grid g3">' +
      '   <div><label class="f" for="sHour">Hour</label><select id="sHour">' + hist.map(function (x) { return '<option value="' + x.hour + '"' + (x.hour === staffState.hour ? ' selected' : '') + '>' + x.hour + ':00' + (GK.isPeak(x.hour) ? ' (rush)' : '') + '</option>'; }).join('') + '</select></div>' +
      '   <div><label class="f">Staff on shift</label><div class="stepper"><button data-s="staff" data-d="-1" aria-label="Fewer staff">&minus;</button><output id="oStaff">' + staffState.staff + '</output><button data-s="staff" data-d="1" aria-label="More staff">+</button></div></div>' +
      '   <div><label class="f">Orders waiting</label><div class="stepper"><button data-s="queue" data-d="-1" aria-label="Fewer orders">&minus;</button><output id="oQueue">' + staffState.queue + '</output><button data-s="queue" data-d="1" aria-label="More orders">+</button></div></div>' +
      '  </div>' +
      '  <div class="btn-row mt"><button class="btn primary" id="saveSnap">Save this check</button></div>' +
      ' </div>' +
      ' <div id="gauge"></div>' +
      '</div>' +
      '<div class="grid g2 mt-lg">' +
      ' <div class="card card-pad"><h2>Orders waiting per staff member, by hour</h2><p class="sub">Average from 2,500 past orders. Bars above the dashed line break the target.</p><div class="chart-box"><canvas id="ratioChart"></canvas></div></div>' +
      ' <div class="card card-pad"><h2>Suggested schedule</h2><p class="sub">The same ' + sugTotal + ' staff hours between 10:00 and 21:00, moved into the busiest hours.</p><div class="chart-box"><canvas id="schedChart"></canvas></div></div>' +
      '</div>' +
      '<div class="card mt-lg"><div class="table-wrap"><table class="t"><thead><tr><th>Hour</th><th class="n">Past orders</th><th class="n">Avg waiting</th><th class="n">Staff now</th><th class="n">Suggested</th><th>Change</th></tr></thead><tbody>' +
      hist.map(function (x) {
        var d = x.suggested - x.now;
        return '<tr><td>' + x.hour + ':00' + (GK.isPeak(x.hour) ? ' <span class="pill warn">rush</span>' : '') + '</td><td class="n">' + x.orders + '</td><td class="n">' + x.queue.toFixed(1) + '</td><td class="n">' + x.now + '</td><td class="n"><b>' + x.suggested + '</b></td><td>' +
          (d > 0 ? '<span class="pill good">+1, add a person</span>' : d < 0 ? '<span class="pill muted">-1, move to rush</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    function gauge() {
      var ratio = staffState.queue / staffState.staff;
      var level = ratio > T ? 'bad' : ratio > 1.5 ? 'warn' : 'good';
      var need = Math.max(0, Math.ceil(staffState.queue / T) - staffState.staff);
      $('#gauge').innerHTML = '<div class="gauge ' + level + '"><div class="l">Orders waiting per staff member</div><div class="v">' + ratio.toFixed(2) + '</div>' +
        '<p style="margin:10px 0 0;font-weight:700;font-size:17px">' + (level === 'bad' ? ic('alert') + ' Call in ' + need + ' more ' + (need === 1 ? 'person' : 'people') : level === 'warn' ? ic('hourglass') + ' Busy, keep watching' : ic('okcircle') + ' On track') + '</p>' +
        '<p class="sub" style="margin:6px 0 0">Target: ' + T + ' or less</p></div>';
      $('#oStaff').textContent = staffState.staff; $('#oQueue').textContent = staffState.queue;
    }
    gauge();
    $$('.stepper button').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-s'), d = +b.getAttribute('data-d');
        staffState[k] = Math.max(k === 'staff' ? 1 : 0, Math.min(30, staffState[k] + d)); gauge();
      });
    });
    $('#sHour').addEventListener('change', function (e) {
      staffState.hour = +e.target.value;
      var x = hist.find(function (y) { return y.hour === staffState.hour; });
      staffState.staff = x.now; staffState.queue = Math.round(x.queue); gauge();
    });
    $('#saveSnap').addEventListener('click', function () { GK.staffingSnapshot({ hour: staffState.hour, staff: staffState.staff, queue: staffState.queue }); toast('Staffing check saved. It now shows on the Home screen.'); });

    var thresholdPlugin = {
      id: 'thr', afterDatasetsDraw: function (c) {
        var y = c.scales.y.getPixelForValue(T), a = c.chartArea, ctx = c.ctx;
        ctx.save(); ctx.strokeStyle = '#a86a00'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#a86a00'; ctx.font = '600 11px Segoe UI, system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('Target ' + T, a.right - 4, y - 6); ctx.restore();
      }
    };
    chart($('#ratioChart'), {
      type: 'bar',
      data: { labels: hist.map(function (x) { return x.hour + ':00'; }), datasets: [{ data: hist.map(function (x) { return x.ratio; }), backgroundColor: hist.map(function (x) { return x.ratio > T ? '#c0392b' : '#2a78d6'; }), borderRadius: 4, maxBarThickness: 34 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.raw.toFixed(2) + ' orders per staff member'; } } } },
        scales: { y: { beginAtZero: true, suggestedMax: 2.6, grid: { color: gridColor } }, x: { grid: { display: false } } } },
      plugins: [thresholdPlugin]
    });
    chart($('#schedChart'), {
      type: 'bar',
      data: { labels: hist.map(function (x) { return x.hour + ':00'; }), datasets: [
        { label: 'Now', data: hist.map(function (x) { return x.now; }), backgroundColor: '#9aa3b2', borderRadius: 4, maxBarThickness: 18 },
        { label: 'Suggested', data: hist.map(function (x) { return x.suggested; }), backgroundColor: '#2a78d6', borderRadius: 4, maxBarThickness: 18 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, boxHeight: 12 } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Staff on shift' }, grid: { color: gridColor } }, x: { grid: { display: false } } } }
    });
  };

  // ---------------------------------------------------------------- PROFIT TRACKER (owner)
  var profitDim = 'brand';
  VIEWS.profit = function (main) {
    var rows = GK.profitBy(profitDim).sort(function (a, b) { return b.avg - a.avg; });
    var plat = GK.profitBy('platform');
    var get = function (k) { return plat.find(function (p) { return p.key === k; }); };
    var phone = get('Phone/Text'), app2 = get('Delivery App 2');
    var best = rows[0], worst = rows[rows.length - 1];
    var dimName = { brand: 'brand', platform: 'channel', item: 'menu item' }[profitDim];
    main.innerHTML = head('PROFIT TRACKER', 'Where the money is really made', 'Profit per order after platform commission and food cost (31.5% of subtotal). Owner only.') +
      '<div class="seg" role="tablist">' + [['brand', 'By brand'], ['platform', 'By channel'], ['item', 'By menu item']].map(function (d) { return '<button data-d="' + d[0] + '" class="' + (d[0] === profitDim ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') + '</div>' +
      '<div class="grid g2 mt">' +
      ' <div class="alert good"><div class="ai">' + ic('up') + '</div><div class="grow"><b>Best ' + dimName + ': ' + h(best.key) + '</b>' + money(best.avg) + ' profit per order, ' + best.margin.toFixed(1) + '% margin</div></div>' +
      ' <div class="alert warn"><div class="ai">' + ic('down') + '</div><div class="grow"><b>Weakest ' + dimName + ': ' + h(worst.key) + '</b>' + money(worst.avg) + ' profit per order, ' + worst.margin.toFixed(1) + '% margin</div></div>' +
      '</div>' +
      '<div class="grid g-side mt-lg">' +
      ' <div class="card card-pad"><h2>Profit per order over the year, by ' + dimName + '</h2><p class="sub">' + (profitDim === 'item' ? 'Top 3 items (solid) and bottom 3 items (dashed). ' : '') + '3-month average. Higher line = more profit kept from each order.</p><div class="chart-box tall"><canvas id="profitChart"></canvas></div></div>' +
      ' <div class="card card-pad"><h2>What if more orders came direct?</h2><p class="sub">Phone/text orders pay no commission. Move a share of Delivery App 2 orders to phone/text and see the yearly gain.</p>' +
      '  <label class="f" for="shift">Share of Delivery App 2 orders moved: <b id="shiftV">10%</b></label><input type="range" id="shift" min="0" max="50" step="5" value="10">' +
      '  <div class="whatif-out" id="gain"></div><p class="sub" id="gainNote" style="margin-top:4px"></p></div>' +
      '</div>' +
      '<div class="card mt-lg"><div class="table-wrap"><table class="t"><thead><tr><th>' + dimName.charAt(0).toUpperCase() + dimName.slice(1) + '</th><th class="n">Orders</th><th class="n">Revenue</th><th class="n">Commission</th><th class="n">Food cost</th><th class="n">Profit</th><th class="n">Profit / order</th><th class="n">Margin</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + (profitDim === 'brand' ? brandTag(r.key) : h(r.key)) + '</td><td class="n">' + r.orders.toLocaleString() + '</td><td class="n">' + money0(r.revenue) + '</td><td class="n">' + money0(r.commission) + '</td><td class="n">' + money0(r.food) + '</td><td class="n">' + money0(r.profit) + '</td><td class="n"><b>' + money(r.avg) + '</b></td><td class="n">' + r.margin.toFixed(1) + '%</td></tr>'; }).join('') +
      '</tbody></table></div></div>';

    $$('.seg button').forEach(function (b) { b.addEventListener('click', function () { profitDim = b.getAttribute('data-d'); route(); }); });
    function gain() {
      var pctMoved = +$('#shift').value;
      var moved = Math.round(app2.orders * pctMoved / 100);
      var g = moved * (phone.avg - app2.avg);
      $('#shiftV').textContent = pctMoved + '%';
      $('#gain').textContent = '+' + money0(g) + ' a year';
      $('#gainNote').textContent = moved.toLocaleString() + ' orders x ' + money(phone.avg - app2.avg) + ' more profit each (' + money(phone.avg) + ' phone/text vs ' + money(app2.avg) + ' Delivery App 2).';
    }
    gain();
    $('#shift').addEventListener('input', gain);
    var trend = GK.profitTrend(profitDim);
    // 3-month rolling average so the lines show the trend instead of month-to-month noise
    var series = trend.series.map(function (x) {
      return { key: x.key, values: x.values.map(function (v, i) {
        var w = x.values.slice(Math.max(0, i - 2), i + 1).filter(function (y) { return y !== null; });
        return w.length ? GK.r2(w.reduce(function (a, b) { return a + b; }, 0) / w.length) : null;
      }) };
    });
    if (profitDim === 'item') {
      var order = rows.map(function (r) { return r.key; });
      var pick = order.slice(0, 3).concat(order.slice(-3));
      series = series.filter(function (x) { return pick.indexOf(x.key) >= 0; }).sort(function (a, b) { return pick.indexOf(a.key) - pick.indexOf(b.key); });
    } else {
      series = series.filter(function (x) { return x.values.some(function (v) { return v !== null; }); }).sort(function (a, b) { return rows.findIndex(function (r) { return r.key === a.key; }) - rows.findIndex(function (r) { return r.key === b.key; }); });
    }
    var LINE = ['#1f8a4c', '#2a78d6', '#eb6834', '#8a6bbf', '#c0392b', '#a86a00'];
    var CH = { 'Phone/Text': '#e8a33d', 'Delivery App 1': '#5b6b8c', 'Delivery App 2': '#8a6bbf', 'Brand Website': '#7a3fb0' };
    chart($('#profitChart'), {
      type: 'line',
      data: { labels: trend.months.map(function (x) { return MONTHS[+x.slice(5) - 1]; }), datasets: series.map(function (x, i) {
        var col = profitDim === 'brand' ? BRAND_COLORS[BRAND_IDX[x.key]] : profitDim === 'platform' ? (CH[x.key] || LINE[i]) : LINE[i];
        return { label: x.key, data: x.values, borderColor: col, backgroundColor: col, borderWidth: 2.5, tension: .4, pointRadius: 3, spanGaps: true,
          borderDash: profitDim === 'item' && i >= 3 ? [6, 4] : [] };
      }) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + money(c.raw) + ' per order'; } } } },
        scales: { y: { ticks: { callback: function (v) { return '$' + v; } }, grid: { color: gridColor }, title: { display: true, text: 'Profit per order' } }, x: { grid: { display: false } } } }
    });
  };


  // ---------------------------------------------------------------- KPIs (owner)
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function targetLine(value, label, color, below) {
    return { id: 'tgt', afterDatasetsDraw: function (c) {
      var y = c.scales.y.getPixelForValue(value), a = c.chartArea, ctx = c.ctx;
      ctx.save(); ctx.strokeStyle = color; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = '600 11px Segoe UI, system-ui, sans-serif'; ctx.fillText(label, a.left + 4, below ? y + 14 : y - 6); ctx.restore();
    } };
  }
  VIEWS.kpis = function (main) {
    var k = GK.kpis();
    var T = CFG.KPI_TARGETS;
    var m = GK.monthlyKpis();
    var defs = [
      ['accuracy', 'Order Accuracy Rate', '%', T.accuracy, true],
      ['profit_after_refunds', 'Avg Profit per Order (after refunds)', '$', T.profit_after_refunds, true],
      ['peak_staffing_ratio', 'Peak Staffing Ratio', '', T.peak_staffing_ratio, false],
      ['prep_variance', 'Prep-Time Variance', ' min', T.prep_variance, false],
      ['rating', 'Customer Rating', '', T.rating, true],
      ['refund_rate', 'Refund Rate', '%', T.refund_rate, false]
    ];
    function fmt(v, u) { return u === '$' ? '$' + v.toFixed(2) : v.toFixed(u === '%' ? 1 : 2) + u; }
    main.innerHTML = head('KPIS', 'The 6 KPIs', 'Each KPI against its target, and how it moved month by month in 2025 (before the app).',
      '<a class="btn amber" href="' + h(CFG.DASHBOARD_URL) + '" target="_blank" rel="noopener">Open Before vs After dashboard &rarr;</a>') +
      '<div class="grid g3">' + kpiTiles(k, ['accuracy', 'profit_after_refunds', 'peak_staffing_ratio', 'prep_variance', 'rating', 'refund_rate']) + '</div>' +
      '<div class="grid g3 mt-lg">' + defs.map(function (d, i) {
        return '<div class="card card-pad"><h2>' + d[1] + '</h2><p class="sub">By month &middot; dashed line = target (' + fmt(d[3], d[2]) + ', ' + (d[4] ? 'higher is better' : 'lower is better') + ')</p><div class="chart-box"><canvas id="kc' + i + '"></canvas></div></div>';
      }).join('') + '</div>';
    defs.forEach(function (d, i) {
      var vals = m.map(function (x) { return x[d[0]]; });
      var all = vals.concat([d[3]]);
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      var good = vals.map(function (v) { return d[4] ? v >= d[3] : v <= d[3]; });
      chart($('#kc' + i), {
        type: 'line',
        data: { labels: m.map(function (x) { return MONTHS[+x.month.slice(5) - 1].charAt(0); }), datasets: [{ data: vals, borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,.10)', fill: true, borderWidth: 2.5, tension: .4,
          pointRadius: 4, pointBackgroundColor: good.map(function (g) { return g ? '#1f8a4c' : '#c0392b'; }), pointBorderColor: '#fff', pointBorderWidth: 1.5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return fmt(c.raw, d[2]); } } } },
          scales: { y: { suggestedMin: lo, suggestedMax: hi, grace: '12%', ticks: { callback: function (v) { var t = +v.toFixed(2); return d[2] === '$' ? '$' + t : d[2] === '%' ? t + '%' : t; }, maxTicksLimit: 5 }, grid: { color: gridColor } }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 } } } } },
        plugins: [targetLine(d[3], 'Target', '#a86a00', !d[4])]
      });
    });
  };

  // ================================================================ CUSTOMER UI (brand websites)
  // What a customer sees. Each brand has its own storefront, so customers still see three separate
  // restaurants. Every checkout is saved through GK.placeWebOrder(), which turns each cart line into
  // a standard order row. That is how the data from this screen reaches the Order Hub, Packing Check,
  // Profit Tracker and KPIs on the staff side.
  var SHOP = [
    { tag: 'Pizza, knots and Italian sweets, made to order', c: '#b23a2e', bg: '#fbf4e8', ink: '#5a1d16', font: 'Georgia, "Times New Roman", serif' },
    { tag: 'Street-food flavours, served in a bowl', c: '#d9711c', bg: '#fff6ea', ink: '#5c2f07', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
    { tag: 'Smash burgers, crispy sides and thick shakes', c: '#1d1d1d', bg: '#f6f5ef', ink: '#1d1d1d', accent: '#f2b134', font: 'Impact, "Arial Narrow", "Segoe UI", sans-serif' }
  ];
  // original brand marks (simple SVG logos made for the prototype)
  var BRAND_MARK = [
    '<svg viewBox="0 0 64 64" class="mark" role="img" aria-label="Nonna\'s Slice House logo"><circle cx="32" cy="32" r="31" fill="#b23a2e"/><circle cx="32" cy="32" r="27" fill="none" stroke="#f6e7cf" stroke-width="1.5" stroke-dasharray="2 3"/><path d="M15 21 Q32 13 49 21 L32 52 Z" fill="#f6d38b"/><path d="M15 21 Q32 13 49 21 L47.4 24 Q32 17 16.6 24 Z" fill="#d98a3a"/><circle cx="27" cy="29" r="3.2" fill="#b23a2e"/><circle cx="37" cy="31" r="3.2" fill="#b23a2e"/><circle cx="31.5" cy="40" r="2.8" fill="#b23a2e"/><path d="M24 35 l2-1 M39 25 l1.5 1.5" stroke="#3f7a3a" stroke-width="2" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 64 64" class="mark" role="img" aria-label="Bombay Street Bowls logo"><circle cx="32" cy="32" r="31" fill="#d9711c"/><path d="M24 14 q3 4 0 8 M32 12 q3 5 0 10 M40 14 q3 4 0 8" stroke="#fff3e0" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M12 30 h40 a20 20 0 0 1 -40 0 z" fill="#fff3e0"/><path d="M12 30 h40" stroke="#7a3a08" stroke-width="2.5" stroke-linecap="round"/><path d="M18 34 q14 6 28 0" stroke="#e9a04b" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="38" r="1.8" fill="#3f7a3a"/><circle cx="34" cy="40" r="1.8" fill="#3f7a3a"/><circle cx="42" cy="36" r="1.6" fill="#b23a2e"/></svg>',
    '<svg viewBox="0 0 64 64" class="mark" role="img" aria-label="Flame and Bun logo"><circle cx="32" cy="32" r="31" fill="#1d1d1d"/><path d="M32 8 c5 6 9 9 6 15 c3-1 4-3 4-5 c4 5 3 12-3 15 h-14 c-6-3-6-10-2-14 c0 3 2 4 3 4 c-2-6 2-10 6-15 z" fill="#f2b134"/><path d="M32 18 c2 3 4 5 2 9 h-4 c-2-3 0-6 2-9 z" fill="#e8562a"/><path d="M14 40 a18 10 0 0 1 36 0 z" fill="#e7a43c"/><circle cx="25" cy="36" r="1" fill="#fff3d6"/><circle cx="32" cy="34" r="1" fill="#fff3d6"/><circle cx="39" cy="36" r="1" fill="#fff3d6"/><rect x="13" y="41" width="38" height="5" rx="2.5" fill="#6b3a1f"/><path d="M14 48 h36 a4 4 0 0 1 -4 5 h-28 a4 4 0 0 1 -4 -5 z" fill="#e7a43c"/></svg>'
  ];
  var DESC = {
    'Margherita Pizza': 'Tomato, mozzarella and fresh basil on a thin, chewy base.',
    'Pepperoni Pizza': 'Loaded with pepperoni and a three-cheese blend.',
    'Garlic Knots': 'Six knots brushed with garlic butter and parsley.',
    'Caesar Salad': 'Crisp romaine, parmesan, croutons and house dressing.',
    'Tiramisu': 'Coffee-soaked sponge layered with mascarpone cream.',
    'Italian Soda': 'Sparkling soda with your choice of fruit syrup.',
    'Chicken Tikka Bowl': 'Charred chicken tikka over cumin rice with pickled onions.',
    'Paneer Tikka Bowl': 'Grilled paneer, peppers and mint chutney over rice.',
    'Vegetable Biryani': 'Fragrant basmati with spiced vegetables and raita.',
    'Samosas': 'Two crisp pastries filled with spiced potato and peas.',
    'Gulab Jamun': 'Warm milk dumplings in cardamom syrup.',
    'Mango Lassi': 'Chilled yoghurt and mango smoothie.',
    'Classic Cheeseburger': 'Smashed beef patty, cheddar, pickles and house sauce.',
    'Bacon Bun Deluxe': 'Double cheese, crispy bacon and caramelised onions.',
    'Double Stack Burger': 'Two smashed patties, two cheeses, all the sauce.',
    'Loaded Fries': 'Fries topped with cheese sauce, jalapenos and scallions.',
    'Onion Rings': 'Beer-battered and golden, with dipping sauce.',
    'Milkshake': 'Thick vanilla, chocolate or strawberry shake.'
  };
  // photos supplied by the team (the .jpg files); dishes without a photo show a food icon
  var DISH_IMG = {
    'Chicken Tikka Bowl': 'chicken-tikka-bowl.jpg', 'Vegetable Biryani': 'vegetable-biryani.jpg', 'Gulab Jamun': 'gulab-jamun.jpg',
    'Classic Cheeseburger': 'cheeseburger.jpg', 'Bacon Bun Deluxe': 'cheeseburger.jpg', 'Double Stack Burger': 'cheeseburger.jpg',
    'Loaded Fries': 'loaded-fries.jpg', 'Milkshake': 'milkshake.jpg',
    'Margherita Pizza': 'margherita-pizza.jpg', 'Garlic Knots': 'garlic-knots.jpg', 'Tiramisu': 'tiramisu.jpg'
  };
  var BANNER = { 0: 'banner-nonna.jpg', 1: 'banner-bombay.jpg', 2: 'banner-flame.jpg' };
  function dishPic(name, fallback) {
    return DISH_IMG[name] ? '<img src="' + DISH_IMG[name] + '" alt="' + h(name) + '" loading="lazy">' : '<span class="dish-mark">' + fallback + '</span>';
  }
  var CAT_ORDER = ['Entree', 'Side', 'Dessert', 'Beverage'];
  var CAT_NAME = { Entree: 'Mains', Side: 'Sides', Dessert: 'Desserts', Beverage: 'Drinks' };
  var CART_KEY = 'gk_cart';
  function getCart() { try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || getCart._m || {}; } catch (e) { return getCart._m || {}; } }
  function setCart(c) { getCart._m = c; try { sessionStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } }
  function cartFor(bi) { var c = getCart(); return c.brand === bi ? c : { brand: bi, lines: {}, fulfilment: 'Delivery', name: '', note: '' }; }
  function cartLines(c) {
    var b = S.brands[c.brand];
    return Object.keys(c.lines).filter(function (k) { return c.lines[k] > 0; }).map(function (k) {
      var m = S.menu[b].find(function (x) { return x[0] === k; });
      return { item: k, qty: c.lines[k], price: m[2], total: GK.r2(m[2] * c.lines[k]) };
    });
  }
  function cartTotals(c) {
    var lines = cartLines(c);
    var sub = GK.r2(lines.reduce(function (a, l) { return a + l.total; }, 0));
    var fee = c.fulfilment === 'Delivery' && lines.length ? GK.DELIVERY_FEE : 0;
    return { lines: lines, count: lines.reduce(function (a, l) { return a + l.qty; }, 0), sub: sub, fee: fee, total: GK.r2(sub + fee) };
  }
  function shopTheme(bi) {
    var t = SHOP[bi];
    return '--sc:' + t.c + ';--sbg:' + t.bg + ';--sink:' + t.ink + ';--sacc:' + (t.accent || t.c) + ';--sfont:' + t.font;
  }
  function protoBar(extra) {
    return '<div class="proto-bar"><span>' + ic('info') + ' Customer view (prototype). Orders placed here appear live in the staff app.</span>' +
      '<span class="btn-row">' + (extra || '') + '<a href="#/shop">All 3 brand sites</a><a href="#/login">Staff sign-in</a></span></div>';
  }

  function renderShop(parts) {
    document.title = 'Order online';
    if (!parts.length) return shopHome();
    if (parts[0] === 'order') return shopTrack(parts[1]);
    var bi = +parts[0];
    if (!(bi >= 0 && bi < S.brands.length)) { location.hash = '#/shop'; return; }
    document.title = S.brands[bi] + ' | Order online';
    if (parts[1] === 'checkout') return shopCheckout(bi);
    return shopMenu(bi);
  }

  function shopHome() {
    root.innerHTML = protoBar() +
      '<div class="shop-home"><div class="shop-home-in">' +
      '<p class="crumb">CUSTOMER INTERFACE</p><h1>Order direct from our brands</h1>' +
      '<p class="sub">In real life each brand has its own website and customers never see the shared kitchen. For the prototype the three sites are listed side by side so they are easy to test.</p>' +
      '<div class="grid g3 mt-lg">' + S.brands.map(function (b, i) {
        var t = SHOP[i];
        return '<a class="shop-pick" href="#/shop/' + i + '" style="' + shopTheme(i) + '"><div class="sp-top"' + (BANNER[i] ? ' style="background-image:url(' + BANNER[i] + ')"' : '') + '>' + (BANNER[i] ? '' : '<span class="sp-ico">' + BRAND_MARK[i] + '</span>') + '</div>' +
          '<div class="sp-body"><b>' + h(b) + '</b><span>' + t.tag + '</span><span class="sp-go">View menu &rarr;</span></div></a>';
      }).join('') + '</div>' +
      '<div class="card card-pad mt-lg"><h2>What happens when you order</h2><div class="flow mt">' +
      '<div class="step"><span class="k">1 CUSTOMER</span><b>Picks food and pays</b><span>On the brand website, by card (demo payment)</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">2 STANDARDIZE</span><b>Saved as order rows</b><span>Same 10 fields as every other channel</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">3 KITCHEN</span><b>Order Hub + Packing Check</b><span>Staff see it instantly and check it before it leaves</span></div><div class="arrow">&rarr;</div>' +
      '<div class="step"><span class="k">4 CUSTOMER</span><b>Live order status</b><span>Received, being checked, on its way</span></div></div></div>' +
      '</div></div>';
  }

  function shopHeader(bi, right) {
    var t = SHOP[bi];
    return '<header class="shop-head"><div class="shop-head-in"><a class="shop-logo" href="#/shop/' + bi + '"><span class="sl-ico">' + BRAND_MARK[bi] + '</span>' + h(S.brands[bi]) + '</a>' + (right || '') + '</div></header>';
  }

  function shopMenu(bi) {
    var b = S.brands[bi], t = SHOP[bi];
    var c = cartFor(bi);
    root.innerHTML = '<div class="shop" style="' + shopTheme(bi) + '">' + protoBar() + shopHeader(bi, '<a class="shop-cart-link" href="#cartBox" id="cartJump">' + ic('cart') + ' <span id="cartN">0</span></a>') +
      '<section class="shop-hero"><div class="shop-head-in hero-in"><div class="hero-txt"><h1>' + h(b) + '</h1><p>' + t.tag + '</p>' +
      '<div class="hero-chips"><span>' + ic('clock') + ' About ' + (S.prep_by_category.Entree + (S.brand_prep_adjust[b] || 0)) + ' min to prepare</span><span>' + ic('truck') + ' Delivery ' + money(GK.DELIVERY_FEE) + '</span><span>' + ic('store') + ' Free pickup</span></div></div>' + (BANNER[bi] ? '<img class="hero-img" src="' + BANNER[bi] + '" alt="">' : '<div class="hero-img hero-ico">' + BRAND_MARK[bi] + '</div>') + '</div></section>' +
      '<div class="shop-body"><div class="shop-menu">' +
      CAT_ORDER.map(function (cat) {
        var items = S.menu[b].filter(function (m) { return m[1] === cat; });
        if (!items.length) return '';
        return '<h2 class="shop-cat">' + CAT_NAME[cat] + '</h2><div class="dish-grid">' + items.map(function (m) {
          return '<div class="dish"><div class="dish-pic">' + dishPic(m[0], BRAND_MARK[bi]) + '</div><div class="dish-txt"><b>' + h(m[0]) + '</b><span>' + h(DESC[m[0]] || '') + '</span><em>' + money(m[2]) + '</em></div>' +
            '<div class="qty-ctl" data-item="' + h(m[0]) + '"></div></div>';
        }).join('') + '</div>';
      }).join('') +
      '</div><aside class="shop-cart" id="cartBox"></aside></div>' +
      '<div class="cart-bar" id="cartBar"></div></div>';

    function drawQty() {
      $$('.qty-ctl').forEach(function (el) {
        var it = el.getAttribute('data-item'), q = c.lines[it] || 0;
        el.innerHTML = q ? '<button data-d="-1" aria-label="Remove one ' + h(it) + '">&minus;</button><output>' + q + '</output><button data-d="1" aria-label="Add one more ' + h(it) + '">+</button>'
          : '<button class="add" data-d="1">Add</button>';
      });
    }
    function drawCart() {
      var tt = cartTotals(c);
      $('#cartN').textContent = tt.count;
      $('#cartBox').innerHTML = '<h2>Your order</h2>' +
        (tt.lines.length ? '<ul class="cart-lines">' + tt.lines.map(function (l) { return '<li><span>' + l.qty + ' &times; ' + h(l.item) + '</span><b>' + money(l.total) + '</b></li>'; }).join('') + '</ul>'
          : '<p class="sub">Your basket is empty. Add something tasty from the menu.</p>') +
        '<div class="seg full" role="tablist">' + ['Delivery', 'Pickup'].map(function (f) { return '<button data-f="' + f + '" class="' + (c.fulfilment === f ? 'on' : '') + '">' + f + '</button>'; }).join('') + '</div>' +
        '<div class="cart-sum"><div><span>Subtotal</span><b>' + money(tt.sub) + '</b></div><div><span>' + (c.fulfilment === 'Delivery' ? 'Delivery fee' : 'Pickup') + '</span><b>' + (tt.fee ? money(tt.fee) : 'Free') + '</b></div><div class="tot"><span>Total</span><b>' + money(tt.total) + '</b></div></div>' +
        '<a class="btn shop-btn big' + (tt.lines.length ? '' : ' disabled') + '" href="' + (tt.lines.length ? '#/shop/' + bi + '/checkout' : '#') + '" id="toCheckout">Go to checkout</a>';
      $('#cartBar').innerHTML = tt.lines.length ? '<a class="btn shop-btn big" href="#/shop/' + bi + '/checkout">View basket &middot; ' + tt.count + ' item' + (tt.count === 1 ? '' : 's') + ' &middot; ' + money(tt.total) + '</a>' : '';
      $$('#cartBox .seg button').forEach(function (x) { x.addEventListener('click', function () { c.fulfilment = x.getAttribute('data-f'); setCart(c); drawCart(); }); });
      var tc = $('#toCheckout'); tc.addEventListener('click', function (e) { if (!tt.lines.length) e.preventDefault(); });
    }
    if (root._sc) root.removeEventListener('click', root._sc);
    root._sc = function (e) {
      var btn = e.target.closest('.qty-ctl button'); if (!btn) return;
      var it = btn.parentNode.getAttribute('data-item');
      c.lines[it] = Math.max(0, Math.min(20, (c.lines[it] || 0) + (+btn.getAttribute('data-d'))));
      if (!c.lines[it]) delete c.lines[it];
      setCart(c); drawQty(); drawCart();
    };
    root.addEventListener('click', root._sc);
    $('#cartJump').addEventListener('click', function (e) { e.preventDefault(); $('#cartBox').scrollIntoView({ behavior: 'smooth' }); });
    drawQty(); drawCart();
    window.scrollTo(0, 0);
  }

  function shopCheckout(bi) {
    var c = cartFor(bi), tt = cartTotals(c);
    if (!tt.lines.length) { location.hash = '#/shop/' + bi; return; }
    root.innerHTML = '<div class="shop" style="' + shopTheme(bi) + '">' + protoBar() + shopHeader(bi, '<a class="shop-back" href="#/shop/' + bi + '">&larr; Back to menu</a>') +
      '<div class="shop-body co"><div>' +
      ' <div class="card card-pad"><h2>1. Your details</h2>' +
      '  <div class="form-grid mt"><div><label class="f" for="cName">First name</label><input id="cName" type="text" maxlength="24" autocomplete="off" placeholder="So we can label your bag" value="' + h(c.name) + '"></div>' +
      '  <div><label class="f">Delivery or pickup</label><div class="seg full" id="cFul">' + ['Delivery', 'Pickup'].map(function (f) { return '<button data-f="' + f + '" class="' + (c.fulfilment === f ? 'on' : '') + '">' + f + '</button>'; }).join('') + '</div></div>' +
      '  <div style="grid-column:1/-1"><label class="f" for="cNote">Special request (optional)</label><input id="cNote" type="text" maxlength="80" placeholder="e.g. no onions, extra napkins" value="' + h(c.note) + '"></div></div>' +
      '  <p class="sub mt" style="margin-bottom:0">Prototype: no address or phone number is collected. A real version would ask for an address for delivery.</p></div>' +
      ' <div class="card card-pad mt-lg pay-card"><div class="pay-head"><h2>2. Payment</h2><span class="pay-badge">' + ic('lock') + ' PayDemo sandbox</span></div>' +
      '  <div class="demo-note">Demo payment gateway. No money moves and no card details are saved. Only the test card below is accepted.</div>' +
      '  <div class="form-grid mt"><div style="grid-column:1/-1"><label class="f" for="pCard">Card number</label><input id="pCard" type="text" inputmode="numeric" autocomplete="off" value="4242 4242 4242 4242"></div>' +
      '  <div><label class="f" for="pExp">Expiry</label><input id="pExp" type="text" autocomplete="off" value="12 / 28"></div><div><label class="f" for="pCvc">CVC</label><input id="pCvc" type="text" inputmode="numeric" autocomplete="off" value="123"></div></div>' +
      '  <div id="payErr" class="alert bad mt hidden"><div class="ai">' + ic('alert') + '</div><div id="payErrT"></div></div>' +
      '  <button class="btn shop-btn big mt" id="payBtn" style="width:100%">Pay ' + money(tt.total) + '</button>' +
      '  <p class="sub" style="margin:10px 0 0;font-size:12.5px">In a real version this step is handed to a payment provider\'s secure page, so card numbers never touch our app.</p></div>' +
      '</div><aside class="shop-cart"><h2>Order summary</h2><ul class="cart-lines">' + tt.lines.map(function (l) { return '<li><span>' + l.qty + ' &times; ' + h(l.item) + '</span><b>' + money(l.total) + '</b></li>'; }).join('') + '</ul>' +
      '<div class="cart-sum" id="coSum"></div></aside></div></div>';
    function sum() {
      var x = cartTotals(c);
      $('#coSum').innerHTML = '<div><span>Subtotal</span><b>' + money(x.sub) + '</b></div><div><span>' + (c.fulfilment === 'Delivery' ? 'Delivery fee' : 'Pickup') + '</span><b>' + (x.fee ? money(x.fee) : 'Free') + '</b></div><div class="tot"><span>Total</span><b>' + money(x.total) + '</b></div>';
      $('#payBtn').textContent = 'Pay ' + money(x.total);
    }
    sum();
    $$('#cFul button').forEach(function (x) { x.addEventListener('click', function () { c.fulfilment = x.getAttribute('data-f'); $$('#cFul button').forEach(function (y) { y.classList.toggle('on', y === x); }); setCart(c); sum(); }); });
    $('#cName').addEventListener('input', function (e) { c.name = e.target.value; setCart(c); });
    $('#cNote').addEventListener('input', function (e) { c.note = e.target.value; setCart(c); });
    function fail(msg) { $('#payErrT').textContent = msg; $('#payErr').classList.remove('hidden'); }
    $('#payBtn').addEventListener('click', function () {
      $('#payErr').classList.add('hidden');
      var name = $('#cName').value.trim();
      if (!name) { $('#cName').focus(); return fail('Please enter a first name so the kitchen can label your bag.'); }
      if ($('#pCard').value.replace(/\D/g, '') !== '4242424242424242') return fail('Demo mode only accepts the test card 4242 4242 4242 4242.');
      var b = $('#payBtn'); b.disabled = true; b.textContent = 'Processing payment...';
      setTimeout(function () {
        var w = GK.placeWebOrder({ brand: S.brands[bi], lines: cartTotals(c).lines.map(function (l) { return { item: l.item, qty: l.qty }; }),
          customer: name, note: $('#cNote').value.trim(), fulfilment: c.fulfilment, last4: '4242' });
        setCart({});
        location.hash = '#/shop/order/' + w.ref;
      }, 900);
    });
    window.scrollTo(0, 0);
  }

  function shopTrack(ref) {
    var w = GK.webOrder(ref);
    if (!w) { root.innerHTML = protoBar() + '<div class="shop-home"><div class="shop-home-in"><div class="card lockscreen"><div class="big">' + ic('search') + '</div><h2>Order not found</h2><p class="sub">This order was placed in a different browser, or the demo data was reset.</p><a class="btn" href="#/shop">Back to the brand sites</a></div></div></div>'; return; }
    var bi = BRAND_IDX[w.brand];
    var last = w.fulfilment === 'Pickup' ? 'Ready for pickup' : 'On its way';
    var stages = ['Order received', 'Being packed and checked', last];
    var eta = w.readyMins + (w.fulfilment === 'Delivery' ? 15 : 0);
    root.innerHTML = '<div class="shop" style="' + shopTheme(bi) + '">' + protoBar() + shopHeader(bi, '<a class="shop-back" href="#/shop/' + bi + '">Order again</a>') +
      '<div class="shop-body co"><div>' +
      ' <div class="card card-pad track"><p class="crumb">ORDER ' + h(w.ref) + '</p><h1>Thanks, ' + h(w.customer) + '! ' + (w.stage === 2 ? (w.fulfilment === 'Pickup' ? 'Your order is ready.' : 'Your order is on its way.') : 'Your order is in the kitchen.') + '</h1>' +
      '  <p class="sub">' + (w.stage === 2 ? 'It passed the packing check, so everything you ordered is in the bag.' : (w.fulfilment === 'Pickup' ? 'Ready in about ' : 'Arrives in about ') + eta + ' minutes. Every item is checked before it leaves.') + '</p>' +
      '  <ol class="stages">' + stages.map(function (s, i) { var done = i < w.stage || w.stage === 2; return '<li class="' + (done ? 'done' : i === w.stage ? 'now' : '') + '"><span class="dot">' + (done ? ic('check') : i + 1) + '</span>' + s + '</li>'; }).join('') + '</ol>' +
      '  <div class="btn-row mt"><button class="btn" id="refresh">Refresh status</button></div></div>' +
      ' <div class="card card-pad mt-lg behind"><h2>Behind the scenes</h2><p class="sub">This is the data the customer screen just sent to the kitchen app. Each basket line became one standard order row.</p>' +
      '  <div class="table-wrap"><table class="t"><thead><tr><th>Order row</th><th>Channel</th><th>Item</th><th class="n">Subtotal</th><th class="n">Card fee</th><th>Status in kitchen</th></tr></thead><tbody>' +
      w.rows.map(function (o) { return '<tr><td class="nw"><b>' + o.id + '</b></td><td class="nw">' + h(o.platform) + '</td><td class="nw">' + o.qty + ' x ' + h(o.item) + '</td><td class="n">' + money(o.subtotal) + '</td><td class="n">' + money(o.commission) + '</td><td><span class="pill ' + (o.status === 'Waiting for packing check' ? 'warn' : o.status === 'Sent' ? 'good' : 'bad') + '">' + h(o.status) + '</span></td></tr>'; }).join('') +
      '  </tbody></table></div>' +
      '  <div class="btn-row mt"><a class="btn primary" href="#/orders" id="toHub">Open it in the staff Order Hub</a><a class="btn" href="#/packing">Go to Packing Check</a></div></div>' +
      '</div><aside class="shop-cart"><h2>Receipt</h2><ul class="cart-lines">' + w.lines.map(function (l) { return '<li><span>' + l.qty + ' &times; ' + h(l.item) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="cart-sum"><div><span>Subtotal</span><b>' + money(w.subtotal) + '</b></div><div><span>' + (w.fulfilment === 'Delivery' ? 'Delivery fee' : 'Pickup') + '</span><b>' + (w.deliveryFee ? money(w.deliveryFee) : 'Free') + '</b></div><div class="tot"><span>Paid</span><b>' + money(w.total) + '</b></div></div>' +
      '<p class="sub" style="margin:12px 0 0;font-size:13px">Card ending ' + h(w.last4) + ' &middot; ' + h(w.payRef) + ' (demo)' + (w.note ? '<br>Request: ' + h(w.note) : '') + '</p></aside></div></div>';
    $('#refresh').addEventListener('click', function () { GK.reloadFromStorage(); route(); });
    $('#toHub').addEventListener('click', function () { hubState = { channel: GK.WEB, brand: '', status: '', q: w.ref, page: 0 }; });
    window.scrollTo(0, 0);
  }

  // Live updates between tabs: when a customer pays in one tab, the staff tab refreshes and says so.
  var seenWeb = GK.state().webOrders.length;
  window.addEventListener('storage', function (e) {
    if (e.key !== GK.KEY) return;
    var before = seenWeb;
    var st = GK.reloadFromStorage();
    seenWeb = st.webOrders.length;
    var page = location.hash.replace(/^#\/?/, '');
    if (modalRoot.innerHTML) return;
    if (page.indexOf('shop/order/') === 0) { route(); return; }
    if (st.webOrders.length > before && getRole() && page.indexOf('shop') !== 0) {
      var w = st.webOrders[0];
      if (page === 'packing' && $$('.ck.on').length) { toast('New customer order ' + w.ref + ' from the ' + w.brand + ' website.'); return; }
      route();
      toast('New customer order ' + w.ref + ' from the ' + w.brand + ' website.');
    }
  });

  route();
})();
