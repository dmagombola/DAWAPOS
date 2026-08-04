const SUPABASE_URL = 'https://uhubgveuaxyrqhhjfukj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QZwdahaJKXpUHWtO3lcMOA_5lmfOT4H';
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CLIENT_ID = 'dev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
let cloudConnected = false;
let cloudRev = 0;
let syncTimer = null;
function updateCloudStatus() { const el = document.getElementById('cloudStatus'); const txt = document.getElementById('cloudStatusText'); if (cloudConnected) { el.className = 'cloud-status connected'; txt.innerHTML = '<i class="fas fa-check-circle"></i> Cloud Connected'; } else { el.className = 'cloud-status disconnected'; txt.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline (Local Mode)'; } }
let db = { products: [], sales: [], expenses: [], suppliers: [], users: [{ id: 1, name: 'Admin', username: 'admin', password: 'admin123', role: 'admin', status: 'active', lastLogin: new Date().toISOString() }], reminders: [], settings: { pharmacyName: 'DawaPOS Pharmacy', phone: '+254 700 123 456', email: 'info@dawapos.co.ke', address: 'Nairobi, Kenya', currency: 'KES', taxRate: 16, lowStockThreshold: 10 }, currentUser: null, cart: [], discount: 0, editingCreditId: null };
function collectSyncData() { return { products: db.products, sales: db.sales, expenses: db.expenses, suppliers: db.suppliers, users: db.users, reminders: db.reminders, settings: db.settings }; }
function applySyncData(data) { if (!data) return; if (data.products) db.products = data.products; if (data.sales) db.sales = data.sales; if (data.expenses) db.expenses = data.expenses; if (data.suppliers) db.suppliers = data.suppliers; if (data.users) db.users = data.users; if (data.reminders) db.reminders = data.reminders; if (data.settings) db.settings = { ...db.settings, ...data.settings }; }
function loadData() { const saved = localStorage.getItem('dawaposDB'); if (saved) { try { applySyncData(JSON.parse(saved)); } catch (e) {} } syncFromCloud(); subscribeRealtime(); }
function saveData() { localStorage.setItem('dawaposDB', JSON.stringify(db)); queueCloudSync(); }
function queueCloudSync() { if (syncTimer) clearTimeout(syncTimer); syncTimer = setTimeout(syncToCloud, 700); }
async function syncFromCloud() { const syncEl = document.getElementById('syncStatus'); syncEl.classList.add('active'); try { const { data, error } = await sbClient.from('dawapos_store').select('*').eq('id', 1).maybeSingle(); if (error) throw error; if (data && data.data && Object.keys(data.data).length > 0) { applySyncData(data.data); cloudRev = data.rev || 0; localStorage.setItem('dawaposDB', JSON.stringify(db)); updateDashboard(); renderPOS(); showToast('Data synced from cloud!', 'success'); } else if (!localStorage.getItem('dawaposDB')) { seedData(); updateDashboard(); renderPOS(); } else { queueCloudSync(); } cloudConnected = true; } catch (err) { console.log('Cloud sync failed:', err); cloudConnected = false; if (db.products.length === 0 && !localStorage.getItem('dawaposDB')) { seedData(); updateDashboard(); renderPOS(); } } syncEl.classList.remove('active'); updateCloudStatus(); }
async function syncToCloud() { const syncEl = document.getElementById('syncStatus'); syncEl.classList.add('active'); cloudRev++; try { const { error } = await sbClient.from('dawapos_store').upsert({ id: 1, data: collectSyncData(), rev: cloudRev, origin: CLIENT_ID, updated_at: new Date().toISOString() }); if (error) throw error; cloudConnected = true; } catch (err) { console.log('Cloud save failed:', err); cloudConnected = false; showToast('Cloud save failed - saved locally, will retry', 'warning'); } syncEl.classList.remove('active'); updateCloudStatus(); }
function subscribeRealtime() { sbClient.channel('dawapos-store-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'dawapos_store' }, (payload) => { const row = payload.new; if (!row || row.origin === CLIENT_ID) return; if (row.rev && row.rev <= cloudRev) return; cloudRev = row.rev || cloudRev; applySyncData(row.data); localStorage.setItem('dawaposDB', JSON.stringify(db)); refreshVisiblePage(); showToast('Data updated from another device', 'success'); }).subscribe((status) => { if (status === 'SUBSCRIBED') { cloudConnected = true; } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { cloudConnected = false; } updateCloudStatus(); }); }
function refreshVisiblePage() { if (!db.currentUser) return; const vis = Array.from(document.querySelectorAll('.page-content')).find(p => p.style.display !== 'none'); if (vis) showPage(vis.id.replace('page-', '')); }
function forceSync() { syncToCloud().then(() => showToast('Synced to cloud!', 'success')); }
function seedData() { const now = new Date(); const nextYear = new Date(now); nextYear.setFullYear(nextYear.getFullYear() + 1); db.products = [{ id: 1, name: 'Paracetamol', category: 'Pain Relief', dose: '500mg', form: 'Tablet', price: 150, cost: 80, stock: 120, reorder: 20, batch: 'PAR-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 1, rx: 'no', image: '', desc: 'For mild to moderate pain and fever' },{ id: 2, name: 'Ibuprofen', category: 'Pain Relief', dose: '400mg', form: 'Tablet', price: 200, cost: 110, stock: 85, reorder: 15, batch: 'IBU-2026-002', expiry: nextYear.toISOString().split('T')[0], supplier: 1, rx: 'no', image: '', desc: 'Anti-inflammatory pain relief' },{ id: 3, name: 'Amoxicillin', category: 'Antibiotics', dose: '500mg', form: 'Capsule', price: 450, cost: 250, stock: 45, reorder: 10, batch: 'AMX-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 2, rx: 'yes', image: '', desc: 'Broad-spectrum antibiotic' },{ id: 4, name: 'Vitamin C', category: 'Vitamins', dose: '1000mg', form: 'Tablet', price: 350, cost: 180, stock: 200, reorder: 30, batch: 'VIT-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 3, rx: 'no', image: '', desc: 'Immune support' },{ id: 5, name: 'Cough Syrup', category: 'Cough & Cold', dose: '100ml', form: 'Syrup', price: 280, cost: 150, stock: 30, reorder: 10, batch: 'COU-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 1, rx: 'no', image: '', desc: 'Relieves dry cough' },{ id: 6, name: 'Hydrocortisone', category: 'Skin Care', dose: '1%', form: 'Cream', price: 320, cost: 170, stock: 25, reorder: 8, batch: 'HYD-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 2, rx: 'yes', image: '', desc: 'Anti-itch cream' },{ id: 7, name: 'Bandages', category: 'First Aid', dose: '10pcs', form: 'Pack', price: 120, cost: 60, stock: 50, reorder: 15, batch: 'BAN-2026-001', expiry: '2030-01-01', supplier: 3, rx: 'no', image: '', desc: 'Sterile adhesive bandages' },{ id: 8, name: 'Metformin', category: 'Chronic Care', dose: '500mg', form: 'Tablet', price: 180, cost: 95, stock: 60, reorder: 15, batch: 'MET-2026-001', expiry: nextYear.toISOString().split('T')[0], supplier: 2, rx: 'yes', image: '', desc: 'Diabetes management' }]; db.suppliers = [{ id: 1, name: 'Dawa Pharmaceuticals', contact: 'James Mwangi', phone: '+254 722 111 222', email: 'orders@dawa.co.ke', address: 'Industrial Area, Nairobi' },{ id: 2, name: 'PharmaLink Kenya', contact: 'Sarah Ochieng', phone: '+254 733 444 555', email: 'sales@pharmalink.co.ke', address: 'Mombasa Road, Nairobi' },{ id: 3, name: 'HealthFirst Distributors', contact: 'Peter Kimani', phone: '+254 711 666 777', email: 'info@healthfirst.co.ke', address: 'Westlands, Nairobi' }]; db.expenses = [{ id: 1, date: now.toISOString().split('T')[0], category: 'Rent', desc: 'Monthly shop rent', amount: 45000, by: 'Admin' },{ id: 2, date: now.toISOString().split('T')[0], category: 'Utilities', desc: 'Electricity bill', amount: 8500, by: 'Admin' }]; const currentYear = now.getFullYear(); db.reminders = [{ id: Date.now() + 1, title: 'Pharmacy Council Business Permit Renewal', date: `${currentYear}-12-31`, type: 'regulatory', recurring: 'yearly', completed: false, notes: 'Annual permit renewal with Pharmacy Council of Kenya' },{ id: Date.now() + 2, title: 'Q1 Quarterly Compliance (31st March)', date: `${currentYear}-03-31`, type: 'quarterly', recurring: 'quarterly', completed: false, notes: 'Quarterly regulatory compliance submission' },{ id: Date.now() + 3, title: 'Q2 Quarterly Compliance (30th June)', date: `${currentYear}-06-30`, type: 'quarterly', recurring: 'quarterly', completed: false, notes: 'Quarterly regulatory compliance submission' },{ id: Date.now() + 4, title: 'Q3 Quarterly Compliance (30th September)', date: `${currentYear}-09-30`, type: 'quarterly', recurring: 'quarterly', completed: false, notes: 'Quarterly regulatory compliance submission' },{ id: Date.now() + 5, title: 'Q4 Quarterly Compliance (31st December)', date: `${currentYear}-12-31`, type: 'quarterly', recurring: 'quarterly', completed: false, notes: 'Quarterly regulatory compliance submission' }]; saveData(); }
function togglePwd() { const input = document.getElementById('loginPass'); const icon = document.querySelector('.toggle-pwd'); if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); } else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); } }
function doLogin() { const user = document.getElementById('loginUser').value.trim(); const pass = document.getElementById('loginPass').value; const role = document.querySelector('input[name="role"]:checked').value; const found = db.users.find(u => u.username === user && u.password === pass && u.role === role && u.status === 'active'); if (!found) { showToast('Invalid credentials or role!', 'error'); return; } db.currentUser = found; found.lastLogin = new Date().toISOString(); saveData(); document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; document.getElementById('userName').textContent = found.name; document.getElementById('userRole').textContent = found.role === 'admin' ? 'Administrator' : 'Cashier'; document.getElementById('userAvatar').textContent = found.name.charAt(0).toUpperCase(); if (found.role === 'cashier') { document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none'); } showPage('dashboard'); showToast(`Welcome back, ${found.name}!`, 'success'); }
function doLogout() { db.currentUser = null; document.getElementById('appContainer').style.display = 'none'; document.getElementById('loginScreen').style.display = 'flex'; document.getElementById('loginPass').value = ''; document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex'); }
let currentPage = 'dashboard';
function showPage(page) { currentPage = page; document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none'); document.getElementById('page-' + page).style.display = 'block'; document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active'); const titles = { dashboard: 'Dashboard', pos: 'Point of Sale', inventory: 'Inventory', credits: 'Credit Accounts', history: 'Sales History', analytics: 'Analytics', expenses: 'Expenses', reminders: 'Reminders', suppliers: 'Suppliers', users: 'Users', settings: 'Settings' }; document.getElementById('pageTitle').textContent = titles[page] || page; if (page === 'dashboard') updateDashboard(); if (page === 'pos') { renderPOS(); setTimeout(updatePaymentSplit, 100); } if (page === 'inventory') renderInventory(); if (page === 'credits') renderCredits(); if (page === 'history') renderHistory(); if (page === 'analytics') updateAnalytics(); if (page === 'expenses') renderExpenses(); if (page === 'reminders') renderReminders(); if (page === 'suppliers') renderSuppliers(); if (page === 'users') renderUsers(); if (page === 'settings') loadSettings(); }
function toggleMobileMenu() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); }
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="100%" height="100%" fill="#e8f6f5"/><text x="50%" y="55%" font-size="44" text-anchor="middle" fill="#0d7377">Rx</text></svg>');
function fmt(n) { return `${db.settings.currency} ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function offsetDate(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1; }
function val(id) { return parseFloat(document.getElementById(id).value) || 0; }
function emptyRow(msg) { return '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-inbox"></i><h4>' + msg + '</h4></div></td></tr>'; }
function showToast(msg, type = 'success') { const c = document.getElementById('toastContainer'); const t = document.createElement('div'); t.className = 'toast ' + type; const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' }; const colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)' }; t.innerHTML = `<i class="fas ${icons[type] || icons.success}" style="color: ${colors[type] || colors.success};"></i><span>${msg}</span>`; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== POINT OF SALE =====
let posFilter = 'all';
let posSearch = '';
function filterPOS(cat) { posFilter = cat; document.querySelectorAll('#posCategories button').forEach(b => b.classList.toggle('active', b.textContent.trim() === (cat === 'all' ? 'All' : cat))); renderPOS(); }
function renderPOS() { const grid = document.getElementById('posProductsGrid'); const prods = db.products.filter(p => (posFilter === 'all' || p.category === posFilter) && (!posSearch || p.name.toLowerCase().includes(posSearch) || (p.dose || '').toLowerCase().includes(posSearch) || (p.batch || '').toLowerCase().includes(posSearch))).sort((a, b) => a.name.localeCompare(b.name));
 if (!prods.length) { grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-box-open"></i><h4>No products</h4><p>Add products in Inventory first</p></div>'; renderCart(); return; }
 grid.innerHTML = prods.map(p => { const days = Math.ceil((new Date(p.expiry) - new Date()) / 86400000); const expBadge = p.expiry ? (days < 0 ? '<span class="expiry-badge">EXPIRED</span>' : days <= 30 ? '<span class="expiry-badge warning">EXP SOON</span>' : '') : '';
  return `<div class="product-card" onclick="addToCart(${p.id})">${expBadge}<img class="prod-img" src="${p.image || PLACEHOLDER_IMG}" onerror="this.src=PLACEHOLDER_IMG"><div class="prod-name">${p.name}</div><div class="prod-dose">${p.dose} &bull; ${p.form}</div><div class="prod-price">${fmt(p.price)}</div><div class="prod-stock ${p.stock <= p.reorder ? 'low' : ''}">Stock: ${p.stock}</div></div>`; }).join('');
 renderCart(); }
function addToCart(id) { const p = db.products.find(x => x.id === id); if (!p) return; if (p.stock <= 0) { showToast('Out of stock!', 'error'); return; }
 const item = db.cart.find(i => i.id === id);
 if (item) { if (item.qty >= p.stock) { showToast('Not enough stock!', 'warning'); return; } item.qty++; }
 else { db.cart.push({ id: p.id, name: p.name, dose: p.dose, price: p.price, cost: p.cost || 0, qty: 1 }); }
 renderCart(); }
function changeQty(id, delta) { const item = db.cart.find(i => i.id === id); if (!item) return; const p = db.products.find(x => x.id === id);
 item.qty += delta; if (p && item.qty > p.stock) { item.qty = p.stock; showToast('Not enough stock!', 'warning'); }
 if (item.qty <= 0) db.cart = db.cart.filter(i => i.id !== id); renderCart(); }
function removeCartItem(id) { db.cart = db.cart.filter(i => i.id !== id); renderCart(); }
function cartTotals() { const subtotal = db.cart.reduce((s, i) => s + i.price * i.qty, 0); const discountAmt = subtotal * (db.discount || 0) / 100; return { subtotal, discountAmt, total: subtotal - discountAmt }; }
function applyDiscount() { const v = parseFloat(document.getElementById('discountInput').value) || 0; db.discount = Math.min(100, Math.max(0, v)); renderCart(); showToast(`Discount of ${db.discount}% applied`, 'success'); }
function renderCart() { const wrap = document.getElementById('cartItems'); const t = cartTotals();
 document.getElementById('cartCount').textContent = `${db.cart.reduce((s, i) => s + i.qty, 0)} items`;
 if (!db.cart.length) { wrap.innerHTML = '<div class="empty-state"><i class="fas fa-basket-shopping"></i><h4>Cart is empty</h4><p>Click on products to add them</p></div>'; }
 else { wrap.innerHTML = db.cart.map(i => `<div class="cart-item"><div class="cart-item-info"><div class="name">${i.name}</div><div class="dose">${i.dose}</div><div class="price">${fmt(i.price)}</div></div><div class="cart-item-qty"><button onclick="changeQty(${i.id}, -1)">-</button><span>${i.qty}</span><button onclick="changeQty(${i.id}, 1)">+</button></div><div class="cart-item-actions"><i class="fas fa-trash remove-btn" onclick="removeCartItem(${i.id})"></i><div class="item-total">${fmt(i.price * i.qty)}</div></div></div>`).join(''); }
 document.getElementById('cartSubtotal').textContent = fmt(t.subtotal);
 document.getElementById('discountRow').style.display = t.discountAmt > 0 ? 'flex' : 'none';
 document.getElementById('cartDiscount').textContent = '-' + fmt(t.discountAmt);
 document.getElementById('cartTotal').textContent = fmt(t.total);
 updatePaymentSplit(); }
function getPayAlloc() { return { cash: val('payCashAmt'), mpesa: val('payMpesaAmt'), card: val('payCardAmt'), insurance: val('payInsuranceAmt'), credit: val('payCreditAmt') }; }
function setPayAlloc(a) { document.getElementById('payCashAmt').value = a.cash || 0; document.getElementById('payMpesaAmt').value = a.mpesa || 0; document.getElementById('payCardAmt').value = a.card || 0; document.getElementById('payInsuranceAmt').value = a.insurance || 0; document.getElementById('payCreditAmt').value = a.credit || 0; }
function autoFillPayment(mode) { const t = cartTotals(); const a = getPayAlloc(); const others = Object.keys(a).filter(k => k !== mode).reduce((s, k) => s + a[k], 0); a[mode] = Math.max(0, +(t.total - others).toFixed(2)); setPayAlloc(a); updatePaymentSplit(); }
function creditDetailsValid() { return document.getElementById('creditCustomerName').value.trim() && document.getElementById('creditCustomerPhone').value.trim() && document.getElementById('creditDueDate').value; }
function updatePaymentSplit() { const t = cartTotals(); const a = getPayAlloc(); const allocated = Object.values(a).reduce((s, v) => s + v, 0); const balance = +(t.total - allocated).toFixed(2);
 document.getElementById('allocatedAmt').textContent = fmt(allocated);
 document.getElementById('balanceAmt').textContent = fmt(Math.abs(balance));
 const lbl = document.getElementById('balanceLabel'); lbl.className = Math.abs(balance) < 0.005 ? 'balanced' : 'unbalanced';
 lbl.childNodes[0].textContent = balance > 0.005 ? 'Balance: ' : (balance < -0.005 ? 'Overpaid: ' : 'Balanced: ');
 document.getElementById('creditDetailsBox').style.display = a.credit > 0 ? 'block' : 'none';
 const ok = db.cart.length > 0 && Math.abs(balance) < 0.005 && (a.credit <= 0 || creditDetailsValid());
 document.getElementById('checkoutBtn').disabled = !ok; }
function processCheckout() { if (!db.cart.length) return; const t = cartTotals(); const a = getPayAlloc();
 const allocated = Object.values(a).reduce((s, v) => s + v, 0);
 if (Math.abs(t.total - allocated) >= 0.005) { showToast('Payment allocation must match the total!', 'error'); return; }
 for (const i of db.cart) { const p = db.products.find(x => x.id === i.id); if (!p || p.stock < i.qty) { showToast(`Insufficient stock: ${i.name}`, 'error'); return; } }
 let creditDetails = null;
 if (a.credit > 0) { creditDetails = { name: document.getElementById('creditCustomerName').value.trim(), phone: document.getElementById('creditCustomerPhone').value.trim(), dueDate: document.getElementById('creditDueDate').value, notes: document.getElementById('creditNotes').value.trim() };
  if (!creditDetails.name || !creditDetails.phone || !creditDetails.dueDate) { showToast('Fill in all credit customer details!', 'error'); return; } }
 db.cart.forEach(i => { const p = db.products.find(x => x.id === i.id); if (p) p.stock -= i.qty; });
 const saleId = nextId(db.sales);
 const custPhoneEl = document.getElementById('custSmsPhone'); const enteredPhone = custPhoneEl ? custPhoneEl.value.trim() : '';
 const sale = { id: saleId, receipt: 'RCP-' + String(saleId).padStart(4, '0'), date: new Date().toISOString(), items: db.cart.map(i => ({ ...i, total: +(i.price * i.qty).toFixed(2) })), subtotal: +t.subtotal.toFixed(2), discount: db.discount || 0, discountAmt: +t.discountAmt.toFixed(2), total: +t.total.toFixed(2), payments: a, creditDetails, settlements: [], by: db.currentUser ? db.currentUser.name : 'Unknown', status: 'completed', customerPhone: enteredPhone || (creditDetails ? creditDetails.phone : '') };
 db.sales.push(sale); db.cart = []; db.discount = 0;
 document.getElementById('discountInput').value = ''; setPayAlloc({});
 ['creditCustomerName', 'creditCustomerPhone', 'creditDueDate', 'creditNotes'].forEach(id => document.getElementById(id).value = '');
 saveData(); renderPOS(); updateDashboard(); showReceipt(sale); showToast('Sale completed!', 'success');
 if (sale.customerPhone && db.settings.smsEnabled !== false) { sendGatewaySms(sale, sale.customerPhone); }
 if (custPhoneEl) custPhoneEl.value = ''; }
function showReceipt(sale) { if (!sale) return; const payLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', insurance: 'Insurance', credit: 'Credit' };
 const pays = Object.entries(sale.payments).filter(([, v]) => v > 0).map(([k, v]) => `<div class="receipt-row"><span>${payLabels[k]}</span><span>${fmt(v)}</span></div>`).join('');
 document.getElementById('receiptBody').innerHTML = `<div class="receipt"><div class="receipt-header"><h2>${db.settings.pharmacyName}</h2><p>${db.settings.address}<br>${db.settings.phone}</p></div><hr class="receipt-divider"><div class="receipt-row"><span>Receipt:</span><span>${sale.receipt}</span></div><div class="receipt-row"><span>Date:</span><span>${new Date(sale.date).toLocaleString()}</span></div><div class="receipt-row"><span>Served by:</span><span>${sale.by}</span></div><hr class="receipt-divider">${sale.items.map(i => `<div class="receipt-row"><span>${i.name} ${i.dose} x${i.qty}</span><span>${fmt(i.total)}</span></div>`).join('')}<hr class="receipt-divider"><div class="receipt-row"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>${sale.discountAmt > 0 ? `<div class="receipt-row"><span>Discount (${sale.discount}%)</span><span>-${fmt(sale.discountAmt)}</span></div>` : ''}<div class="receipt-row bold"><span>TOTAL</span><span>${fmt(sale.total)}</span></div><hr class="receipt-divider">${pays}${sale.creditDetails ? `<div class="receipt-row"><span>Credit to:</span><span>${sale.creditDetails.name}</span></div><div class="receipt-row"><span>Due:</span><span>${sale.creditDetails.dueDate}</span></div>` : ''}<div class="receipt-footer"><p>Thank you for your business!<br>Powered by DawaPOS</p></div></div>`;
 window._currentReceiptSaleId = sale.id; const ph = document.getElementById('receiptSmsPhone'); if (ph) ph.value = sale.customerPhone || (sale.creditDetails && sale.creditDetails.phone) || ''; updateReceiptSmsStatus(sale); openModal('receiptModal'); }
function printReceipt() { window.print(); }

// ===== RECEIPT SHARING & INVOICES =====
window._currentReceiptSaleId = null;
window._invoiceSaleId = null;
function receiptToText(sale) { const s = db.settings; const line = '--------------------------------';
 const payLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', insurance: 'Insurance', credit: 'Credit' };
 let t = `${s.pharmacyName}\n${s.address} | ${s.phone}\n${line}\nRECEIPT ${sale.receipt}\n${new Date(sale.date).toLocaleString()}\nServed by: ${sale.by}\n${line}\n`;
 sale.items.forEach(i => { t += `${i.name} ${i.dose} x${i.qty}  ${fmt(i.total)}\n`; });
 t += line + '\n';
 if (sale.discountAmt > 0) t += `Subtotal: ${fmt(sale.subtotal)}\nDiscount (${sale.discount}%): -${fmt(sale.discountAmt)}\n`;
 t += `TOTAL: ${fmt(sale.total)}\n` + Object.entries(sale.payments).filter(([, v]) => v > 0).map(([k, v]) => `${payLabels[k]}: ${fmt(v)}`).join('\n');
 if (sale.creditDetails) { const ci = creditInfo(sale); if (ci.balance > 0.005) t += `\nBalance due: ${fmt(ci.balance)} by ${sale.creditDetails.dueDate}`; }
 t += `\n${line}\nThank you for your business!`;
 return t; }
function sendReceiptSMS() { const sale = db.sales.find(x => x.id === window._currentReceiptSaleId);
 if (!sale) { showToast('No receipt to send', 'error'); return; }
 const phone = (document.getElementById('receiptSmsPhone').value || '').trim();
 window.location.href = `sms:${phone}?body=${encodeURIComponent(receiptToText(sale))}`;
 showToast('Opening your messaging app...', 'success'); }
function sendReceiptWhatsApp() { const sale = db.sales.find(x => x.id === window._currentReceiptSaleId);
 if (!sale) { showToast('No receipt to send', 'error'); return; }
 let phone = (document.getElementById('receiptSmsPhone').value || '').replace(/[^0-9]/g, '');
 let cc = '254'; const sp = (db.settings.phone || '').replace(/[^0-9]/g, '');
 if (sp && !sp.startsWith('0') && sp.length >= 11) cc = sp.slice(0, 3);
 if (phone.startsWith('0')) phone = cc + phone.slice(1);
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(receiptToText(sale))}`, '_blank'); }
function openInvoice(saleId) { const sale = db.sales.find(x => x.id === saleId);
 if (!sale) { showToast('Sale not found', 'error'); return; }
 window._invoiceSaleId = saleId;
 const cd = sale.creditDetails || {};
 const prevName = document.getElementById('invCustName'); const prevPhone = document.getElementById('invCustPhone');
 document.getElementById('invoiceBody').innerHTML = `<div class="inv-edit-row no-print"><input type="text" id="invCustName" placeholder="Customer name" value="${(prevName ? prevName.value : (cd.name || '')).replace(/"/g, '&quot;')}"><input type="tel" id="invCustPhone" placeholder="Customer phone" value="${(prevPhone ? prevPhone.value : (cd.phone || '')).replace(/"/g, '&quot;')}"><button class="btn btn-outline" onclick="renderInvoice()"><i class="fas fa-check"></i> Update</button></div><div id="invoiceSheetWrap"></div>`;
 renderInvoice(); openModal('invoiceModal'); }
function renderInvoice() { const sale = db.sales.find(x => x.id === window._invoiceSaleId); if (!sale) return; const s = db.settings;
 const custName = document.getElementById('invCustName').value.trim() || 'Walk-in Customer';
 const custPhone = document.getElementById('invCustPhone').value.trim();
 const invNo = 'INV-' + String(sale.id).padStart(4, '0');
 const creditAmt = (sale.payments && sale.payments.credit) || 0;
 const paid = creditAmt > 0 ? creditInfo(sale).paid + (sale.total - creditAmt) : sale.total;
 const balance = +(sale.total - paid).toFixed(2);
 const status = balance <= 0.005 ? '<span class="inv-status paid">PAID</span>' : (paid > 0 ? '<span class="inv-status partial">PARTIALLY PAID</span>' : '<span class="inv-status unpaid">UNPAID</span>');
 const esc = v => String(v).replace(/</g, '&lt;');
 document.getElementById('invoiceSheetWrap').innerHTML = `<div class="invoice-sheet">
 <div class="inv-top"><div class="inv-brand"><h2>${esc(s.pharmacyName)}</h2><p>${esc(s.address)}<br>${esc(s.phone)}${s.email ? '<br>' + esc(s.email) : ''}</p></div>
 <div class="inv-title"><h1>INVOICE</h1><p>${invNo}<br>Date: ${new Date(sale.date).toLocaleDateString()}${sale.creditDetails && sale.creditDetails.dueDate ? '<br>Due: ' + sale.creditDetails.dueDate : ''}<br>${status}</p></div></div>
 <div class="inv-parties"><div><div class="label">Bill To</div><div class="name">${esc(custName)}</div>${custPhone ? `<div class="det">${esc(custPhone)}</div>` : ''}</div><div><div class="label">Served By</div><div class="name">${esc(sale.by)}</div><div class="det">Ref: ${sale.receipt}</div></div></div>
 <table class="inv-table"><thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead><tbody>
 ${sale.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)} ${esc(i.dose)}</td><td class="num">${i.qty}</td><td class="num">${fmt(i.price)}</td><td class="num">${fmt(i.total)}</td></tr>`).join('')}
 </tbody></table>
 <div class="inv-totals"><div class="row"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>
 ${sale.discountAmt > 0 ? `<div class="row"><span>Discount (${sale.discount}%)</span><span>-${fmt(sale.discountAmt)}</span></div>` : ''}
 <div class="row grand"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
 <div class="row"><span>Amount Paid</span><span>${fmt(paid)}</span></div>
 ${balance > 0.005 ? `<div class="row balance"><span>Balance Due</span><span>${fmt(balance)}</span></div>` : ''}</div>
 <div class="inv-foot">Thank you for your business!<br>${esc(s.pharmacyName)} &mdash; powered by DawaPOS</div></div>`; }
function printInvoice() { window.print(); }

// ===== SMS GATEWAY (automatic transactional receipts) =====
const DEFAULT_SMS_TEMPLATE = '{business}: Receipt {receipt} ({date}). Items: {itemCount}. Total: {total}. Paid: {payments}. {balance}Thank you!';
function defaultCountryCode() { if (db.settings.smsCountryCode) return db.settings.smsCountryCode; const sp = (db.settings.phone || '').replace(/[^0-9]/g, ''); return (sp && !sp.startsWith('0') && sp.length >= 11) ? sp.slice(0, 3) : '255'; }
function normalizePhoneLocal(raw) { let d = (raw || '').replace(/[^0-9]/g, ''); if (!d) return null; if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = defaultCountryCode() + d.slice(1); return (d.length >= 9 && d.length <= 15) ? '+' + d : null; }
function fillSmsTemplate(tpl, sale) { const payLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', insurance: 'Insurance', credit: 'Credit' };
 const pays = Object.entries(sale.payments).filter(([, v]) => v > 0).map(([k, v]) => payLabels[k] + ' ' + fmt(v)).join(', ');
 let balance = '';
 if (sale.creditDetails) { const ci = creditInfo(sale); if (ci.balance > 0.005) balance = `Balance due: ${fmt(ci.balance)} by ${sale.creditDetails.dueDate}. `; }
 const map = { business: db.settings.pharmacyName, receipt: sale.receipt, date: new Date(sale.date).toLocaleDateString(), items: sale.items.map(i => `${i.name} x${i.qty}`).join(', '), itemCount: sale.items.reduce((n, i) => n + i.qty, 0), total: fmt(sale.total), payments: pays, balance, customer: (sale.creditDetails && sale.creditDetails.name) || '' };
 return String(tpl || DEFAULT_SMS_TEMPLATE).replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? String(map[k]) : m)); }
async function sendGatewaySms(sale, phoneRaw) { const phone = normalizePhoneLocal(phoneRaw);
 if (!phone) { sale.smsStatus = 'failed'; sale.smsError = 'invalid phone number'; saveData(); updateReceiptSmsStatus(sale); return; }
 sale.smsStatus = 'pending'; sale.customerPhone = phone; saveData(); updateReceiptSmsStatus(sale);
 try { const { data, error } = await sbClient.functions.invoke('send-sms', { body: { saleId: sale.id, receipt: sale.receipt, phone, message: fillSmsTemplate(db.settings.smsTemplate, sale), provider: db.settings.smsProvider || 'africastalking', defaultCc: defaultCountryCode() } });
  if (error) throw error;
  sale.smsStatus = (data && data.status) || 'sent'; sale.smsGatewayId = data && data.gatewayId; sale.smsError = (data && data.error) || null;
  if (sale.smsStatus === 'test') showToast('SMS logged in TEST mode (add provider credentials to go live)', 'warning');
  else if (sale.smsStatus === 'sent') showToast('Receipt SMS sent to ' + phone, 'success');
  else showToast('SMS failed: ' + (sale.smsError || 'unknown error'), 'error'); }
 catch (e) { console.error('SMS gateway error', e); sale.smsStatus = 'failed'; sale.smsError = String((e && e.message) || e); showToast('SMS send failed - the sale is not affected', 'warning'); }
 saveData(); updateReceiptSmsStatus(sale); }
function updateReceiptSmsStatus(sale) { const el = document.getElementById('receiptSmsStatus'); if (!el) return;
 if (!sale || !sale.customerPhone) { el.textContent = ''; return; }
 const map = { pending: ['Sending receipt SMS...', 'var(--warning)'], sent: ['Receipt SMS sent to ' + sale.customerPhone, 'var(--success)'], test: ['SMS logged (TEST mode) for ' + sale.customerPhone, 'var(--info)'], failed: ['SMS failed: ' + (sale.smsError || 'error') + ' - tap Auto-SMS to retry', 'var(--danger)'] };
 const m = map[sale.smsStatus]; el.textContent = m ? m[0] : ''; el.style.color = m ? m[1] : 'var(--gray)'; }
function resendGatewaySms() { const sale = db.sales.find(x => x.id === window._currentReceiptSaleId); if (!sale) { showToast('No receipt loaded', 'error'); return; }
 const phone = document.getElementById('receiptSmsPhone').value.trim() || sale.customerPhone;
 if (!phone) { showToast('Enter the customer phone number first', 'error'); return; }
 sendGatewaySms(sale, phone); }

