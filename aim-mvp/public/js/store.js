/* AIM-AirBnB data layer (front end only, no server).
   All data lives in this browser's localStorage and is seeded with sample stays on first load.
   The admin signs in with a fixed owner account (see OWNER below). */
(function () {
  var P = "aim:", BLOCKING = ["awaiting_payment", "payment_submitted", "confirmed"];
  var ADMIN = location.pathname.indexOf("/admin/") > -1, csrf = "";
  var C = { settings: null, properties: [], offers: [], reviews: [], busy: {}, seo: false, bookings: [], enquiries: [], activity: [], guestNotes: {}, users: [], admin: null, offline: false };
  function rd(k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { var d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nights(a, b) { return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5); }
  function dow(s) { return new Date(s + "T00:00:00Z").getUTCDay(); }

  var FALLBACK = ["villa-modern-black-stone", "apartment-modern-glass-balcony", "house-stone-brick-porch", "house-beige-brick-pavers", "townhouse-white-modern", "house-tile-roof-balcony"];
  function art(seed) { return (ADMIN ? "../" : "") + "assets/photos/" + FALLBACK[Math.abs(seed | 0) % FALLBACK.length] + ".jpg"; }

  var AM_LIST = ["Wi-Fi", "Free parking", "Kitchen", "Air conditioning", "TV", "Hot water", "Secure compound", "Generator backup", "Washing machine", "Garden", "Swimming pool", "Breakfast available", "Workspace", "Balcony", "Airport pickup"];
  var DEF = {
    brand: "AIM-AirBnB", tagline: "Thoughtfully selected stays in Kampala, Uganda.", phone: "", email: "", whatsapp: "", address: "Kampala, Uganda",
    currency: "UGX", locale: "en-UG", depositPct: 30, holdHours: 24, serviceFeePct: 0, maxGuests: 20,
    momo: { mtn: "", airtel: "", name: "" },
    hero: { eyebrow: "Find your place to call home", title: "Find a stay that feels like yours.", text: "Discover thoughtfully selected homes in desirable neighbourhoods, with the information and guidance you need to book with confidence." },
    about: "AIM-AirBnB curates short-stay homes in Kampala and around Uganda. Every listing shows the details guests actually need: price, rules, check-in times and a clear booking status.\n\nWe confirm every booking personally, so you always know where you stand.",
    faq: [["How do I book a stay?", "Pick dates on the property page. Some homes are instant book; others are request-to-book and the host replies within a day. After that you pay with Mobile Money and the team confirms your payment."], ["When is my booking confirmed?", "Only when the status shows Confirmed. A request or an unpaid hold does not guarantee your dates."], ["How do I pay?", "Pay the amount due by MTN or Airtel Mobile Money, then enter the transaction ID on the payment page. The team verifies it and confirms."], ["Can I cancel?", "Yes. Refunds follow the property's cancellation policy (Flexible, Moderate or Strict). See the Cancellation page."], ["What if I don't pay in time?", "Instant-book holds are released after the hold period shown on your payment page and the dates open up again."]],
    policies: { privacy: "We collect the details you enter (name, phone, email, trip dates) only to handle your booking and enquiries. We do not sell personal data.\n\nTo request a copy or deletion of your data, contact us using the details on the Contact page.", terms: "By sending a booking you agree to the house rules shown on the property page and to the cancellation policy of that property.\n\nA booking is confirmed only when its status reads Confirmed. Prices are in the currency shown and may include a cleaning fee.", cancellation: "" },
    destinations: [{ name: "Kololo", blurb: "Quiet, leafy and close to restaurants and embassies." }, { name: "Bugolobi", blurb: "A calm residential area with easy access to the city and lakeside." }, { name: "Muyenga", blurb: "Hilltop homes with long views, popular with families." }, { name: "Ntinda", blurb: "Everyday convenience with shops, cafés and good transport links." }, { name: "Naguru", blurb: "Modern developments minutes from the centre." }, { name: "Entebbe", blurb: "Lake Victoria shoreline and a short ride from the airport." }, { name: "Kyanja", blurb: "Modern family homes in a growing northern suburb." }, { name: "Najjera", blurb: "Quiet streets and spacious gardens on the edge of the city." }, { name: "Kira", blurb: "Roomy residences with easy road links to Kampala." }],
    theme: { light: "", dark: "" }, notifyEmail: "", demo: false
  };
  var POL = {
    flexible: ["Flexible", "Full refund up to 24 hours before check-in. After that, the first night is not refunded."],
    moderate: ["Moderate", "Full refund up to 5 days before check-in. 50% refund up to 24 hours before. After that, no refund."],
    strict: ["Strict", "50% refund up to 7 days before check-in. After that, no refund."]
  };


  function settings() { var s = C.settings || {}, o = {}; for (var k in DEF) o[k] = s[k] == null ? DEF[k] : s[k]; return o; }
  function money(n) { var s = settings(); try { return new Intl.NumberFormat(s.locale, { style: "currency", currency: s.currency, maximumFractionDigits: 0 }).format(n || 0); } catch (e) { return s.currency + " " + Math.round(n || 0).toLocaleString("en-US"); } }
  function fmt(s) { if (!s) return "–"; try { return new Date(s.length > 10 ? s.replace(" ", "T") : s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return s; } }
  function fmtT(s) { try { return new Date(String(s).replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return s; } }
  function props(all) { return all ? C.properties : C.properties.filter(function (p) { return p.status === "published"; }); }
  function prop(k) { return C.properties.filter(function (p) { return p.id === k || p.slug === k; })[0]; }
  function bookings() { return C.bookings; }
  function booking(ref) { var raw = String(ref || "").trim(), up = raw.toUpperCase(); return C.bookings.filter(function (b) { return b.ref === up || b.id === raw; })[0]; }
  function conflicts(pid, a, b, ignoreId) {
    var p = prop(pid), out = [];
    ((p && p.blocked) || []).forEach(function (x) { if (a <= x.to && b > x.from) out.push({ kind: "blocked", from: x.from, to: x.to }); });
    if (ADMIN) C.bookings.forEach(function (x) { if (x.propertyId === pid && x.id !== ignoreId && BLOCKING.indexOf(x.status) > -1 && x.in < b && x.out > a) out.push({ kind: "booking", ref: x.ref, from: x.in, to: x.out }); });
    else (C.busy[pid] || []).forEach(function (x) { if (x[0] < b && x[1] > a) out.push({ kind: "booking", from: x[0], to: x[1] }); });
    return out;
  }
  function isNightTaken(pid, day) { return conflicts(pid, day, addDays(day, 1)).length > 0; }
  function nightPrice(p, d) {
    for (var i = 0; i < (p.seasons || []).length; i++) { var s = p.seasons[i]; if (s.from && s.to && d >= s.from && d <= s.to && s.price) return +s.price; }
    var w = dow(d); if (p.weekendPrice && (w === 5 || w === 6)) return +p.weekendPrice;
    return +p.price || 0;
  }
  function findPromo(code, p, n) { return findPromoIn(C.offers, code, p, n); }
  function findPromoIn(offers, code, p, n) {
    code = String(code || "").trim().toUpperCase(); if (!code) return null;
    var t = today(), o = offers.filter(function (x) { return x.active && String(x.code).toUpperCase() === code; })[0];
    if (!o) return { error: "That code is not valid." };
    if (o.validFrom && t < o.validFrom || o.validTo && t > o.validTo) return { error: "That code has expired." };
    if (o.propertyId && p && o.propertyId !== p.id) return { error: "That code does not apply to this stay." };
    if (o.minNights && n < o.minNights) return { error: "That code needs at least " + o.minNights + " nights." };
    return o;
  }
  /* price quote; the local back end recomputes it from stored data when a booking is made */
  function quote(p, a, b, code, quiet) { return quoteIn(C.offers, settings(), p, a, b, code, quiet); }
  function quoteIn(offers, s, p, a, b, code, quiet) {
    var n = nights(a, b), q = { nights: n, nightly: [], sub: 0, weekly: 0, promo: null, promoAmt: 0, cleaning: +p.cleaning || 0, fee: 0, total: 0, deposit: 0, error: "" };
    if (!(n > 0)) { q.error = "Choose a check-out after check-in."; return q; }
    for (var i = 0; i < n; i++) { var pr = Math.round(nightPrice(p, addDays(a, i))); q.nightly.push(pr); q.sub += pr; }
    if (p.weeklyPct && n >= 7) q.weekly = Math.round(q.sub * p.weeklyPct / 100);
    var pm = findPromoIn(offers, code, p, n);
    if (pm && pm.error) { if (!quiet) q.promoError = pm.error; } else if (pm) { q.promo = pm.code; q.promoAmt = pm.type === "fixed" ? Math.min(+pm.value, q.sub - q.weekly) : Math.round((q.sub - q.weekly) * pm.value / 100); }
    var base = q.sub - q.weekly - q.promoAmt + q.cleaning; q.fee = Math.round(base * (+s.serviceFeePct || 0) / 100); q.total = base + q.fee;
    q.deposit = Math.min(q.total, Math.ceil(q.total * (+s.depositPct || 100) / 100 / 1000) * 1000);
    return q;
  }
  function validate(p, a, b, g, ignoreId) {
    var n = nights(a, b);
    if (!a || !b || !(n > 0)) return "Choose a check-out after check-in.";
    if (a < today()) return "Check-in cannot be in the past.";
    if (p.minStay && n < p.minStay) return "Minimum stay is " + p.minStay + " night" + (p.minStay > 1 ? "s" : "") + ".";
    if (p.maxStay && n > p.maxStay) return "Maximum stay is " + p.maxStay + " nights.";
    if (g > p.guests) return "This home sleeps up to " + p.guests + " guests.";
    if (conflicts(p.id, a, b, ignoreId).length) return "Those dates are not available. Try different dates.";
    return "";
  }
  function refundFor(b, byHost) {
    var paid = (b.payment && b.payment.amountPaid) || 0; if (!paid) return 0; if (byHost) return paid;
    var days = nights(today(), b.in), pol = b.cancellation || "moderate";
    if (pol === "flexible") return days >= 1 ? paid : Math.max(0, paid - Math.round((b.pricing.sub / b.nights) || 0));
    if (pol === "moderate") return days >= 5 ? paid : days >= 1 ? Math.round(paid / 2) : 0;
    return days >= 7 ? Math.round(paid / 2) : 0;
  }
  function guests() {
    var m = {}, notes = C.guestNotes || {};
    C.bookings.forEach(function (b) { var k = (b.guest.email || b.guest.phone || b.guest.name).toLowerCase(); var g = m[k] = m[k] || { key: k, name: b.guest.name, email: b.guest.email, phone: b.guest.phone, trips: 0, spent: 0, last: "", note: notes[k] || "" }; g.trips++; if (["confirmed", "completed"].indexOf(b.status) > -1) g.spent += b.payment.amountPaid || 0; if (b.createdAt > g.last) g.last = b.createdAt; });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.last > a.last ? 1 : -1; });
  }
  function rating(pid) { var l = C.reviews.filter(function (r) { return r.status === "approved" && (!pid || r.propertyId === pid); }); return { n: l.length, avg: l.length ? Math.round(l.reduce(function (a, r) { return a + r.rating; }, 0) / l.length * 10) / 10 : 0 }; }
  function shade(hex, a) { var n = parseInt(hex.slice(1), 16), f = function (v) { return Math.max(0, Math.min(255, v + a)); }; return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return ("0" + f(v).toString(16)).slice(-2); }).join(""); }
  function applyTheme() {
    var s = settings(), css = "", ok = function (v) { return /^#[0-9a-f]{6}$/i.test(v || ""); };
    if (ok(s.theme.light)) css += ':root{--action:' + s.theme.light + ';--action-h:' + shade(s.theme.light, -30) + ';--link:' + s.theme.light + '}';
    if (ok(s.theme.dark)) css += '[data-theme="dark"]{--action:' + s.theme.dark + ';--action-h:' + shade(s.theme.dark, 40) + ';--link:' + s.theme.dark + '}';
    var st = document.getElementById("aim-theme-css"); if (!st) { st = document.createElement("style"); st.id = "aim-theme-css"; document.head.appendChild(st); } st.textContent = css;
  }

  /* ---------- local back end ----------
     There is no server. What the PHP API used to do now runs here, against one JSON database kept in this
     browser's localStorage. The public pages and /admin/ share it, so bookings made in this browser appear in
     this browser's admin. api(method, path, body) keeps the same routes and response shapes as before. */
  var DB = null, SK = "aim:sess", memSess = null;
  var OWNER = { username: "Avin", password: "Avin@2026" };
  var ACTIVE = ["pending", "awaiting_payment", "payment_submitted", "confirmed"];

  function nowIso() { return new Date().toISOString().replace(/\.\d+Z$/, "Z"); }
  function cl(v, max) { if (typeof v !== "string" && typeof v !== "number") return ""; return String(v).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, max || 200); }
  function isDate(d) { if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; var t = new Date(d + "T00:00:00Z"); return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d; }
  function isEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
  function num(v, d) { return (v !== "" && v != null && isFinite(v)) ? +v : d; }
  function rnd(n, alpha) { var o = "", a = new Uint32Array(n), i; try { crypto.getRandomValues(a); } catch (e) { for (i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 4294967296); } for (i = 0; i < n; i++) o += alpha.charAt(a[i] % alpha.length); return o; }
  function sha(s) {
    s = "aim|" + s;
    try { if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }); } catch (e) {}
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Promise.resolve("x" + (h >>> 0).toString(16));
  }
  function plain(v) { return v && typeof v === "object" && !Array.isArray(v); }
  function ok(j, s) { j = j || {}; j._status = s || 200; return j; }
  function bad(s, m) { return { error: m, _status: s }; }

  /* storage */
  function load() { try { var s = localStorage.getItem(P + "db"); if (s) return JSON.parse(s); } catch (e) {} return DB; }
  function dbSave() { try { localStorage.setItem(P + "db", JSON.stringify(DB)); return true; } catch (e) { return false; } }

  /* settings (defaults merged under saved values) */
  function SV() {
    var s = DB.settings || {}, o = {};
    for (var k in DEF) { var d = DEF[k], v = s[k]; if (v == null) o[k] = d; else if (plain(d) && plain(v)) { o[k] = {}; for (var a in d) o[k][a] = d[a]; for (var b in v) o[k][b] = v[b]; } else o[k] = v; }
    return o;
  }
  function sm(n) { return SV().currency + " " + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function actor() { var u = sessUser(); return u ? u.username : "system"; }
  function logAct(text, by) { DB.activity.unshift({ t: nowIso(), by: String(by || "system").slice(0, 60), text: String(text).slice(0, 400) }); if (DB.activity.length > 300) DB.activity.length = 300; }

  /* images: stored as "assets/..." (relative to the site root) or data:/https: URLs */
  function imgOut(u) { return ADMIN && /^assets\//.test(u) ? "../" + u : u; }
  function imgIn(u) { u = String(u || ""); if (/^data:image\//.test(u)) return u.length < 1500000 ? u : ""; u = u.trim().slice(0, 500).replace(/^(\.\.\/|\/)+(?=assets\/)/, ""); return /^(assets\/|https:\/\/)/.test(u) ? u : ""; }

  /* properties */
  function propsSorted() { return DB.properties.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; }); }
  function pget(key, pubOnly) { var p = DB.properties.filter(function (x) { return x.id === key || x.slug === key; })[0]; return !p || (pubOnly && p.status !== "published") ? null : p; }
  function propOut(p, pub) {
    var c = JSON.parse(JSON.stringify(p)); c.images = (c.images || []).map(imgOut);
    if (pub) { delete c.address; c.blocked = (c.blocked || []).map(function (x) { return { from: x.from, to: x.to }; }); }
    return c;
  }
  function cleanProp(inp, old) {
    var name = cl(inp.name, 120), id = cl(inp.id, 32); if (!name || !id) return null;
    var list = function (k, max, len) { var o = []; (Array.isArray(inp[k]) ? inp[k] : []).slice(0, max).forEach(function (v) { var s = cl(v, len); if (s) o.push(s); }); return o; };
    var imgs = []; (Array.isArray(inp.images) ? inp.images : []).slice(0, 20).forEach(function (u) { u = imgIn(u); if (u) imgs.push(u); }); if (!imgs.length) imgs = ["assets/photos/placeholder.jpg"];
    var blocked = []; (Array.isArray(inp.blocked) ? inp.blocked : []).slice(0, 300).forEach(function (x) { if (x && isDate(x.from) && isDate(x.to) && x.to >= x.from) blocked.push({ from: x.from, to: x.to, note: cl(x.note, 120) }); });
    var seasons = []; (Array.isArray(inp.seasons) ? inp.seasons : []).slice(0, 30).forEach(function (x) { if (x && isDate(x.from) && isDate(x.to) && num(x.price, 0) > 0) seasons.push({ name: cl(x.name, 60), from: x.from, to: x.to, price: +x.price }); });
    var slug = cl(inp.slug || name, 160).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); if (!slug) slug = id;
    if (DB.properties.some(function (x) { return x.slug === slug && x.id !== id; })) slug += "-" + id.slice(-4);
    var time = function (k, d) { var v = cl(inp[k], 5); return /^\d{2}:\d{2}$/.test(v) ? v : d; };
    return {
      id: id, slug: slug, name: name, type: cl(inp.type || "Premium short stay", 60) || "Premium short stay", location: cl(inp.location, 120), address: cl(inp.address, 200), description: cl(inp.description, 4000),
      beds: Math.max(0, Math.floor(num(inp.beds, 1))), baths: Math.max(0, Math.floor(num(inp.baths, 1))), guests: Math.max(1, Math.floor(num(inp.guests, 2))),
      price: Math.max(0, num(inp.price, 0)), weekendPrice: num(inp.weekendPrice, 0) > 0 ? +inp.weekendPrice : "", cleaning: Math.max(0, num(inp.cleaning, 0)), weeklyPct: Math.max(0, Math.min(60, num(inp.weeklyPct, 0))),
      minStay: Math.max(1, Math.floor(num(inp.minStay, 1))), maxStay: Math.max(1, Math.floor(num(inp.maxStay, 30))), checkIn: time("checkIn", "14:00"), checkOut: time("checkOut", "11:00"),
      bookingMode: inp.bookingMode === "request" ? "request" : "instant", cancellation: ["flexible", "moderate", "strict"].indexOf(inp.cancellation) > -1 ? inp.cancellation : "moderate",
      status: inp.status === "published" ? "published" : "draft", featured: !!inp.featured, amenities: list("amenities", 40, 60), rules: list("rules", 30, 200), images: imgs, blocked: blocked, seasons: seasons,
      host: cl(inp.host, 80), demo: !!(old && old.demo), createdAt: (old && old.createdAt) || nowIso()
    };
  }

  /* availability and pricing (authoritative copy, uses the stored database) */
  function stayConflict(p, a, b, ignore) {
    if ((p.blocked || []).some(function (x) { return a <= x.to && b > x.from; })) return true;
    return DB.bookings.some(function (x) { return x.propertyId === p.id && x.id !== ignore && BLOCKING.indexOf(x.status) > -1 && x.in < b && x.out > a; });
  }
  function vStay(p, a, b, g, ignore) {
    var n = nights(a, b);
    if (!(n > 0)) return "Choose a check-out after check-in.";
    if (a < today()) return "Check-in cannot be in the past.";
    if (p.minStay > 0 && n < p.minStay) return "Minimum stay is " + p.minStay + " night" + (p.minStay > 1 ? "s" : "") + ".";
    if (p.maxStay > 0 && n > p.maxStay) return "Maximum stay is " + p.maxStay + " nights.";
    if (g > p.guests) return "This home sleeps up to " + p.guests + " guests.";
    if (stayConflict(p, a, b, ignore)) return "Those dates are not available. Try different dates.";
    return "";
  }

  /* bookings */
  function bfind(key) { var raw = String(key || "").trim(), up = raw.toUpperCase(); return DB.bookings.filter(function (b) { return b.ref === up || b.id === raw; })[0]; }
  function bview(b, guest) { var c = JSON.parse(JSON.stringify(b)); delete c._t; if (guest) delete c.adminNote; return c; }
  function holdIso() { return new Date(Date.now() + (+SV().holdHours || 24) * 36e5).toISOString().replace(/\.\d+Z$/, "Z"); }
  function newRef() { var r; do { r = "AIM-" + rnd(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"); } while (bfind(r)); return r; }
  function bookingCreate(d, admin) {
    var p = pget(String(d.propertyId || ""), !admin); if (!p) return { error: "Property not found." };
    var a = d.in || "", b = d.out || ""; if (!isDate(a) || !isDate(b)) return { error: "Choose valid dates." };
    var g = Math.max(1, Math.min(50, parseInt(d.guests, 10) || 1)), gd = plain(d.guest) ? d.guest : {};
    var name = cl(gd.name, 80), phone = cl(gd.phone, 30), email = cl(gd.email, 120), notes = cl(gd.notes, 500);
    if (!name || phone.replace(/\D/g, "").length < 9) return { error: "Enter your name and a valid phone number." };
    if (email && !isEmail(email)) return { error: "Enter a valid email address." };
    if (!admin && !email) return { error: "Enter your email address." };
    var method = d.method === "airtel" ? "airtel" : "mtn", err = vStay(p, a, b, g, null); if (err) return { error: err };
    var q = quoteIn(DB.offers, SV(), p, a, b, String(d.promo || ""), true), instant = (p.bookingMode || "instant") === "instant" || admin;
    var status = admin ? "confirmed" : instant ? "awaiting_payment" : "pending", now = nowIso(), paid = admin ? Math.max(0, Math.round(num(d.paid, 0))) : 0, token = rnd(32, "0123456789abcdef");
    var text = admin ? "Booking created by admin" : instant ? "Booking created (instant book). Awaiting payment" : "Booking request sent. Awaiting host approval";
    var bk = {
      id: uid(), ref: newRef(), propertyId: p.id, propertyName: p.name, in: a, out: b, nights: q.nights, guests: g, guest: { name: name, phone: phone, email: email, notes: notes }, pricing: q, mode: p.bookingMode || "instant",
      cancellation: p.cancellation || "moderate", status: status, payment: { method: method, amountDue: q.deposit, amountPaid: paid, txnId: "", verified: !!admin }, holdExpires: status === "awaiting_payment" ? holdIso() : "",
      createdAt: now, source: admin ? "admin" : "website", history: [{ t: now, text: text, by: admin ? "admin" : "guest" }], _t: token
    };
    DB.bookings.unshift(bk); logAct("New booking " + bk.ref + " for " + p.name, admin ? actor() : "guest");
    return { booking: bk, token: token };
  }
  function bookingAct(id, action, x, by, isGuest) {
    var b = DB.bookings.filter(function (r) { return r.id === id; })[0]; if (!b) return { error: "Booking not found." };
    var st = b.status, now = nowIso(), deny = { error: "That action is not available for this booking right now." };
    var note = function (t) { b.history.push({ t: now, text: t, by: by }); };
    switch (action) {
      case "approve": {
        if (st !== "pending") return deny; var p = pget(b.propertyId);
        if (!p || stayConflict(p, b.in, b.out, b.id)) return { error: "Dates now conflict with another booking or block." };
        b.status = "awaiting_payment"; b.holdExpires = holdIso(); note("Request approved. Awaiting payment"); break; }
      case "decline": if (st !== "pending") return deny; b.status = "declined"; b.declineReason = cl(x.reason, 300); note("Request declined" + (b.declineReason ? ": " + b.declineReason : "")); break;
      case "submitPayment": {
        if (st !== "awaiting_payment") return deny; var txn = cl(x.txnId, 40).toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9._-]{4,39}$/.test(txn)) return { error: "Enter the transaction ID exactly as shown in your SMS (letters and numbers)." };
        if (DB.bookings.some(function (o) { return o.id !== id && o.payment && o.payment.txnId === txn; })) return { error: "That transaction ID has already been used. Please check it or contact us." };
        b.payment.txnId = txn; b.payment.method = x.method === "airtel" ? "airtel" : "mtn"; b.payment.payerPhone = cl(x.phone, 30); b.payment.submittedAt = now; b.status = "payment_submitted"; note("Payment reference submitted: " + txn); break; }
      case "verifyPayment": {
        if (["awaiting_payment", "payment_submitted"].indexOf(st) < 0) return deny; var amt = Math.round(num(x.amount, 0)); if (amt <= 0) return { error: "Enter the amount received." };
        b.payment.amountPaid = amt; b.payment.verified = true; b.payment.verifiedAt = now; b.status = "confirmed"; b.holdExpires = ""; note("Payment verified (" + sm(amt) + "). Booking confirmed"); break; }
      case "rejectPayment": {
        if (st !== "payment_submitted") return deny; b.status = "awaiting_payment"; b.payment.txnId = ""; b.holdExpires = holdIso(); var rs = cl(x.reason, 300);
        note("Payment could not be verified" + (rs ? ": " + rs : "") + ". Guest asked to resubmit"); break; }
      case "confirm": if (["awaiting_payment", "payment_submitted"].indexOf(st) < 0) return deny; b.status = "confirmed"; b.holdExpires = ""; note("Booking confirmed by admin"); break;
      case "recordPayment": {
        if (["confirmed", "completed"].indexOf(st) < 0) return deny; var am = Math.round(num(x.amount, 0)); if (am <= 0) return { error: "Enter the amount received." };
        b.payment.amountPaid = (+b.payment.amountPaid || 0) + am; b.payment.verified = true; note("Payment recorded: " + sm(am) + (cl(x.note, 100) ? " (" + cl(x.note, 100) + ")" : "")); break; }
      case "cancel":
        if (ACTIVE.indexOf(st) < 0) return deny; if (isGuest && b.in < today()) return deny;
        b.refundDue = refundFor(b, !isGuest); b.status = "cancelled"; b.cancelledBy = isGuest ? "guest" : "host"; b.cancelReason = cl(x.reason, 300); b.holdExpires = ""; note("Cancelled by " + b.cancelledBy + ". Refund due: " + sm(b.refundDue)); break;
      case "refund": {
        if (st !== "cancelled") return deny; var due = +b.refundDue || 0, ra = Math.round(num(x.amount, 0)); if (ra <= 0) ra = Math.max(0, due - (+b.refunded || 0));
        if (ra <= 0 || (+b.refunded || 0) + ra > due) return { error: "Refund amount is more than what is owed." };
        b.refunded = (+b.refunded || 0) + ra; note("Refund of " + sm(ra) + " marked as sent"); break; }
      case "complete": if (st !== "confirmed") return deny; b.status = "completed"; note("Marked completed"); break;
      case "note": b.adminNote = cl(x.note, 1000); note("Internal note updated"); break;
      default: return { error: "Unknown action." };
    }
    logAct(action + " " + b.ref, by);
    return { booking: b };
  }
  /* expire unpaid holds and complete finished stays */
  function sweepDb() {
    var t = Date.now(), td = today();
    DB.bookings.forEach(function (b) {
      if (b.status === "awaiting_payment" && b.holdExpires && Date.parse(b.holdExpires) < t) { b.status = "expired"; b.holdExpires = ""; b.history.push({ t: nowIso(), text: "Hold expired: no payment received", by: "system" }); }
      else if (b.status === "confirmed" && b.out < td) { b.status = "completed"; b.history.push({ t: nowIso(), text: "Stay completed", by: "system" }); }
    });
  }

  /* collections saved from the admin */
  function saveProps(items, removed) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (!plain(it)) continue; var id = cl(it.id, 32), old = DB.properties.filter(function (x) { return x.id === id; })[0], p = cleanProp(it, old);
      if (!p) return "Each property needs a name."; if (old) DB.properties[DB.properties.indexOf(old)] = p; else DB.properties.push(p);
    }
    for (var r = 0; r < removed.length; r++) {
      var rid = cl(removed[r], 32);
      if (DB.bookings.some(function (b) { return b.propertyId === rid && ACTIVE.indexOf(b.status) > -1; })) return "That property has active bookings. Cancel them first, or unpublish instead.";
      DB.properties = DB.properties.filter(function (x) { return x.id !== rid; });
    }
    return "";
  }
  function saveReviews(items, removed) {
    items.forEach(function (it) {
      if (!plain(it)) return; var id = cl(it.id, 32); if (!id) return; var st = ["pending", "approved", "hidden"].indexOf(it.status) > -1 ? it.status : "pending";
      var old = DB.reviews.filter(function (x) { return x.id === id; })[0], d = old || {};
      var n = { id: id, propertyId: cl(it.propertyId != null ? it.propertyId : d.propertyId, 32), name: cl(it.name != null ? it.name : d.name, 60), rating: Math.max(1, Math.min(5, parseInt(it.rating != null ? it.rating : (d.rating || 5), 10) || 5)),
        text: cl(it.text != null ? it.text : d.text, 1200), date: isDate(it.date) ? it.date : (d.date || today()), status: st, reply: cl(it.reply != null ? it.reply : d.reply, 600) };
      if (d.bookingRef) n.bookingRef = d.bookingRef; if (d.demo) n.demo = true; if (old) DB.reviews[DB.reviews.indexOf(old)] = n; else DB.reviews.unshift(n);
    });
    removed.forEach(function (rid) { rid = cl(rid, 32); DB.reviews = DB.reviews.filter(function (x) { return x.id !== rid; }); });
    return "";
  }
  function saveOffers(items, removed) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (!plain(it)) continue; var id = cl(it.id, 32), code = cl(it.code, 40).replace(/[^A-Za-z0-9]/g, "").slice(0, 20).toUpperCase();
      if (!id || !code || !cl(it.title, 100)) return "Each offer needs a title and a code.";
      if (DB.offers.some(function (x) { return x.code === code && x.id !== id; })) return "That code already exists.";
      var type = it.type === "fixed" ? "fixed" : "pct", val = Math.max(0, num(it.value, 0)); if (type === "pct") val = Math.min(90, val);
      var d = { id: id, title: cl(it.title, 100), code: code, type: type, value: val, minNights: Math.max(0, Math.floor(num(it.minNights, 0))), validFrom: isDate(it.validFrom) ? it.validFrom : "", validTo: isDate(it.validTo) ? it.validTo : "", propertyId: cl(it.propertyId, 32), active: !!it.active, description: cl(it.description, 200) };
      var old = DB.offers.filter(function (x) { return x.id === id; })[0]; if (old) { if (old.demo) d.demo = true; DB.offers[DB.offers.indexOf(old)] = d; } else DB.offers.push(d);
    }
    removed.forEach(function (rid) { rid = cl(rid, 32); DB.offers = DB.offers.filter(function (x) { return x.id !== rid; }); });
    return "";
  }
  function saveEnquiries(items, removed) {
    items.forEach(function (it) { if (!plain(it)) return; var row = DB.enquiries.filter(function (x) { return x.id === cl(it.id, 32); })[0]; if (row && ["new", "replied", "closed"].indexOf(it.status) > -1) row.status = it.status; });
    removed.forEach(function (rid) { rid = cl(rid, 32); DB.enquiries = DB.enquiries.filter(function (x) { return x.id !== rid; }); });
    return "";
  }
  function saveNotes(map) { if (!plain(map)) return; for (var k in map) { var key = cl(k, 190), v = cl(map[k], 1000); if (!key) continue; if (!v) delete DB.guestNotes[key]; else DB.guestNotes[key] = v; } }
  function saveSettingsDb(patch) {
    var c = {}, i;
    ["brand", "tagline", "phone", "email", "notifyEmail", "whatsapp", "address", "currency"].forEach(function (k) { if (k in patch) c[k] = cl(patch[k], 300); });
    if ("about" in patch) c.about = cl(patch.about, 6000);
    if (c.currency != null) { var cur = c.currency.replace(/[^A-Za-z]/g, "").toUpperCase(); c.currency = cur ? cur.slice(0, 3) : "UGX"; }
    if (c.brand === "") c.brand = "AIM-AirBnB";
    var bads = ["email", "notifyEmail"].filter(function (k) { return c[k] && !isEmail(c[k]); }); if (bads.length) return "Enter a valid email address.";
    var rng = { depositPct: [1, 100], holdHours: [1, 720], serviceFeePct: [0, 30], maxGuests: [1, 100] };
    for (var k in rng) if (k in patch && num(patch[k], null) !== null) c[k] = Math.max(rng[k][0], Math.min(rng[k][1], +patch[k]));
    if (plain(patch.momo)) c.momo = { mtn: cl(patch.momo.mtn, 30), airtel: cl(patch.momo.airtel, 30), name: cl(patch.momo.name, 80) };
    if (plain(patch.hero)) c.hero = { eyebrow: cl(patch.hero.eyebrow, 120), title: cl(patch.hero.title, 160), text: cl(patch.hero.text, 500) };
    if (plain(patch.policies)) { c.policies = {}; ["privacy", "terms", "cancellation"].forEach(function (k) { c.policies[k] = cl(patch.policies[k], 12000); }); }
    if (plain(patch.theme)) { c.theme = {}; ["light", "dark"].forEach(function (k) { var v = String(patch.theme[k] || ""); c.theme[k] = /^#[0-9a-fA-F]{6}$/.test(v) ? v : ""; }); }
    if (Array.isArray(patch.faq)) { c.faq = []; patch.faq.slice(0, 60).forEach(function (r) { if (Array.isArray(r) && cl(r[0], 300)) c.faq.push([cl(r[0], 300), cl(r[1], 2000)]); }); }
    if (Array.isArray(patch.destinations)) { c.destinations = []; patch.destinations.slice(0, 40).forEach(function (r) { if (plain(r) && cl(r.name, 80)) c.destinations.push({ name: cl(r.name, 80), blurb: cl(r.blurb, 300) }); }); }
    var s = DB.settings || {}; for (i in c) s[i] = c[i]; DB.settings = s; logAct("Settings updated: " + Object.keys(c).join(", "), actor()); return "";
  }
  function adminDump(u) {
    return { properties: propsSorted().map(function (p) { return propOut(p, false); }), bookings: DB.bookings.map(function (b) { return bview(b, false); }), reviews: DB.reviews, offers: DB.offers, enquiries: DB.enquiries,
      activity: DB.activity, guestNotes: DB.guestNotes, users: u.role === "owner" ? DB.users.map(function (x) { return { id: x.id, username: x.username, role: x.role }; }) : [], settings: SV() };
  }

  /* session */
  function sessUser() {
    var s = null; try { s = JSON.parse(sessionStorage.getItem(SK) || "null"); } catch (e) { s = memSess; } if (!s) s = memSess; if (!s || !DB) return null;
    var u = DB.users.filter(function (x) { return x.id === s.id; })[0]; return u ? { id: u.id, username: u.username, role: u.role } : null;
  }
  function setSess(u) { memSess = u ? { id: u.id } : null; try { if (u) sessionStorage.setItem(SK, JSON.stringify({ id: u.id })); else sessionStorage.removeItem(SK); } catch (e) {} }

  /* router: same paths and shapes the PHP API had */
  function route(method, rawPath, b) {
    var qi = rawPath.indexOf("?"), path = qi < 0 ? rawPath : rawPath.slice(0, qi), qs = {};
    if (qi >= 0) rawPath.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) qs[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    var seg = path.replace(/^\/+|\/+$/g, "").split("/"), s0 = seg[0], r; b = plain(b) ? b : {};
    var guestRow = function (ref, tok) { var row = bfind(ref); return row && tok && row._t === tok ? row : null; }, nf = "Booking not found. Check your link or use Find my booking.";

    if (s0 === "bootstrap" && method === "GET") {
      var props = propsSorted().filter(function (p) { return p.status === "published"; }), busy = {}, td = today(), st = SV(); delete st.notifyEmail;
      props.forEach(function (p) { busy[p.id] = []; });
      DB.bookings.forEach(function (x) { if (BLOCKING.indexOf(x.status) > -1 && x.out >= td && busy[x.propertyId]) busy[x.propertyId].push([x.in, x.out]); });
      return ok({ settings: st, properties: props.map(function (p) { return propOut(p, true); }), offers: DB.offers.filter(function (o) { return o.active; }),
        reviews: DB.reviews.filter(function (x) { return x.status === "approved"; }).map(function (x) { var c = JSON.parse(JSON.stringify(x)); delete c.bookingRef; return c; }), busy: busy, seo: false });
    }
    if (s0 === "bookings") {
      if (method === "POST" && seg.length === 1) {
        if (b.website) return bad(422, "Could not complete your booking.");
        r = bookingCreate(b, false); return r.error ? bad(422, r.error) : ok({ booking: bview(r.booking, true), token: r.token }, 201);
      }
      if (method === "POST" && seg[1] === "lookup") {
        var row = bfind(cl(b.ref, 20)), who = cl(b.who, 120).toLowerCase(), good = false, dg = function (v) { return String(v || "").replace(/\D/g, ""); };
        if (row && who) good = String(row.guest.email || "").toLowerCase() === who || (dg(who).length > 8 && dg(row.guest.phone).slice(-9) === dg(who).slice(-9));
        return good ? ok({ booking: bview(row, true), token: row._t }) : bad(404, "We could not match those details. Check your reference and contact details.");
      }
      if (seg.length === 2 && method === "GET") { var g1 = guestRow(seg[1], cl(qs.t, 64)); return g1 ? ok({ booking: bview(g1, true) }) : bad(404, nf); }
      if (seg.length === 3 && method === "POST" && (seg[2] === "payment" || seg[2] === "cancel")) {
        var g2 = guestRow(seg[1], cl(b.t, 64)); if (!g2) return bad(404, nf);
        r = bookingAct(g2.id, seg[2] === "payment" ? "submitPayment" : "cancel", b, "guest", true); return r.error ? bad(422, r.error) : ok({ booking: bview(r.booking, true) });
      }
      return bad(404, "Not found.");
    }
    if (s0 === "enquiries" && method === "POST") {
      if (b.website) return ok({ ok: true });
      var nm = cl(b.name, 80), em = cl(b.email, 120), msg = cl(b.message, 2000); if (!nm || !msg || !isEmail(em)) return bad(422, "Please enter your name, a valid email and a message.");
      DB.enquiries.unshift({ id: uid(), kind: b.kind === "host" ? "host" : "contact", name: nm, phone: cl(b.phone, 30), email: em, propertyId: cl(b.propertyId, 32), location: cl(b.location, 120), message: msg, status: "new", createdAt: nowIso() });
      logAct("Enquiry from " + nm, "guest"); return ok({ ok: true }, 201);
    }
    if (s0 === "reviews" && method === "POST") {
      var rb = guestRow(cl(b.ref, 20), cl(b.t, 64)); if (!rb) return bad(404, nf);
      if (["confirmed", "completed"].indexOf(rb.status) < 0 || rb.in > today()) return bad(422, "You can review your stay once it has started.");
      if (DB.reviews.some(function (x) { return x.bookingRef === rb.ref; })) return bad(422, "You have already reviewed this stay.");
      var tx = cl(b.text, 1200); if (!tx) return bad(422, "Write a few words about your stay.");
      DB.reviews.unshift({ id: uid(), propertyId: rb.propertyId, bookingRef: rb.ref, name: String(rb.guest.name).trim().split(/\s+/)[0].slice(0, 40), rating: Math.max(1, Math.min(5, parseInt(b.rating, 10) || 5)), text: tx, date: today(), status: "pending" });
      logAct("Review submitted for " + rb.propertyName, "guest"); return ok({ ok: true }, 201);
    }

    if (s0 === "admin") {
      var a = seg[1] || "";
      if (a === "login" && method === "POST") {
        var un = cl(b.username, 80).toLowerCase(), pw = typeof b.password === "string" ? b.password : "";
        var usr = DB.users.filter(function (x) { return x.username.toLowerCase() === un; })[0];
        return sha(pw).then(function (h) {
          if (!usr || usr.pass !== h) { logAct('Failed admin sign-in for "' + cl(b.username, 80) + '"', "system"); return bad(401, "Incorrect username or password."); }
          setSess(usr); logAct("Signed in", usr.username); return ok({ user: { id: usr.id, username: usr.username, role: usr.role }, csrf: "local" });
        });
      }
      if (a === "logout" && method === "POST") { setSess(null); return ok({ ok: true }); }
      var u = sessUser();
      if (a === "me" && method === "GET") return u ? ok({ user: u, csrf: "local" }) : bad(401, "Not signed in.");
      if (!u) return bad(401, "Please sign in.");
      var owner = u.role === "owner", needOwner = bad(403, "Only the owner can do that.");
      if (a === "data" && method === "GET") return ok(adminDump(u));
      if (a === "settings" && method === "POST") { if (!owner) return needOwner; var se = saveSettingsDb(plain(b.patch) ? b.patch : {}); return se ? bad(422, se) : ok({ settings: SV() }); }
      if (a === "save" && method === "POST" && seg[2]) {
        var items = b.items, removed = Array.isArray(b.removed) ? b.removed : [], er = "";
        if (seg[2] === "properties") er = saveProps(Array.isArray(items) ? items : [], removed);
        else if (seg[2] === "reviews") er = saveReviews(Array.isArray(items) ? items : [], removed);
        else if (seg[2] === "offers") er = saveOffers(Array.isArray(items) ? items : [], removed);
        else if (seg[2] === "enquiries") er = saveEnquiries(Array.isArray(items) ? items : [], removed);
        else if (seg[2] === "guestNotes") saveNotes(items);
        else return bad(404, "Unknown collection.");
        if (er) return bad(422, er); logAct("Saved " + seg[2], u.username); return ok({ ok: true });
      }
      if (a === "bookings" && method === "POST") {
        if (seg.length === 2) { r = bookingCreate(b, true); return r.error ? bad(422, r.error) : ok({ booking: bview(r.booking, false) }, 201); }
        if (seg.length === 4 && seg[3] === "act") { r = bookingAct(seg[2], cl(b.action, 30), plain(b.payload) ? b.payload : {}, u.username, false); return r.error ? bad(422, r.error) : ok({ booking: bview(r.booking, false) }); }
      }
      if (a === "password" && method === "POST") {
        var me = DB.users.filter(function (x) { return x.id === u.id; })[0], npw = String(b.password || "");
        return sha(String(b.current || "")).then(function (h) {
          if (me.pass !== h) return bad(422, "Current password is incorrect."); if (npw.length < 10) return bad(422, "Use at least 10 characters."); if (npw.toLowerCase() === u.username.toLowerCase()) return bad(422, "Password must not match your username.");
          return sha(npw).then(function (nh) { me.pass = nh; logAct("Password changed", u.username); return ok({ ok: true }); });
        });
      }
      if (a === "users" && method === "POST") {
        if (!owner) return needOwner; var act2 = String(b.action || "");
        if (act2 === "add") {
          var nu = cl(b.username, 40), npw2 = String(b.password || "");
          if (!/^[A-Za-z0-9._-]{3,40}$/.test(nu)) return bad(422, "Username: 3 to 40 letters, numbers, dots, dashes."); if (npw2.length < 10) return bad(422, "Password needs at least 10 characters.");
          if (DB.users.some(function (x) { return x.username.toLowerCase() === nu.toLowerCase(); })) return bad(422, "That username is taken.");
          return sha(npw2).then(function (h) { DB.users.push({ id: Math.max.apply(null, DB.users.map(function (x) { return x.id; }).concat([0])) + 1, username: nu, role: "staff", pass: h }); logAct("Staff account added: " + nu, u.username); return ok({ ok: true }); });
        }
        var tg = DB.users.filter(function (x) { return x.id === parseInt(b.id, 10); })[0]; if (!tg || tg.role === "owner") return bad(422, "Account not found.");
        if (act2 === "reset") { var rp = String(b.password || ""); if (rp.length < 10) return bad(422, "Password needs at least 10 characters."); return sha(rp).then(function (h) { tg.pass = h; logAct("Password reset for " + tg.username, u.username); return ok({ ok: true }); }); }
        if (act2 === "remove") { DB.users = DB.users.filter(function (x) { return x !== tg; }); logAct("Staff account removed: " + tg.username, u.username); return ok({ ok: true }); }
        return bad(422, "Unknown action.");
      }
      if (a === "export" && method === "GET") { if (!owner) return needOwner; var ex = adminDump(u); delete ex.users; ex.exportedAt = nowIso(); return ok(ex); }
      if (a === "cleardemo" && method === "POST") {
        if (!owner) return needOwner; ["bookings", "reviews", "enquiries", "properties", "offers"].forEach(function (k) { DB[k] = DB[k].filter(function (x) { return !x.demo; }); });
        logAct("Sample data cleared", u.username); return ok({ ok: true });
      }
      return bad(404, "Not found.");
    }
    return bad(404, "Not found.");
  }

  /* api(): drop-in for the old fetch wrapper. Reloads the database each call so several tabs stay in step. */
  function api(method, path, body) {
    return Promise.resolve().then(function () {
      DB = load(); if (!DB) return bad(500, "Storage unavailable.");
      var snap = method === "GET" ? null : JSON.stringify(DB); sweepDb();
      return Promise.resolve(route(method, path, body)).then(function (res) {
        if (method !== "GET" && !res.error && !dbSave()) { DB = JSON.parse(snap); return bad(507, "This browser's storage is full. Remove a few photos and try again."); }
        if (method === "GET") dbSave();
        return res;
      });
    }).catch(function (e) { try { console.error(e); } catch (x) {} return bad(500, "Something went wrong. Please try again."); });
  }

  /* first run: sample data */
  function seedDb() {
    var rules = ["No smoking indoors", "No parties or events", "Quiet hours 10pm to 7am", "Visitors must be registered at check-in"], t0 = Date.now(), n = 0;
    var mk = function (name, type, loc, beds, baths, guests, price, cleaning, mode, pol, am, desc, imgs, extra) {
      n++; var id = "sample" + n, slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      var p = { id: id, slug: slug, name: name, type: type, location: loc, address: "", description: desc, beds: beds, baths: baths, guests: guests, price: price, weekendPrice: "", cleaning: cleaning, weeklyPct: 0, minStay: 1, maxStay: 30, checkIn: "14:00", checkOut: "11:00",
        bookingMode: mode, cancellation: pol, status: "published", featured: n <= 3, amenities: am, rules: rules, images: imgs.map(function (f) { return "assets/photos/" + f + ".jpg"; }), blocked: [], seasons: [], host: "", demo: true, createdAt: new Date(t0 - n * 60000).toISOString().replace(/\.\d+Z$/, "Z") };
      for (var k in (extra || {})) p[k] = extra[k]; return p;
    };
    var props = [
      mk("Kyanja Modern Villa", "Family stay", "Kyanja, Kampala", 4, 4, 8, 720000, 90000, "instant", "moderate", ["Wi-Fi", "Air conditioning", "Kitchen", "TV", "Secure compound", "Generator backup", "Free parking", "Garden", "Workspace"], "A striking four-bedroom home with floor-to-ceiling glass, a timber-slat feature wall and a large paved driveway. Bright, open and made for family stays.", ["villa-modern-black-stone"], { weeklyPct: 10, weekendPrice: 780000 }),
      mk("Kololo Skyline Apartment", "Luxury apartment", "Kololo, Kampala", 2, 2, 4, 380000, 50000, "instant", "moderate", ["Wi-Fi", "Air conditioning", "Kitchen", "TV", "Secure compound", "Generator backup", "Workspace", "Balcony"], "A bright two-bedroom residence with glass balconies, a roomy lounge and reliable backup power, in one of Kampala's most sought-after areas.", ["apartment-modern-glass-balcony", "living-grey-sectional"], { weekendPrice: 420000, weeklyPct: 10 }),
      mk("Muyenga Family Villa", "Family stay", "Muyenga, Kampala", 4, 3, 8, 650000, 80000, "request", "strict", ["Wi-Fi", "Garden", "Kitchen", "Washing machine", "Free parking", "Secure compound", "Generator backup", "TV"], "A spacious four-bedroom stone-and-brick home with a double-height lounge and a big kitchen. The host approves each request.", ["house-stone-brick-porch", "living-staircase"], { minStay: 2, weeklyPct: 12 }),
      mk("Bugolobi Garden Cottage", "Premium short stay", "Bugolobi, Kampala", 1, 1, 2, 190000, 30000, "instant", "flexible", ["Wi-Fi", "Garden", "Kitchen", "Hot water", "Free parking", "Secure compound"], "A single-storey stone cottage with a calm, soft-lit bedroom, a few minutes from restaurants and the lakeside.", ["bungalow-stone-three-car", "bedroom-white-storage-bed"]),
      mk("Entebbe Lakeview Holiday Home", "Holiday home", "Entebbe", 3, 2, 6, 520000, 70000, "request", "moderate", ["Wi-Fi", "Garden", "Breakfast available", "Airport pickup", "Free parking", "Hot water"], "A relaxed holiday home with a paved courtyard, close to the lake and a short drive from the airport.", ["house-beige-brick-pavers", "bedroom-grey-tufted"]),
      mk("Ntinda Studio Retreat", "Premium short stay", "Ntinda, Kampala", 1, 1, 2, 120000, 20000, "instant", "flexible", ["Wi-Fi", "Kitchen", "Hot water", "Workspace", "TV"], "A compact, well-designed retreat for solo travellers and short work trips, with a calm bedroom and a private car port.", ["townhouse-white-modern", "bedroom-black-white"]),
      mk("Naguru Townhouse", "Family stay", "Naguru, Kampala", 3, 3, 6, 450000, 60000, "instant", "moderate", ["Wi-Fi", "Air conditioning", "Kitchen", "Free parking", "Secure compound", "Washing machine"], "A modern three-bedroom townhouse with a balcony and an open-plan kitchen, minutes from the city centre.", ["house-tile-roof-balcony", "kitchen-island"]),
      mk("Najjera Garden Bungalow", "Premium short stay", "Najjera, Kampala", 3, 2, 6, 380000, 50000, "instant", "flexible", ["Wi-Fi", "Garden", "Kitchen", "Free parking", "Hot water", "Secure compound", "TV"], "A comfortable single-storey home with a triple garage and tidy gardens, in a quiet residential street.", ["bungalow-dark-garage"]),
      mk("Kira Executive Residence", "Holiday home", "Kira, Wakiso", 4, 3, 8, 600000, 80000, "request", "moderate", ["Wi-Fi", "Garden", "Kitchen", "Washing machine", "Free parking", "Secure compound", "Generator backup", "Air conditioning"], "A large two-storey brick residence with an attached garage and room for the whole group.", ["house-brick-dark-roof"], { minStay: 2 })
    ];
    var td = today(), rv = [["sample1", "Sample Guest", 5, "Clean, quiet and exactly as described. Check-in was easy."], ["sample3", "Sample Family", 5, "Plenty of space for the whole family and a garden the children loved."], ["sample4", "Sample Traveller", 4, "A peaceful cottage close to everything."]];
    return { v: 1, settings: {}, properties: props, bookings: [], enquiries: [], activity: [], guestNotes: {}, users: [],
      offers: [{ id: "offer1", title: "Welcome offer", code: "WELCOME10", type: "pct", value: 10, minNights: 2, validFrom: "", validTo: "", propertyId: "", active: true, description: "10% off stays of 2 nights or more.", demo: true }],
      reviews: rv.map(function (r, i) { return { id: "samplerv" + i, propertyId: r[0], name: r[1], rating: r[2], text: r[3], date: td, status: "approved", demo: true }; }) };
  }
  function init() {
    DB = load() || seedDb();
    ["properties", "bookings", "reviews", "offers", "enquiries", "activity", "users"].forEach(function (k) { if (!Array.isArray(DB[k])) DB[k] = []; });
    if (!plain(DB.guestNotes)) DB.guestNotes = {}; if (!plain(DB.settings)) DB.settings = {};
    var go = DB.users.filter(function (u) { return u.role === "owner"; })[0] ? Promise.resolve() : sha(OWNER.password).then(function (h) { DB.users.unshift({ id: 1, username: OWNER.username, role: "owner", pass: h }); });
    return go.then(function () { sweepDb(); dbSave(); });
  }

  /* ---------- guest actions (token-protected) ---------- */
  function tokens() { return rd("tok", {}); }
  function setTok(ref, t) { var m = tokens(); m[ref] = t; wr("tok", m); }
  function create(d) { return api("POST", "bookings", d).then(function (j) { if (j.booking && j.token) setTok(j.booking.ref, j.token); return j; }); }
  function lookup(ref, who) { return api("POST", "bookings/lookup", { ref: ref, who: who }).then(function (j) { if (j.booking && j.token) setTok(j.booking.ref, j.token); return j; }); }
  function guestBooking(ref, t) { ref = String(ref || "").toUpperCase(); t = t || tokens()[ref] || ""; if (!ref || !t) return Promise.resolve({ error: "auth", _status: 401 }); return api("GET", "bookings/" + encodeURIComponent(ref) + "?t=" + encodeURIComponent(t)).then(function (j) { if (j.booking) { setTok(j.booking.ref, t); j.token = t; } return j; }); }
  function guestPay(ref, t, d) { d.t = t; return api("POST", "bookings/" + encodeURIComponent(ref) + "/payment", d); }
  function guestCancel(ref, t, reason) { return api("POST", "bookings/" + encodeURIComponent(ref) + "/cancel", { t: t, reason: reason }); }
  function addReview(d) { return api("POST", "reviews", d); }
  function addEnquiry(d) { return api("POST", "enquiries", d); }

  /* ---------- admin ---------- */
  function login(u, p) { return api("POST", "admin/login", { username: u, password: p }).then(function (j) { if (j.csrf) { csrf = j.csrf; C.admin = j.user; } return j; }); }
  function me() { return api("GET", "admin/me").then(function (j) { if (j.csrf) { csrf = j.csrf; C.admin = j.user; } return j; }); }
  function logout() { return api("POST", "admin/logout", {}).then(function () { csrf = ""; C.admin = null; }); }
  function adminLoad() { return api("GET", "admin/data").then(function (j) { if (!j.error) { ["properties", "bookings", "reviews", "offers", "enquiries", "activity", "guestNotes", "users", "settings"].forEach(function (k) { if (j[k] != null) C[k] = j[k]; }); } return j; }); }
  function swap(b) { var i = C.bookings.findIndex(function (x) { return x.id === b.id; }); if (i < 0) C.bookings.unshift(b); else C.bookings[i] = b; }
  function act(id, action, x) { return api("POST", "admin/bookings/" + encodeURIComponent(id) + "/act", { action: action, payload: x || {} }).then(function (j) { if (j.booking) swap(j.booking); return j; }); }
  function adminCreate(d) { return api("POST", "admin/bookings", d).then(function (j) { if (j.booking) swap(j.booking); return j; }); }
  function save(k, v) {
    var body, old = C[k];
    if (Array.isArray(v)) { var ids = v.map(function (x) { return x.id; }); body = { items: v, removed: (old || []).map(function (x) { return x.id; }).filter(function (i) { return ids.indexOf(i) < 0; }) }; } else body = { items: v };
    C[k] = v; api("POST", "admin/save/" + k, body).then(function (j) { if (j.error) { window.UI && UI.toast(j.error); adminLoad().then(function () { window.dispatchEvent(new Event("aim:reload")); }); } }); return true;
  }
  function saveSettings(patch) { var s = C.settings || {}; for (var k in patch) s[k] = patch[k]; C.settings = s; return api("POST", "admin/settings", { patch: patch }).then(function (j) { if (j.error && window.UI) UI.toast(j.error); return j; }); }
  function upload(dataUrl) { return Promise.resolve(/^data:image\/(jpeg|png|webp);/.test(dataUrl || "") && dataUrl.length < 1500000 ? { url: dataUrl } : { error: "Use a JPG, PNG or WebP photo (max about 1 MB after resizing)." }); }

  var ready = init().then(function () { return api("GET", "bootstrap"); }).then(function (j) {
    if (j.error) { C.offline = true; return; }
    ["settings", "properties", "offers", "reviews", "busy", "seo"].forEach(function (k) { if (j[k] != null) C[k] = j[k]; });
    if (Array.isArray(C.busy)) C.busy = {};
  });
  window.AIM = { ready: ready, state: C, api: api, rd: rd, wr: wr, uid: uid, iso: iso, today: today, addDays: addDays, nights: nights, dow: dow, art: art, AM_LIST: AM_LIST, POL: POL, DEF: DEF, settings: settings, saveSettings: saveSettings, log: function () {}, sweep: function () {}, money: money, fmt: fmt, fmtT: fmtT,
    props: props, prop: prop, saveProps: function (l) { return save("properties", l); }, bookings: bookings, booking: booking, conflicts: conflicts, isNightTaken: isNightTaken, nightPrice: nightPrice, quote: quote, findPromo: findPromo, validate: validate, refundFor: refundFor, guests: guests, rating: rating, applyTheme: applyTheme, BLOCKING: BLOCKING,
    list: function (k) { return C[k] || []; }, save: save, notes: function () { return C.guestNotes || {}; }, users: function () { return C.users || []; },
    create: create, lookup: lookup, guestBooking: guestBooking, guestPay: guestPay, guestCancel: guestCancel, addReview: addReview, addEnquiry: addEnquiry, tokens: tokens,
    login: login, me: me, logout: logout, adminLoad: adminLoad, act: act, adminCreate: adminCreate, upload: upload, admin: function () { return C.admin; },
    stayUrl: function (slug) { return C.seo ? "stays/" + slug : "property.html?p=" + slug; },
    wa: function (m, to) { var n = String(to || settings().whatsapp || "").replace(/\D/g, ""); if (n.length === 10 && n[0] === "0") n = "256" + n.slice(1); return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(m) : ""; } };
})();
