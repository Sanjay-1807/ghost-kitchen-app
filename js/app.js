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

  // ---------------------------------------------------------------- routing
  var NAV = [
    { id: 'home', label: 'Home', ico: '&#8962;' },
    { id: 'orders', label: 'Order Hub', ico: '&#9776;' },
    { id: 'packing', label: 'Packing Check', ico: '&#10003;' },
    { id: 'staffing', label: 'Staffing', ico: '&#9201;' },
    { id: 'profit', label: 'Profit Tracker', ico: '$', owner: true },
    { id: 'kpis', label: 'KPIs', ico: '&#9650;', owner: true },
    { id: 'guide', label: 'Guide', ico: '?' }
  ];
  var VIEWS = {};

  function route() {
    clearCharts();
    modalRoot.innerHTML = '';
    var page = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
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
      '   <p>Orders from both delivery apps and phone/text in one place, a packing check before every order leaves, staffing alerts for the rush, and true profit for the owner. Customers still see three separate brands.</p>' +
      '   <div class="flow-chips"><span>Delivery App 1</span><span>Delivery App 2</span><span>Phone / Text</span><span>&rarr; one order table</span></div></div>' +
      '  <div class="login-foot">MRP prototype &middot; synthetic data &middot; no real customer or payment data</div>' +
      ' </section>' +
      ' <section class="login-pick">' +
      '  <div><h2>Who is using the app?</h2><p class="sub">Pick a role to sign in. Each role sees a different set of screens.</p></div>' +
      '  <div class="name-field"><label for="nm">Your first name (optional)</label><input id="nm" type="text" maxlength="24" placeholder="e.g. Maria" autocomplete="off"></div>' +
      '  <button class="role-card" data-role="owner"><div class="role-icon owner">&#128202;</div><div><b>Owner</b><span class="desc">Everything, including profit by brand, item and platform, and the 6 KPIs.</span></div><span class="go">&rsaquo;</span></button>' +
      '  <button class="role-card" data-role="lead"><div class="role-icon lead">&#127859;</div><div><b>Shift Lead</b><span class="desc">Orders, packing check and staffing during service. No financial screens.</span></div><span class="go">&rsaquo;</span></button>' +
      '  <p class="proto-note">Prototype sign-in: no password needed. In the real version each person would log in with their own PIN, and the role would decide what they can see.</p>' +
      ' </section>' +
      '</div>';
    $$('.role-card').forEach(function (b) {
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
      var extra = n.owner && role.role !== 'owner' ? '<span class="lock">&#128274;</span>' : (n.id === 'packing' && pend ? '<span class="count">' + pend + '</span>' : '');
      return '<a class="nav-link' + (n.id === active ? ' active' : '') + '" href="#/' + n.id + '"><span class="ico">' + n.ico + '</span>' + n.label + extra + '</a>';
    }).join('');
    root.innerHTML =
      '<div class="topbar"><button id="menuBtn" aria-label="Open menu">&#9776;</button><b>GK Command Center</b></div>' +
      '<div class="shell">' +
      ' <aside class="side" id="side">' +
      '  <div class="logo"><div class="logo-mark">GK</div><div>Command Center<small>GHOST KITCHEN</small></div></div>' + links +
      '  <div class="side-foot"><div class="who"><div class="avatar">' + h(role.name.charAt(0).toUpperCase()) + '</div><div><b>' + h(role.name) + '</b><span>' + (role.role === 'owner' ? 'Owner' : 'Shift Lead') + '</span></div></div>' +
      '   <button class="side-btn" id="switchRole">&#8644;&nbsp; Switch role</button></div>' +
      ' </aside>' +
      ' <main class="main" id="main"></main>' +
      '</div>';
    $('#switchRole').addEventListener('click', function () { setRole(null); location.hash = '#/login'; });
    $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });
    $$('.nav-link').forEach(function (a) { a.addEventListener('click', function () { $('#side').classList.remove('open'); }); });
  }

  function head(crumb, title, sub, actions) {
    return '<div class="page-head"><div><p class="crumb">' + crumb + '</p><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="btn-row">' + actions + '</div>' : '') + '</div>';
  }

  function renderLocked(main, label) {
    main.innerHTML = '<div class="card lockscreen"><div class="big">&#128274;</div><h2>' + h(label) + ' is for the Owner only</h2>' +
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
    var firstVisit = !st.seenTour;

    main.innerHTML = head('HOME', greet + ', ' + h(role.name), role.role === 'owner' ? 'Here is how the whole kitchen is doing across all three brands.' : 'Here is what needs attention during service.') +
      (firstVisit ? '<div class="banner"><div style="font-size:26px">&#128075;</div><div class="grow"><b>New here? Take the 2-minute tour</b><p>The Guide walks you through each feature step by step.</p></div><a class="btn amber" href="#/guide" id="tourBtn">Open the Guide</a><button class="btn small" id="dismissTour" style="background:transparent;color:#fff;border-color:#3a4a6b">Dismiss</button></div>' : '') +
      '<div class="grid g2 mt">' +
      ' <div class="alert ' + level + '"><div class="ai">' + (level === 'bad' ? '&#9888;' : level === 'warn' ? '&#9203;' : '&#10004;') + '</div><div class="grow"><b>Staffing ' + (level === 'bad' ? 'alert' : level === 'warn' ? 'watch' : 'on track') + ' at ' + snap.hour + ':00' + (snap.demo ? ' (example rush)' : '') + '</b>' +
      snap.queue + ' orders waiting, ' + snap.staff + ' staff &middot; ratio ' + snap.ratio.toFixed(2) + (need ? ' &middot; call in ' + need + ' more' : '') + '</div><a class="btn small" href="#/staffing">Check staffing</a></div>' +
      ' <div class="alert ' + (pend.length ? 'warn' : 'good') + '"><div class="ai">&#128230;</div><div class="grow"><b>' + pend.length + ' order' + (pend.length === 1 ? '' : 's') + ' waiting for packing check</b>Tick every item before an order leaves.</div><a class="btn small" href="#/packing">Start checking</a></div>' +
      '</div>' +
      '<h2 class="mt-lg" style="font-size:17px;margin-bottom:10px">' + (role.role === 'owner' ? 'The 6 KPIs' : 'Service KPIs') + '</h2>' +
      '<div class="grid g3">' + kpiTiles(k, role.role === 'owner' ? ['accuracy', 'profit_after_refunds', 'peak_staffing_ratio', 'prep_variance', 'rating', 'refund_rate'] : ['accuracy', 'peak_staffing_ratio', 'prep_variance']) + '</div>' +
      '<div class="grid g-side mt-lg">' +
      ' <div class="card card-pad"><h2>How data flows through the app</h2><p class="sub">Every order, whatever the channel, ends up in the same standard format.</p>' + flowHtml() + '</div>' +
      ' <div class="card card-pad"><h2>Recent activity</h2><ul class="feed">' + st.activity.slice(0, 6).map(function (a) { return '<li><span class="t">' + timeAgo(a.t) + '</span><span>' + h(a.text) + '</span></li>'; }).join('') + '</ul></div>' +
      '</div>';
    var d = $('#dismissTour');
    if (d) d.addEventListener('click', function () { st.seenTour = true; try { localStorage.setItem('gk_command_center_v1', JSON.stringify(st)); } catch (e) { /* ignore */ } route(); });
    var t = $('#tourBtn'); if (t) t.addEventListener('click', function () { st.seenTour = true; try { localStorage.setItem('gk_command_center_v1', JSON.stringify(st)); } catch (e) { /* ignore */ } });
  };

  function flowHtml() {
    return '<div class="flow">' +
      '<div class="step"><span class="k">1 GATHER</span><b>3 order sources</b><span>App 1 CSV, App 2 dashboard, phone/text form</span></div><div class="arrow">&rarr;</div>' +
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
    main.innerHTML = head('ORDER HUB', 'All orders, one table', 'Delivery App 1, Delivery App 2 and phone/text orders, converted to the same standard fields.',
      '<button class="btn primary big" id="newOrder">+ New phone/text order</button>') +
      '<div class="grid g3">' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#5b6b8c"></span>Delivery App 1</b><span class="pill info">CSV export</span></div><div class="big">' + count('Delivery App 1').toLocaleString() + '</div><div class="how">Upload the CSV the app exports. Columns are matched to our fields automatically and bad rows are flagged.</div><button class="btn" id="importBtn">Import CSV</button></div>' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#8a6bbf"></span>Delivery App 2</b><span class="pill muted">No export</span></div><div class="big">' + count('Delivery App 2').toLocaleString() + '</div><div class="how">This app only shows orders on its own dashboard, so the shift lead copies each order in with a short form.</div><button class="btn" id="app2Btn">Add App 2 order</button></div>' +
      ' <div class="card source"><div class="top"><b><span class="brand-dot" style="background:#e8a33d"></span>Phone / Text</b><span class="pill good">Replaces notebook</span></div><div class="big">' + count('Phone/Text').toLocaleString() + '</div><div class="how">Orders taken by phone or text go straight into the app instead of the notebook by the door. 0% commission.</div><button class="btn" id="phoneBtn">Add phone/text order</button></div>' +
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
        return '<tr class="' + (o.source !== 'history' ? 'new' : '') + '"><td class="nw"><b>' + o.id + '</b>' + (o.ext ? '<br><small style="color:#7a8291">' + h(o.ext) + '</small>' : '') + '</td><td class="nw">' + o.date + '<br><small style="color:#7a8291">' + o.hour + ':00</small></td><td>' + brandTag(o.brand) + '</td><td>' + h(o.platform) + '</td><td>' + o.qty + ' x ' + h(o.item) + (o.note ? '<br><small style="color:#7a8291">Note: ' + h(o.note) + '</small>' : '') + '</td>' +
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
      if (checked.error) { out.innerHTML = '<div class="alert bad"><div class="ai">&#9888;</div><div>' + h(checked.error) + '</div></div>'; $('#doImport').disabled = true; return; }
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
      fetch('sample-data/delivery_app_1_export.csv').then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
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
  VIEWS.packing = function (main) {
    var pend = GK.pending();
    var st = GK.state();
    if (!pend.some(function (o) { return o.id === packSel; })) packSel = pend.length ? pend[0].id : null;
    var sel = pend.find(function (o) { return o.id === packSel; });
    var checks = st.checks;
    var caught = checks.filter(function (c) { return c.mistake && c.fixed; }).length;
    var passed = checks.filter(function (c) { return !c.mistake; }).length;
    var sentBad = checks.filter(function (c) { return c.mistake && !c.fixed; }).length;

    main.innerHTML = head('PACKING CHECK', 'Check every order before it leaves', 'Tick each line. If something is wrong, log why, so the owner can see which mistakes keep happening.') +
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
      }).join('') : '<div class="empty"><div class="big">&#127881;</div>Queue is empty. Add a phone/text order in the Order Hub to try a check.</div>') +
      ' </div></div>' +
      ' <div class="card card-pad" id="checkPane"></div>' +
      '</div>' +
      '<div class="grid g2 mt-lg">' +
      ' <div class="card card-pad"><h2>Mistake reasons</h2><p class="sub">From checks done in this app. This is the data that was missing before.</p><div class="chart-box"><canvas id="reasonChart"></canvas></div></div>' +
      ' <div class="card card-pad"><h2>Check log</h2><div class="table-wrap"><table class="t"><thead><tr><th>When</th><th>Order</th><th>Brand</th><th>Result</th></tr></thead><tbody>' +
      (checks.length ? checks.slice(0, 8).map(function (c) {
        return '<tr><td>' + timeAgo(c.t) + '</td><td>' + c.id + '</td><td>' + brandTag(c.brand) + '</td><td>' + (!c.mistake ? '<span class="pill good">Passed</span>' : c.fixed ? '<span class="pill warn">' + h(c.reason) + ', fixed</span>' : '<span class="pill bad">' + h(c.reason) + ', sent</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="empty">No checks yet.</td></tr>') + '</tbody></table></div></div>' +
      '</div>';

    $$('.q-item').forEach(function (b) { b.addEventListener('click', function () { packSel = b.getAttribute('data-id'); route(); if (window.innerWidth < 980) { var cp = document.getElementById('checkPane'); if (cp) cp.scrollIntoView({ behavior: 'smooth' }); } }); });

    var pane = $('#checkPane');
    if (!sel) { pane.innerHTML = '<div class="empty"><div class="big">&#10003;</div>Nothing to check right now.</div>'; }
    else {
      var lines = [
        sel.qty + ' x ' + sel.item,
        'Correct brand bag and sticker: ' + sel.brand,
        'Sauces, cutlery and napkins included'
      ];
      if (sel.note) lines.push('Special request followed: "' + sel.note + '"');
      lines.push('Bag sealed and labelled ' + sel.id);
      pane.innerHTML = '<div class="page-head" style="margin-bottom:6px"><div><h2 style="font-size:20px;margin:0">' + sel.id + '</h2><p style="margin:2px 0 0">' + brandTag(sel.brand) + ' &middot; ' + h(sel.platform) + (sel.customer ? ' &middot; for ' + h(sel.customer) : '') + '</p></div><span class="pill warn">Waiting ' + (sel.minutesAgo || 1) + ' min</span></div>' +
        '<div class="check-list">' + lines.map(function (l, i) { return '<label class="check" for="ck' + i + '"><input type="checkbox" id="ck' + i + '">' + h(l) + '</label>'; }).join('') + '</div>' +
        '<div class="btn-row"><button class="btn good big" id="passBtn" disabled>All correct, send out</button><button class="btn bad big" id="mistakeBtn">Found a mistake</button></div>' +
        '<div id="mistakeBox" class="hidden mt"><p class="sub" style="margin-bottom:8px"><b>What was wrong?</b></p><div class="reasons">' +
        ['Wrong item', 'Missing item', 'Request not followed', 'Wrong brand bag', 'Spilled or damaged', 'Other'].map(function (r) { return '<button class="reason" data-r="' + r + '">' + r + '</button>'; }).join('') +
        '</div><p class="sub mt" style="margin-bottom:8px"><b>Was it fixed before the order left?</b></p><div class="btn-row"><button class="btn good" id="fixedYes" disabled>Yes, fixed and sent</button><button class="btn bad" id="fixedNo" disabled>No, sent as is</button></div></div>';
      var boxes = $$('.check input', pane);
      boxes.forEach(function (b) {
        b.addEventListener('change', function () {
          b.parentNode.classList.toggle('done', b.checked);
          $('#passBtn').disabled = !boxes.every(function (x) { return x.checked; });
        });
      });
      var reason = null;
      $('#passBtn').addEventListener('click', function () { GK.completeCheck(sel.id, {}); toast(sel.id + ' passed and sent out.'); route(); });
      $('#mistakeBtn').addEventListener('click', function () { $('#mistakeBox').classList.remove('hidden'); });
      $$('.reason', pane).forEach(function (b) {
        b.addEventListener('click', function () { $$('.reason', pane).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); reason = b.getAttribute('data-r'); $('#fixedYes').disabled = false; $('#fixedNo').disabled = false; });
      });
      $('#fixedYes').addEventListener('click', function () { GK.completeCheck(sel.id, { reason: reason, fixed: true }); toast('Mistake caught on ' + sel.id + ' and fixed before it left.'); route(); });
      $('#fixedNo').addEventListener('click', function () { GK.completeCheck(sel.id, { reason: reason, fixed: false }); toast(sel.id + ' logged as sent with an error.'); route(); });
    }

    var reasons = {};
    checks.forEach(function (c) { if (c.mistake) reasons[c.reason] = (reasons[c.reason] || 0) + 1; });
    var keys = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; });
    if (!keys.length) { $('#reasonChart').parentNode.innerHTML = '<div class="empty"><div class="big">&#128203;</div>No mistakes logged yet. Use "Found a mistake" on an order to see this chart fill in.</div>'; }
    else chart($('#reasonChart'), {
      type: 'bar', data: { labels: keys, datasets: [{ data: keys.map(function (k) { return reasons[k]; }), backgroundColor: '#c0392b', borderRadius: 4, maxBarThickness: 28 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } }, y: { grid: { display: false } } } }
    });
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
        '<p style="margin:10px 0 0;font-weight:700;font-size:17px">' + (level === 'bad' ? '&#9888; Call in ' + need + ' more ' + (need === 1 ? 'person' : 'people') : level === 'warn' ? '&#9203; Busy, keep watching' : '&#10004; On track') + '</p>' +
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
      ' <div class="alert good"><div class="ai">&#9650;</div><div class="grow"><b>Best ' + dimName + ': ' + h(best.key) + '</b>' + money(best.avg) + ' profit per order, ' + best.margin.toFixed(1) + '% margin</div></div>' +
      ' <div class="alert warn"><div class="ai">&#9660;</div><div class="grow"><b>Weakest ' + dimName + ': ' + h(worst.key) + '</b>' + money(worst.avg) + ' profit per order, ' + worst.margin.toFixed(1) + '% margin</div></div>' +
      '</div>' +
      '<div class="grid g-side mt-lg">' +
      ' <div class="card card-pad"><h2>Average profit per order by ' + dimName + '</h2><div class="chart-box' + (profitDim === 'item' ? ' tall' : '') + '"><canvas id="profitChart"></canvas></div></div>' +
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
    var horiz = profitDim === 'item';
    chart($('#profitChart'), {
      type: 'bar',
      data: { labels: rows.map(function (r) { return r.key; }), datasets: [{ data: rows.map(function (r) { return r.avg; }),
        backgroundColor: rows.map(function (r) { return profitDim === 'brand' ? BRAND_COLORS[BRAND_IDX[r.key]] : '#2a78d6'; }), borderRadius: 4, maxBarThickness: horiz ? 18 : 60 }] },
      options: { indexAxis: horiz ? 'y' : 'x', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return money(c.raw) + ' per order'; } } } },
        scales: { [horiz ? 'x' : 'y']: { beginAtZero: true, ticks: { callback: function (v) { return '$' + v; } }, grid: { color: gridColor } }, [horiz ? 'y' : 'x']: { grid: { display: false } } } }
    });
  };

  // ---------------------------------------------------------------- KPIs (owner)
  VIEWS.kpis = function (main) {
    var k = GK.kpis();
    var T = CFG.KPI_TARGETS;
    main.innerHTML = head('KPIS', 'The 6 KPIs from our KPI deck', 'Calculated from ' + GK.historyCount.toLocaleString() + ' past orders plus everything checked in this app (' + k.checked_in_app + ' so far).',
      '<a class="btn amber" href="' + h(CFG.DASHBOARD_URL) + '" target="_blank" rel="noopener">Open Before vs After dashboard &rarr;</a>') +
      '<div class="grid g3">' + kpiTiles(k, ['accuracy', 'profit_after_refunds', 'peak_staffing_ratio', 'prep_variance', 'rating', 'refund_rate']) + '</div>' +
      '<div class="grid g2 mt-lg">' +
      ' <div class="card card-pad"><h2>Order accuracy by month (2025)</h2><p class="sub">History before the app. The dashed line is our ' + T.accuracy + '% target.</p><div class="chart-box"><canvas id="accChart"></canvas></div></div>' +
      ' <div class="card card-pad"><h2>How each KPI is calculated</h2><div class="table-wrap"><table class="t"><thead><tr><th>KPI</th><th>Formula</th></tr></thead><tbody>' +
      '<tr><td>Order Accuracy Rate</td><td>Correct orders / total orders x 100</td></tr>' +
      '<tr><td>Avg Profit per Order</td><td>(Profit - refunded amount) / orders</td></tr>' +
      '<tr><td>Staffing-to-Demand Ratio</td><td>Orders waiting / staff on shift, peak hours</td></tr>' +
      '<tr><td>Prep-Time Variance</td><td>Actual prep time - quoted prep time</td></tr>' +
      '<tr><td>Customer Satisfaction</td><td>Average customer rating (1 to 5)</td></tr>' +
      '<tr><td>Refund Rate</td><td>Orders refunded / total orders x 100</td></tr>' +
      '</tbody></table></div></div>' +
      '</div>';
    var m = GK.monthlyAccuracy();
    var target = { id: 'tgt', afterDatasetsDraw: function (c) {
      var y = c.scales.y.getPixelForValue(T.accuracy), a = c.chartArea, ctx = c.ctx;
      ctx.save(); ctx.strokeStyle = '#1f8a4c'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#1f8a4c'; ctx.font = '600 11px Segoe UI, system-ui, sans-serif'; ctx.fillText('Target ' + T.accuracy + '%', a.left + 4, y - 6); ctx.restore();
    } };
    chart($('#accChart'), {
      type: 'line',
      data: { labels: m.map(function (x) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+x.month.slice(5) - 1]; }), datasets: [{ data: m.map(function (x) { return x.acc; }), borderColor: '#2a78d6', backgroundColor: '#2a78d6', borderWidth: 2, pointRadius: 4, tension: .25 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.raw.toFixed(1) + '% correct'; } } } },
        scales: { y: { min: 70, max: 100, ticks: { callback: function (v) { return v + '%'; } }, grid: { color: gridColor } }, x: { grid: { display: false } } } },
      plugins: [target]
    });
  };

  // ---------------------------------------------------------------- GUIDE / TUTORIAL
  VIEWS.guide = function (main) {
    var owner = isOwner();
    var steps = [
      ['Sign in by role', 'Owner sees everything. Shift Lead sees only operational screens, and profit pages show a lock. Use "Switch role" at the bottom of the menu to compare.', null],
      ['Add a phone/text order', 'Order Hub > "+ New phone/text order". Pick brand, item and quantity. The app works out subtotal, commission and quoted prep time, and sends it to Packing Check. This replaces the paper notebook.', 'orders'],
      ['Import a Delivery App 1 CSV', 'Order Hub > "Import CSV" > "Use sample export". See how each App 1 column maps to our standard fields, and how a bad row (an item not on the menu) is flagged instead of imported.', 'orders'],
      ['Check an order before it leaves', 'Packing Check > tick every line to unlock "All correct, send out". Or press "Found a mistake", choose why, and say if it was fixed. The mistake chart and log fill in.', 'packing'],
      ['Get a staffing alert', 'Staffing > change staff on shift and orders waiting. Above 2 orders per person the card turns red and says how many people to call in. "Save this check" shows it on Home.', 'staffing'],
      ['See true profit (Owner)', 'Profit Tracker > switch between brand, channel and menu item. Move the slider to see what shifting Delivery App 2 orders to phone/text is worth in a year.', 'profit'],
      ['Track the 6 KPIs (Owner)', 'KPIs > all six KPIs against their targets, plus a link to the Before vs After dashboard that shows the simulated impact of this app.', 'kpis']
    ];
    main.innerHTML = head('GUIDE', 'How to use the Command Center', 'A 2-minute walk-through of every feature. Each step has a button that takes you there.') +
      '<div class="steps">' + steps.map(function (s) {
        var locked = (s[2] === 'profit' || s[2] === 'kpis') && !owner;
        return '<div class="card g-step"><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div>' + (s[2] ? (locked ? '<span class="pill muted">&#128274; Owner</span>' : '<a class="btn" href="#/' + s[2] + '">Try it</a>') : '<span></span>') + '</div>';
      }).join('') + '</div>' +
      '<div class="grid g2 mt-lg">' +
      ' <div class="card card-pad"><h2>What this prototype does</h2><ul style="margin:0;padding-left:20px;color:var(--text-2)"><li>Runs on 2,500 synthetic orders (Dataset 1) plus anything you add</li><li>Converts all 3 order sources into one standard order table</li><li>Saves your work in this browser (localStorage)</li><li>Shows different screens for Owner and Shift Lead</li></ul></div>' +
      ' <div class="card card-pad"><h2>What a real version would add</h2><ul style="margin:0;padding-left:20px;color:var(--text-2)"><li>A shared database and personal PIN logins (for example Firebase)</li><li>Direct connection to the delivery apps instead of CSV and manual entry</li><li>No payment processing; no customer phone numbers stored</li></ul>' +
      '  <div class="btn-row mt"><button class="btn bad" id="resetBtn">Reset demo data</button></div></div>' +
      '</div>';
    $('#resetBtn').addEventListener('click', function () {
      if (!confirmReset()) return;
      GK.reset(); toast('Demo data reset. 5 fresh orders are waiting at Packing Check.'); route();
    });
  };
  function confirmReset() {
    var b = $('#resetBtn');
    if (b.getAttribute('data-sure')) return true;
    b.setAttribute('data-sure', '1'); b.textContent = 'Click again to confirm reset';
    return false;
  }

  route();
})();
