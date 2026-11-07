/*
 * Data layer for the Ghost Kitchen Command Center prototype.
 *
 * Gather     -> orders arrive from 4 sources: Delivery App 1 (CSV export),
 *               Delivery App 2 (copied from its dashboard), Phone/Text (typed in, replaces the notebook),
 *               Brand Website (customers order and pay on each brand's own page: the customer UI)
 * Standardize-> every order is converted to the same standard fields (STANDARD_FIELDS below)
 * Store      -> history comes from Synthetic Dataset 1 (seed.js); new work is saved in the
 *               browser's localStorage (prototype only, no server)
 * Use        -> KPIs, alerts and profit views are calculated from the standardized orders
 */
(function () {
  'use strict';
  var S = window.SEED;
  var CFG = window.GK_CONFIG;
  var KEY = 'gk_command_center_v1';

  // 4th order source: the customer-facing brand websites (customer UI in this prototype).
  // Commission on this channel is the card payment fee only (about 3%), not a delivery-app cut.
  var WEB = 'Brand Website';
  if (S.platforms.indexOf(WEB) < 0) S.platforms.push(WEB);
  S.rates[WEB] = 0.03;
  var DELIVERY_FEE = 2.99;

  var STANDARD_FIELDS = [
    ['id', 'Order ID'], ['date', 'Date'], ['hour', 'Hour'], ['brand', 'Brand'], ['platform', 'Channel'],
    ['item', 'Item'], ['qty', 'Quantity'], ['subtotal', 'Subtotal ($)'], ['commission', 'Commission ($)'],
    ['profit', 'Estimated profit ($)']
  ];

  var CATEGORY = {};
  S.brands.forEach(function (b) { S.menu[b].forEach(function (m) { CATEGORY[m[0]] = { cat: m[1], price: m[2], brand: b }; }); });

  function r2(x) { return Math.round(x * 100) / 100; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function isPeak(h) { return (h >= 11 && h <= 13) || (h >= 18 && h <= 20); }

  // ---------------------------------------------------------------- history (Dataset 1)
  var HISTORY = S.rows.map(function (r) {
    var o = {};
    S.fields.forEach(function (f, i) { o[f] = r[i]; });
    return {
      id: 'ORD-' + pad(o.n, 5), date: o.date, hour: o.hour, brand: S.brands[o.brand], platform: S.platforms[o.platform],
      item: S.items[o.item], cat: CATEGORY[S.items[o.item]].cat, qty: o.qty, subtotal: o.subtotal, commission: o.commission,
      profit: o.profit, quoted: o.quoted, variance: o.variance, staff: o.staff, queue: o.queue,
      correct: o.correct === 1, refund: o.refund === 1, rating: o.rating, status: 'Delivered', source: 'history'
    };
  });
  HISTORY.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.hour - a.hour; });

  // ---------------------------------------------------------------- saved state
  var mem = null, memRaw = null;
  // Always re-read when another tab (for example the customer site) has saved newer data,
  // so the staff tab never overwrites a customer order with an old copy.
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (mem && (raw === null || raw === memRaw)) return mem;
    try { mem = JSON.parse(raw); memRaw = raw; } catch (e) { mem = null; }
    if (!mem) { mem = freshState(); save(); }
    if (!mem.webOrders) { mem.webOrders = []; mem.webSeq = 1001; }
    return mem;
  }
  function save() { try { memRaw = JSON.stringify(mem); localStorage.setItem(KEY, memRaw); } catch (e) { /* private mode: keep in memory */ } }

  function freshState() {
    var st = { seq: 2501, orders: [], checks: [], staffing: [], activity: [], importedRefs: [], webOrders: [], webSeq: 1001 };
    mem = st;
    // a few live orders waiting at the packing station, so the demo has something to check
    var demo = [
      ['Phone/Text', 'Flame and Bun', 'Bacon Bun Deluxe', 2, 'No onions on one burger', 'Priya'],
      ['Delivery App 2', "Nonna's Slice House", 'Pepperoni Pizza', 1, 'Extra garlic dip', ''],
      ['Delivery App 1', 'Bombay Street Bowls', 'Chicken Tikka Bowl', 2, '', ''],
      ['Phone/Text', 'Bombay Street Bowls', 'Samosas', 3, 'Mint chutney on the side', 'Arjun'],
      ['Delivery App 2', 'Flame and Bun', 'Loaded Fries', 2, '', '']
    ];
    var now = new Date().getHours();
    demo.forEach(function (d, i) {
      st.orders.push(standardize({ platform: d[0], brand: d[1], item: d[2], qty: d[3], note: d[4], customer: d[5],
        hour: Math.min(21, Math.max(10, now)), source: 'live' }, 'Waiting for packing check'));
      st.orders[st.orders.length - 1].minutesAgo = 2 + i * 3;
    });
    st.activity.push({ t: new Date().toISOString(), text: 'Prototype started with 2,500 historical orders (Dataset 1) and 5 live orders.' });
    return st;
  }

  function log(text) {
    var st = load();
    st.activity.unshift({ t: new Date().toISOString(), text: text });
    st.activity = st.activity.slice(0, 40);
    save();
  }

  // ---------------------------------------------------------------- standardize one order
  function standardize(input, status) {
    var st = mem || load();
    var info = CATEGORY[input.item];
    var qty = Math.max(1, parseInt(input.qty, 10) || 1);
    var subtotal = input.subtotal != null ? r2(+input.subtotal) : r2(info.price * qty);
    var rate = S.rates[input.platform] || 0;
    var commission = input.commission != null ? r2(+input.commission) : r2(subtotal * rate);
    var foodCost = r2(subtotal * S.food_cost_ratio);
    var net = r2(subtotal - commission);
    var quoted = S.prep_by_category[info.cat] + (S.brand_prep_adjust[input.brand] || 0);
    var o = {
      id: 'ORD-' + pad(st.seq++, 5), ext: input.ext || '', date: input.date || todayStr(),
      hour: input.hour != null ? +input.hour : new Date().getHours(), brand: input.brand, platform: input.platform,
      item: input.item, cat: info.cat, qty: qty, subtotal: subtotal, commission: commission, net: net,
      foodCost: foodCost, profit: r2(net - foodCost), quoted: quoted, correct: null, refund: false,
      status: status, source: input.source || 'form', note: input.note || '', customer: input.customer || '',
      fulfilment: input.fulfilment || '', createdAt: new Date().toISOString()
    };
    return o;
  }

  function preview(input) {
    var info = CATEGORY[input.item];
    if (!info) return null;
    var qty = Math.max(1, parseInt(input.qty, 10) || 1);
    var subtotal = r2(info.price * qty);
    var commission = r2(subtotal * (S.rates[input.platform] || 0));
    var food = r2(subtotal * S.food_cost_ratio);
    return { subtotal: subtotal, commission: commission, foodCost: food, profit: r2(subtotal - commission - food),
      quoted: S.prep_by_category[info.cat] + (S.brand_prep_adjust[input.brand] || 0) };
  }

  function addOrder(input) {
    var st = load();
    var o = standardize(input, 'Waiting for packing check');
    st.orders.unshift(o);
    save();
    log('New ' + o.platform + ' order ' + o.id + ' (' + o.brand + ', ' + o.qty + ' x ' + o.item + ') sent to packing check.');
    return o;
  }

  // ---------------------------------------------------------------- Delivery App 1 CSV import
  var APP1_MAPPING = [
    { from: 'Order Number', to: 'Platform reference', how: 'Kept to block duplicate imports' },
    { from: 'Order Placed', to: 'Date + Hour', how: 'Split "2026-10-30 11:42" into date and hour' },
    { from: 'Store Name', to: 'Brand', how: 'Must match one of our 3 brands' },
    { from: 'Item Name', to: 'Item + Category', how: "Must be on that brand's menu" },
    { from: 'Quantity', to: 'Quantity', how: 'Whole number, 1 or more' },
    { from: 'Item Subtotal', to: 'Subtotal ($)', how: 'Taken as is' },
    { from: 'Platform Fee', to: 'Commission ($)', how: 'Taken as is' },
    { from: '(calculated)', to: 'Channel', how: 'Set to "Delivery App 1"' },
    { from: '(calculated)', to: 'Estimated profit ($)', how: 'Subtotal - commission - food cost (31.5%)' }
  ];

  function parseCSV(text) {
    var rows = [], row = [], field = '', q = false;
    text = text.replace(/\r\n?/g, '\n');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }

  function checkImport(text) {
    var st = load();
    var rows = parseCSV(text);
    if (!rows.length) return { error: 'The file is empty.' };
    var head = rows[0].map(function (h) { return h.trim(); });
    var need = ['Order Number', 'Order Placed', 'Store Name', 'Item Name', 'Quantity', 'Item Subtotal', 'Platform Fee'];
    var missing = need.filter(function (n) { return head.indexOf(n) < 0; });
    if (missing.length) return { error: 'This does not look like a Delivery App 1 export. Missing columns: ' + missing.join(', ') };
    var idx = {}; need.forEach(function (n) { idx[n] = head.indexOf(n); });
    var out = rows.slice(1).map(function (r) {
      var raw = {}; need.forEach(function (n) { raw[n] = (r[idx[n]] || '').trim(); });
      var problems = [];
      var m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):\d{2}/.exec(raw['Order Placed']);
      if (!m) problems.push('date not readable');
      if (S.brands.indexOf(raw['Store Name']) < 0) problems.push('unknown brand');
      var info = CATEGORY[raw['Item Name']];
      if (!info) problems.push('"' + raw['Item Name'] + '" is not on any menu');
      else if (info.brand !== raw['Store Name']) problems.push('item belongs to ' + info.brand);
      var qty = parseInt(raw['Quantity'], 10);
      if (!(qty > 0)) problems.push('bad quantity');
      var sub = parseFloat(raw['Item Subtotal']), fee = parseFloat(raw['Platform Fee']);
      if (isNaN(sub) || isNaN(fee)) problems.push('bad amount');
      if (st.importedRefs.indexOf(raw['Order Number']) >= 0) problems.push('already imported');
      var std = null;
      if (!problems.length) {
        var food = r2(sub * S.food_cost_ratio);
        std = { ext: raw['Order Number'], date: m[1], hour: +m[2], brand: raw['Store Name'], platform: 'Delivery App 1',
          item: raw['Item Name'], cat: info.cat, qty: qty, subtotal: r2(sub), commission: r2(fee),
          profit: r2(sub - fee - food) };
      }
      return { raw: raw, std: std, problems: problems };
    });
    return { rows: out, mapping: APP1_MAPPING };
  }

  function commitImport(checked) {
    var st = load();
    var n = 0;
    checked.rows.forEach(function (r) {
      if (!r.std) return;
      var o = standardize({ ext: r.std.ext, date: r.std.date, hour: r.std.hour, brand: r.std.brand, platform: 'Delivery App 1',
        item: r.std.item, qty: r.std.qty, subtotal: r.std.subtotal, commission: r.std.commission, source: 'import' }, 'Delivered (imported)');
      st.orders.unshift(o);
      st.importedRefs.push(r.std.ext);
      n++;
    });
    save();
    var skipped = checked.rows.length - n;
    log('Imported ' + n + ' Delivery App 1 orders from CSV' + (skipped ? ' (' + skipped + ' row' + (skipped > 1 ? 's' : '') + ' flagged for review)' : '') + '.');
    return n;
  }

  // ---------------------------------------------------------------- customer UI (brand websites)
  // One customer checkout = one website order (WEB-xxxx). Each cart line becomes one standardized
  // order row, the same grain as Dataset 1, so it flows into the Order Hub, Packing Check and KPIs.
  function placeWebOrder(input) {
    var st = load();
    var ref = 'WEB-' + st.webSeq++;
    var hour = new Date().getHours();
    var rows = input.lines.map(function (l) {
      return standardize({ platform: WEB, brand: input.brand, item: l.item, qty: l.qty, ext: ref, note: input.note,
        customer: input.customer, fulfilment: input.fulfilment, hour: Math.min(21, Math.max(10, hour)), source: 'customer' },
        'Waiting for packing check');
    });
    rows.slice().reverse().forEach(function (o) { st.orders.unshift(o); });
    var subtotal = r2(rows.reduce(function (a, o) { return a + o.subtotal; }, 0));
    var fee = input.fulfilment === 'Delivery' ? DELIVERY_FEE : 0;
    var w = {
      ref: ref, brand: input.brand, customer: input.customer, note: input.note || '', fulfilment: input.fulfilment,
      lines: input.lines.map(function (l) { return { item: l.item, qty: +l.qty }; }), ids: rows.map(function (o) { return o.id; }),
      subtotal: subtotal, deliveryFee: fee, total: r2(subtotal + fee), payRef: 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      last4: input.last4 || '4242', paidAt: new Date().toISOString(),
      readyMins: Math.max.apply(null, rows.map(function (o) { return o.quoted; }))
    };
    st.webOrders.unshift(w);
    save();
    log('Customer order ' + ref + ' placed on the ' + input.brand + ' website (' + rows.length + ' item line' + (rows.length > 1 ? 's' : '') +
      ', $' + w.total.toFixed(2) + ' paid by card) and sent to packing check as ' + w.ids.join(', ') + '.');
    return w;
  }

  function webOrder(ref) {
    var st = load();
    var w = st.webOrders.find(function (x) { return x.ref === ref; });
    if (!w) return null;
    var rows = st.orders.filter(function (o) { return w.ids.indexOf(o.id) >= 0; });
    var waiting = rows.some(function (o) { return o.status === 'Waiting for packing check'; });
    w.rows = rows;
    w.stage = waiting ? 1 : 2;   // 0 received, 1 being packed and checked, 2 on its way / ready
    return w;
  }

  // ---------------------------------------------------------------- packing check
  function pending() { return load().orders.filter(function (o) { return o.status === 'Waiting for packing check'; }); }

  function completeCheck(id, result) {
    var st = load();
    var o = st.orders.find(function (x) { return x.id === id; });
    if (!o) return;
    var mistake = !!result.reason;
    o.correct = !mistake || result.fixed;
    o.status = o.correct ? 'Sent' : 'Sent with error';
    o.checkedAt = new Date().toISOString();
    st.checks.unshift({ t: o.checkedAt, id: id, brand: o.brand, platform: o.platform, mistake: mistake,
      reason: result.reason || '', fixed: !!result.fixed, by: result.by || '' });
    save();
    if (!mistake) log('Packing check passed: ' + id + ' sent out.');
    else log('Mistake on ' + id + ': ' + result.reason + (result.fixed ? ', fixed before it left the kitchen.' : ', sent anyway.'));
  }

  // ---------------------------------------------------------------- staffing
  function staffingSnapshot(s) {
    var st = load();
    st.staffing.unshift({ t: new Date().toISOString(), hour: s.hour, staff: s.staff, queue: s.queue, ratio: r2(s.queue / s.staff) });
    st.staffing = st.staffing.slice(0, 50);
    save();
    log('Staffing check at ' + s.hour + ':00: ' + s.queue + ' orders waiting, ' + s.staff + ' staff (ratio ' + r2(s.queue / s.staff) + ').');
  }

  function hourlyHistory() {
    var by = {};
    HISTORY.forEach(function (o) {
      var h = by[o.hour] || (by[o.hour] = { n: 0, ratio: 0, queue: 0 });
      h.n++; h.ratio += o.queue / o.staff; h.queue += o.queue;
    });
    var out = [];
    for (var h = 10; h <= 21; h++) {
      var x = by[h];
      out.push({ hour: h, orders: x.n, ratio: r2(x.ratio / x.n), queue: r2(x.queue / x.n),
        now: S.schedule_now[String(h)], suggested: S.schedule_suggested[String(h)] });
    }
    return out;
  }

  // ---------------------------------------------------------------- KPIs
  function allOrders() { return load().orders.concat(HISTORY); }

  function kpis() {
    var st = load();
    var done = allOrders().filter(function (o) { return o.correct !== null && o.correct !== undefined; });
    var correct = done.filter(function (o) { return o.correct; }).length;
    var money = allOrders().filter(function (o) { return o.status !== 'Waiting for packing check'; });
    var profitAfter = money.reduce(function (s, o) { return s + o.profit - (o.refund ? o.subtotal : 0); }, 0) / money.length;
    var peakPts = HISTORY.filter(function (o) { return isPeak(o.hour); }).map(function (o) { return o.queue / o.staff; });
    st.staffing.forEach(function (s) { if (isPeak(s.hour)) peakPts.push(s.ratio); });
    var peakRatio = peakPts.reduce(function (a, b) { return a + b; }, 0) / peakPts.length;
    var variance = HISTORY.reduce(function (s, o) { return s + o.variance; }, 0) / HISTORY.length;
    var rating = HISTORY.reduce(function (s, o) { return s + o.rating; }, 0) / HISTORY.length;
    var refunds = done.filter(function (o) { return o.refund; }).length;
    return {
      accuracy: r2(correct / done.length * 100),
      profit_after_refunds: r2(profitAfter),
      peak_staffing_ratio: r2(peakRatio),
      prep_variance: r2(variance),
      rating: r2(rating),
      refund_rate: r2(refunds / done.length * 100),
      checked_in_app: st.checks.length,
      caught: st.checks.filter(function (c) { return c.mistake && c.fixed; }).length
    };
  }

  function monthlyAccuracy() {
    var by = {};
    HISTORY.forEach(function (o) { var m = o.date.slice(0, 7); var x = by[m] || (by[m] = [0, 0]); x[0]++; if (o.correct) x[1]++; });
    return Object.keys(by).sort().map(function (m) { return { month: m, acc: r2(by[m][1] / by[m][0] * 100) }; });
  }

  // ---------------------------------------------------------------- profit tracker
  function profitBy(dim) {
    var groups = {};
    allOrders().forEach(function (o) {
      if (o.status === 'Waiting for packing check') return;
      var k = o[dim];
      var g = groups[k] || (groups[k] = { key: k, orders: 0, revenue: 0, commission: 0, food: 0, profit: 0, refunds: 0 });
      g.orders++; g.revenue += o.subtotal; g.commission += o.commission;
      g.food += o.subtotal - o.commission - o.profit; g.profit += o.profit; g.refunds += o.refund ? o.subtotal : 0;
    });
    return Object.keys(groups).map(function (k) {
      var g = groups[k];
      return { key: k, orders: g.orders, revenue: r2(g.revenue), commission: r2(g.commission), food: r2(g.food),
        profit: r2(g.profit), refunds: r2(g.refunds), avg: r2(g.profit / g.orders), margin: r2(g.profit / g.revenue * 100) };
    });
  }

  function reset() { mem = freshState(); save(); }

  window.GK = {
    SEED: S, CFG: CFG, STANDARD_FIELDS: STANDARD_FIELDS, CATEGORY: CATEGORY, isPeak: isPeak, r2: r2,
    state: load, addOrder: addOrder, preview: preview, checkImport: checkImport, commitImport: commitImport,
    pending: pending, completeCheck: completeCheck, staffingSnapshot: staffingSnapshot, hourlyHistory: hourlyHistory,
    allOrders: allOrders, kpis: kpis, monthlyAccuracy: monthlyAccuracy, profitBy: profitBy, reset: reset, log: log,
    historyCount: HISTORY.length, placeWebOrder: placeWebOrder, webOrder: webOrder, WEB: WEB, DELIVERY_FEE: DELIVERY_FEE, KEY: KEY,
    reloadFromStorage: function () { memRaw = null; mem = null; return load(); }
  };
})();
