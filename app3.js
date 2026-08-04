// ===== EXPENSES =====
function renderExpenses() { const q = (document.getElementById('expSearch').value || '').toLowerCase(); const cat = document.getElementById('expCategory').value; const tbody = document.getElementById('expensesTable');
 let list = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date)).filter(e => (!q || e.desc.toLowerCase().includes(q)) && (!cat || e.category === cat));
 tbody.innerHTML = list.length ? list.map(e => `<tr><td>${e.date}</td><td><span class="badge badge-info">${e.category}</span></td><td>${e.desc}</td><td><strong>${fmt(e.amount)}</strong></td><td>${e.by || '-'}</td><td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></td></tr>`).join('') : emptyRow('No expenses recorded'); }
function openExpenseModal() { document.getElementById('expDate').value = todayStr(); document.getElementById('expDesc').value = ''; document.getElementById('expAmount').value = ''; openModal('expenseModal'); }
function saveExpense() { const desc = document.getElementById('expDesc').value.trim(); const amount = val('expAmount');
 if (!desc || amount <= 0) { showToast('Enter a description and a valid amount!', 'error'); return; }
 db.expenses.push({ id: nextId(db.expenses), date: document.getElementById('expDate').value || todayStr(), category: document.getElementById('expCategoryInput').value, desc, amount, by: db.currentUser ? db.currentUser.name : 'Unknown' });
 saveData(); closeModal('expenseModal'); renderExpenses(); showToast('Expense saved!', 'success'); }
function deleteExpense(id) { if (!confirm('Delete this expense?')) return; db.expenses = db.expenses.filter(e => e.id !== id); saveData(); renderExpenses(); showToast('Expense deleted', 'success'); }

// ===== REMINDERS =====
let reminderTab = 'all';
function switchReminderTab(tab) { reminderTab = tab; const map = { all: 'all reminders', regulatory: 'regulatory', quarterly: 'quarterly', credit: 'credit due' }; document.querySelectorAll('#page-reminders .tab').forEach(t => t.classList.toggle('active', t.textContent.trim().toLowerCase() === map[tab])); renderReminders(); }
function renderReminders() { const wrap = document.getElementById('remindersList'); let html = '';
 if (reminderTab !== 'credit') { let list = [...db.reminders].sort((a, b) => a.date.localeCompare(b.date));
  if (reminderTab !== 'all') list = list.filter(r => r.type === reminderTab);
  html += list.map(r => { const overdue = !r.completed && r.date < todayStr(); const cls = r.completed ? 'done' : overdue ? 'overdue' : 'upcoming';
   const iconCls = r.type === 'quarterly' ? 'quarterly' : r.type === 'regulatory' ? 'regulatory' : 'credit';
   const icon = r.type === 'quarterly' ? 'fa-calendar-week' : r.type === 'regulatory' ? 'fa-file-shield' : 'fa-bell';
   return `<div class="reminder-card"><div class="reminder-icon ${iconCls}"><i class="fas ${icon}"></i></div><div class="reminder-info"><div class="title">${r.title}</div><div class="meta">${r.type} &bull; ${r.recurring && r.recurring !== 'none' ? 'Repeats ' + r.recurring : 'One-time'}${r.notes ? ' &bull; ' + r.notes : ''}</div></div><div class="reminder-date ${cls}">${r.completed ? 'DONE' : r.date}</div><div style="display: flex; gap: 6px;">${!r.completed ? `<button class="btn btn-success btn-sm btn-icon" onclick="completeReminder(${r.id})" title="Mark done"><i class="fas fa-check"></i></button>` : ''}<button class="btn btn-danger btn-sm btn-icon" onclick="deleteReminder(${r.id})" title="Delete"><i class="fas fa-trash"></i></button></div></div>`; }).join(''); }
 if (reminderTab === 'all' || reminderTab === 'credit') {
  const credits = db.sales.filter(s => s.payments && s.payments.credit > 0 && s.status !== 'returned').map(s => ({ s, ci: creditInfo(s) })).filter(x => x.ci.balance > 0.005).sort((a, b) => ((a.s.creditDetails && a.s.creditDetails.dueDate) || '').localeCompare((b.s.creditDetails && b.s.creditDetails.dueDate) || ''));
  html += credits.map(x => { const pct = x.ci.creditAmt ? Math.min(100, Math.round(x.ci.paid / x.ci.creditAmt * 100)) : 0;
   return `<div class="reminder-card"><div class="reminder-icon credit"><i class="fas fa-handshake"></i></div><div class="reminder-info"><div class="title">Credit due: ${(x.s.creditDetails && x.s.creditDetails.name) || 'Customer'}</div><div class="meta">${x.s.receipt} &bull; Balance ${fmt(x.ci.balance)} &bull; ${(x.s.creditDetails && x.s.creditDetails.phone) || ''}</div><div class="credit-progress"><div class="credit-progress-bar" style="width: ${pct}%"></div></div></div><div class="reminder-date ${x.ci.overdue ? 'overdue' : 'upcoming'}">${(x.s.creditDetails && x.s.creditDetails.dueDate) || '-'}</div><button class="btn btn-primary btn-sm" onclick="openSettleModal(${x.s.id})">Pay</button></div>`; }).join(''); }
 wrap.innerHTML = html || '<div class="empty-state"><i class="fas fa-bell-slash"></i><h4>No reminders</h4></div>'; }
function completeReminder(id) { const r = db.reminders.find(x => x.id === id); if (!r) return; r.completed = true;
 if (r.recurring && r.recurring !== 'none') { const next = new Date(r.date + 'T12:00:00');
  const map = { daily: () => next.setDate(next.getDate() + 1), weekly: () => next.setDate(next.getDate() + 7), monthly: () => next.setMonth(next.getMonth() + 1), quarterly: () => next.setMonth(next.getMonth() + 3), yearly: () => next.setFullYear(next.getFullYear() + 1) };
  if (map[r.recurring]) map[r.recurring]();
  db.reminders.push({ ...r, id: nextId(db.reminders), date: next.toISOString().split('T')[0], completed: false }); }
 saveData(); renderReminders(); updateDashboard(); showToast('Reminder completed', 'success'); }
function openReminderModal() { document.getElementById('remTitle').value = ''; document.getElementById('remNotes').value = ''; document.getElementById('remDate').value = todayStr(); openModal('reminderModal'); }
function saveReminder() { const title = document.getElementById('remTitle').value.trim();
 if (!title) { showToast('Title is required!', 'error'); return; }
 db.reminders.push({ id: nextId(db.reminders), title, type: document.getElementById('remType').value, date: document.getElementById('remDate').value || todayStr(), recurring: document.getElementById('remRecurring').value, notes: document.getElementById('remNotes').value.trim(), completed: false });
 saveData(); closeModal('reminderModal'); renderReminders(); updateDashboard(); showToast('Reminder saved!', 'success'); }
function deleteReminder(id) { if (!confirm('Delete this reminder?')) return; db.reminders = db.reminders.filter(r => r.id !== id); saveData(); renderReminders(); updateDashboard(); showToast('Reminder deleted', 'success'); }

// ===== SUPPLIERS =====
function renderSuppliers() { const tbody = document.getElementById('suppliersTable');
 tbody.innerHTML = db.suppliers.length ? db.suppliers.map(s => { const prodCount = db.products.filter(p => String(p.supplier) === String(s.id)).length;
  return `<tr><td><strong>${s.name}</strong></td><td>${s.contact || '-'}</td><td>${s.phone || '-'}</td><td>${s.email || '-'}</td><td>${prodCount} product(s)</td><td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button></td></tr>`; }).join('') : emptyRow('No suppliers added'); }
function openSupplierModal() { ['supName', 'supContact', 'supPhone', 'supEmail', 'supAddress'].forEach(id => document.getElementById(id).value = ''); openModal('supplierModal'); }
function saveSupplier() { const name = document.getElementById('supName').value.trim();
 if (!name) { showToast('Company name is required!', 'error'); return; }
 db.suppliers.push({ id: nextId(db.suppliers), name, contact: document.getElementById('supContact').value.trim(), phone: document.getElementById('supPhone').value.trim(), email: document.getElementById('supEmail').value.trim(), address: document.getElementById('supAddress').value.trim() });
 saveData(); closeModal('supplierModal'); renderSuppliers(); showToast('Supplier saved!', 'success'); }
function deleteSupplier(id) { if (!confirm('Delete this supplier?')) return; db.suppliers = db.suppliers.filter(s => s.id !== id); saveData(); renderSuppliers(); showToast('Supplier deleted', 'success'); }

// ===== USERS =====
function renderUsers() { const tbody = document.getElementById('usersTable');
 tbody.innerHTML = db.users.map(u => `<tr><td><strong>${u.name}</strong></td><td>${u.username}</td><td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}">${u.role.toUpperCase()}</span></td><td><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status.toUpperCase()}</span></td><td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td><td>${db.currentUser && u.id === db.currentUser.id ? '<span class="badge badge-info">You</span>' : `<button class="btn btn-outline btn-sm" onclick="toggleUserStatus(${u.id})">${u.status === 'active' ? 'Disable' : 'Enable'}</button> <button class="btn btn-danger btn-sm btn-icon" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>`}</td></tr>`).join(''); }
function openUserModal() { ['usrName', 'usrUser', 'usrPass'].forEach(id => document.getElementById(id).value = ''); openModal('userModal'); }
function saveUser() { const name = document.getElementById('usrName').value.trim(); const username = document.getElementById('usrUser').value.trim(); const pass = document.getElementById('usrPass').value;
 if (!name || !username || pass.length < 6) { showToast('Fill all fields (password min 6 characters)!', 'error'); return; }
 if (db.users.some(u => u.username === username)) { showToast('Username already exists!', 'error'); return; }
 db.users.push({ id: nextId(db.users), name, username, password: pass, role: document.getElementById('usrRole').value, status: 'active', lastLogin: null });
 saveData(); closeModal('userModal'); renderUsers(); showToast('User added!', 'success'); }
function toggleUserStatus(id) { const u = db.users.find(x => x.id === id); if (!u) return; u.status = u.status === 'active' ? 'disabled' : 'active'; saveData(); renderUsers(); showToast(`User ${u.status}`, 'success'); }
function deleteUser(id) { if (!confirm('Delete this user?')) return; db.users = db.users.filter(u => u.id !== id); saveData(); renderUsers(); showToast('User deleted', 'success'); }

// ===== SETTINGS =====
function loadSettings() { document.getElementById('setPharmacyName').value = db.settings.pharmacyName; document.getElementById('setPhone').value = db.settings.phone; document.getElementById('setEmail').value = db.settings.email; document.getElementById('setAddress').value = db.settings.address; document.getElementById('setCurrency').value = db.settings.currency; document.getElementById('setTax').value = db.settings.taxRate; document.getElementById('setThreshold').value = db.settings.lowStockThreshold;
 document.getElementById('setSmsEnabled').checked = db.settings.smsEnabled !== false;
 document.getElementById('setSmsProvider').value = db.settings.smsProvider || 'africastalking';
 document.getElementById('setSmsCountryCode').value = db.settings.smsCountryCode || '';
 document.getElementById('setSmsTemplate').value = db.settings.smsTemplate || DEFAULT_SMS_TEMPLATE; }

// ===== SMS TEST (Settings) =====
async function sendTestSms() { const phone = document.getElementById('setSmsTestPhone').value.trim(); const out = document.getElementById('smsTestResult');
 if (!phone) { showToast('Enter a test phone number', 'error'); return; }
 out.textContent = 'Sending...'; out.style.color = 'var(--gray)';
 const fake = { id: 0, receipt: 'TEST', date: new Date().toISOString(), items: [{ name: 'Test Item', dose: '', qty: 1, price: 1000, total: 1000 }], total: 1000, payments: { cash: 1000 }, creditDetails: null };
 try { const { data, error } = await sbClient.functions.invoke('send-sms', { body: { saleId: null, receipt: 'TEST', phone: normalizePhoneLocal(phone) || phone, message: fillSmsTemplate(db.settings.smsTemplate, fake), provider: db.settings.smsProvider || 'africastalking', defaultCc: defaultCountryCode() } });
  if (error) throw error;
  if (data.status === 'test') { out.textContent = 'TEST MODE: message validated and logged. Add provider credentials (Supabase secrets) to send real SMS.'; out.style.color = 'var(--info)'; }
  else if (data.status === 'sent') { out.textContent = 'Sent! Gateway ID: ' + (data.gatewayId || '-'); out.style.color = 'var(--success)'; }
  else { out.textContent = 'Failed: ' + (data.error || 'unknown error'); out.style.color = 'var(--danger)'; } }
 catch (e) { out.textContent = 'Error: ' + ((e && e.message) || e); out.style.color = 'var(--danger)'; } }
function saveSettings() { db.settings.pharmacyName = document.getElementById('setPharmacyName').value.trim() || 'DawaPOS Pharmacy'; db.settings.phone = document.getElementById('setPhone').value.trim(); db.settings.email = document.getElementById('setEmail').value.trim(); db.settings.address = document.getElementById('setAddress').value.trim(); db.settings.currency = document.getElementById('setCurrency').value.trim() || 'KES'; db.settings.taxRate = parseFloat(document.getElementById('setTax').value) || 0; db.settings.lowStockThreshold = parseInt(document.getElementById('setThreshold').value) || 10;
 db.settings.smsEnabled = document.getElementById('setSmsEnabled').checked;
 db.settings.smsProvider = document.getElementById('setSmsProvider').value;
 db.settings.smsCountryCode = document.getElementById('setSmsCountryCode').value.replace(/[^0-9]/g, '');
 db.settings.smsTemplate = document.getElementById('setSmsTemplate').value.trim() || DEFAULT_SMS_TEMPLATE;
 saveData(); updateDashboard(); showToast('Settings saved and synced!', 'success'); }
function updateCurrency() { db.settings.currency = document.getElementById('setCurrency').value.trim() || 'KES'; }
function clearAllData() { if (!confirm('This will erase ALL products, sales, expenses and reminders on ALL devices. User accounts are kept. Continue?')) return; if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
 localStorage.removeItem('dawaposDB');
 const clean = { products: [], sales: [], expenses: [], suppliers: [], reminders: [], settings: db.settings, users: db.users };
 cloudRev++;
 sbClient.from('dawapos_store').upsert({ id: 1, data: clean, rev: cloudRev, origin: CLIENT_ID, updated_at: new Date().toISOString() }).finally(() => location.reload()); }

// ===== NOTIFICATIONS & ALERTS =====
function lowStockList() { return db.products.filter(p => p.stock <= p.reorder); }
function expiringList() { return db.products.filter(p => p.expiry && Math.ceil((new Date(p.expiry) - new Date()) / 86400000) <= 30); }
function overdueCredits() { return db.sales.filter(s => s.payments && s.payments.credit > 0 && s.status !== 'returned' && creditInfo(s).overdue); }
function dueReminders() { const soon = offsetDate(7); return db.reminders.filter(r => !r.completed && r.date <= soon); }
function setBadge(id, n, display = 'flex') { const el = document.getElementById(id); if (!el) return; el.textContent = n; el.style.display = n > 0 ? display : 'none'; }
function showNotifications() { const items = [
  ...lowStockList().map(p => `<i class="fas fa-triangle-exclamation" style="color: var(--warning);"></i> Low stock: <strong>${p.name}</strong> (${p.stock} left)`),
  ...expiringList().map(p => `<i class="fas fa-calendar-xmark" style="color: var(--danger);"></i> Expiring: <strong>${p.name}</strong> (${p.expiry})`),
  ...overdueCredits().map(s => `<i class="fas fa-handshake" style="color: var(--danger);"></i> Overdue credit: <strong>${(s.creditDetails && s.creditDetails.name) || 'Customer'}</strong> &mdash; ${fmt(creditInfo(s).balance)}`),
  ...dueReminders().map(r => `<i class="fas fa-bell" style="color: var(--info);"></i> Reminder: <strong>${r.title}</strong> (${r.date})`) ];
 document.querySelector('#transModal .modal-header h3').textContent = 'Notifications';
 document.getElementById('transBody').innerHTML = items.length ? items.map(i => `<div style="padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px;">${i}</div>`).join('') : '<div class="empty-state"><i class="fas fa-check-circle"></i><h4>All clear!</h4><p>No alerts right now</p></div>';
 document.getElementById('transFooter').innerHTML = `<button class="btn btn-outline" onclick="closeModal('transModal')">Close</button>`;
 openModal('transModal'); }
function showLowStockAlert() { const list = lowStockList();
 document.querySelector('#transModal .modal-header h3').textContent = 'Low Stock Alerts';
 document.getElementById('transBody').innerHTML = list.length ? list.map(p => `<div class="reminder-card"><div class="reminder-icon credit"><i class="fas fa-triangle-exclamation"></i></div><div class="reminder-info"><div class="title">${p.name}</div><div class="meta">${p.category} &bull; Reorder level: ${p.reorder}</div></div><div class="reminder-date ${p.stock <= 0 ? 'overdue' : 'upcoming'}">${p.stock} left</div></div>`).join('') : '<div class="empty-state"><i class="fas fa-check-circle"></i><h4>Stock levels OK</h4></div>';
 document.getElementById('transFooter').innerHTML = `<button class="btn btn-outline" onclick="closeModal('transModal')">Close</button>`;
 openModal('transModal'); }

// ===== DASHBOARD =====
const chartRefs = {};
function makeChart(id, config) { if (chartRefs[id]) { chartRefs[id].destroy(); } const ctx = document.getElementById(id); if (!ctx || typeof Chart === 'undefined') return; chartRefs[id] = new Chart(ctx, config); }
function updateDashboard() { const today = todayStr(); const yKey = offsetDate(-1);
 const todaySales = db.sales.filter(s => s.date.startsWith(today) && s.status !== 'returned');
 const ySales = db.sales.filter(s => s.date.startsWith(yKey) && s.status !== 'returned');
 const todayTotal = todaySales.reduce((t, s) => t + s.total, 0); const yTotal = ySales.reduce((t, s) => t + s.total, 0);
 document.getElementById('dashTodaySales').textContent = fmt(todayTotal);
 const change = yTotal > 0 ? Math.round((todayTotal - yTotal) / yTotal * 100) : (todayTotal > 0 ? 100 : 0);
 document.getElementById('dashSalesChange').textContent = Math.abs(change) + '%';
 document.getElementById('dashStockCount').textContent = db.products.filter(p => p.stock > 0).length;
 document.getElementById('dashStockStatus').textContent = `${db.products.length} total products`;
 document.getElementById('dashLowStock').textContent = lowStockList().length;
 document.getElementById('dashExpiring').textContent = expiringList().length;
 const creditSales = db.sales.filter(s => s.payments && s.payments.credit > 0 && s.status !== 'returned');
 const outstanding = creditSales.reduce((t, s) => t + creditInfo(s).balance, 0);
 const openCount = creditSales.filter(s => creditInfo(s).balance > 0.005).length;
 document.getElementById('dashCredit').textContent = fmt(outstanding);
 document.getElementById('dashCreditCount').textContent = `${openCount} accounts`;
 const dueR = dueReminders();
 document.getElementById('dashReminders').textContent = dueR.length;
 document.getElementById('dashReminderText').textContent = 'Due within 7 days';
 const qty = {}; db.sales.filter(s => s.status !== 'returned').forEach(s => s.items.forEach(i => { qty[i.name] = (qty[i.name] || 0) + i.qty; }));
 const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 5);
 document.getElementById('topSellingList').innerHTML = top.length ? top.map(([name, q2], idx) => `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border);"><span><strong>${idx + 1}.</strong> ${name}</span><span class="badge badge-success">${q2} sold</span></div>`).join('') : '<div class="empty-state"><i class="fas fa-chart-simple"></i><h4>No sales data yet</h4><p>Start making sales to see top products</p></div>';
 const oc = overdueCredits();
 document.getElementById('overdueCreditsList').innerHTML = oc.length ? oc.map(s => `<div class="reminder-card"><div class="reminder-icon credit"><i class="fas fa-handshake"></i></div><div class="reminder-info"><div class="title">${(s.creditDetails && s.creditDetails.name) || 'Customer'}</div><div class="meta">${s.receipt} &bull; Due ${(s.creditDetails && s.creditDetails.dueDate) || '-'}</div></div><div class="reminder-date overdue">${fmt(creditInfo(s).balance)}</div></div>`).join('') : '<div class="empty-state"><i class="fas fa-check-circle"></i><h4>No overdue credits</h4></div>';
 document.getElementById('upcomingRemindersList').innerHTML = dueR.length ? dueR.map(r => `<div class="reminder-card"><div class="reminder-icon ${r.type === 'quarterly' ? 'quarterly' : 'regulatory'}"><i class="fas fa-bell"></i></div><div class="reminder-info"><div class="title">${r.title}</div><div class="meta">${r.type}</div></div><div class="reminder-date ${r.date < today ? 'overdue' : 'upcoming'}">${r.date}</div></div>`).join('') : '<div class="empty-state"><i class="fas fa-calendar-check"></i><h4>No upcoming reminders</h4></div>';
 const acts = [...db.sales.map(s => ({ date: s.date, text: `Sale ${s.receipt} by ${s.by}`, amount: s.total, ret: s.status === 'returned' })), ...db.expenses.map(e => ({ date: e.date + 'T12:00:00', text: `Expense: ${e.desc}`, amount: e.amount, exp: true }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
 document.getElementById('recentActivity').innerHTML = acts.length ? acts.map(a => `<div class="timeline-item"><div class="time">${new Date(a.date).toLocaleString()}</div><div class="content">${a.text}${a.ret ? ' (returned)' : ''} &mdash; <span class="amount" style="${a.exp ? 'color: var(--danger);' : ''}">${a.exp ? '-' : ''}${fmt(a.amount)}</span></div></div>`).join('') : '<div class="empty-state"><i class="fas fa-clock"></i><h4>No recent activity</h4></div>';
 const notifCount = lowStockList().length + expiringList().length + oc.length + dueR.length;
 setBadge('notifBadge', notifCount); setBadge('stockBadge', lowStockList().length); setBadge('sidebarCreditBadge', oc.length, 'inline-block'); setBadge('sidebarReminderBadge', dueR.length, 'inline-block');
 updateDashboardChart(); }
function updateDashboardChart() { const days = parseInt(document.getElementById('chartPeriod').value) || 7; const labels = [], data = [];
 for (let i = days - 1; i >= 0; i--) { const key = offsetDate(-i); labels.push(days > 14 ? key.slice(5) : new Date(key + 'T12:00:00').toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' })); data.push(db.sales.filter(s => s.date.startsWith(key) && s.status !== 'returned').reduce((t, s) => t + s.total, 0)); }
 makeChart('salesChart', { type: 'bar', data: { labels, datasets: [{ label: 'Sales', data, backgroundColor: '#0d7377', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } }); }

// ===== ANALYTICS =====
function updateAnalytics() { const valid = db.sales.filter(s => s.status !== 'returned');
 const revenue = valid.reduce((t, s) => t + s.total, 0);
 const expensesTotal = db.expenses.reduce((t, e) => t + e.amount, 0);
 const cogs = valid.reduce((t, s) => t + s.items.reduce((x, i) => x + (i.cost || 0) * i.qty, 0), 0);
 const creditTotal = valid.reduce((t, s) => t + ((s.payments && s.payments.credit) || 0), 0);
 const profit = revenue - cogs - expensesTotal;
 document.getElementById('anRevenue').textContent = fmt(revenue);
 document.getElementById('anExpenses').textContent = fmt(expensesTotal);
 const anProfit = document.getElementById('anProfit'); anProfit.textContent = fmt(profit); anProfit.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
 document.getElementById('anCredit').textContent = fmt(creditTotal);
 const catTotals = {}; valid.forEach(s => s.items.forEach(i => { const p = db.products.find(x => x.id === i.id); const cat = p ? p.category : 'Other'; catTotals[cat] = (catTotals[cat] || 0) + i.price * i.qty; }));
 makeChart('categoryChart', { type: 'doughnut', data: { labels: Object.keys(catTotals).length ? Object.keys(catTotals) : ['No data'], datasets: [{ data: Object.values(catTotals).length ? Object.values(catTotals) : [1], backgroundColor: ['#0d7377', '#14a085', '#f39c12', '#3498db', '#9b59b6', '#e74c3c', '#27ae60', '#95a5a6'] }] }, options: { responsive: true, maintainAspectRatio: false } });
 const payTotals = { Cash: 0, 'M-Pesa': 0, Card: 0, Insurance: 0, Credit: 0 };
 valid.forEach(s => { payTotals['Cash'] += s.payments.cash || 0; payTotals['M-Pesa'] += s.payments.mpesa || 0; payTotals['Card'] += s.payments.card || 0; payTotals['Insurance'] += s.payments.insurance || 0; payTotals['Credit'] += s.payments.credit || 0; });
 makeChart('paymentChart', { type: 'doughnut', data: { labels: Object.keys(payTotals), datasets: [{ data: Object.values(payTotals), backgroundColor: ['#27ae60', '#f39c12', '#3498db', '#9b59b6', '#e74c3c'] }] }, options: { responsive: true, maintainAspectRatio: false } });
 const periods = [{ label: 'Today', from: todayStr(), to: todayStr() }, { label: 'Last 7 Days', from: offsetDate(-6), to: todayStr() }, { label: 'Last 30 Days', from: offsetDate(-29), to: todayStr() }, { label: 'This Year', from: todayStr().slice(0, 4) + '-01-01', to: todayStr() }];
 document.querySelector('#plTable tbody').innerHTML = periods.map(p => { const sales = valid.filter(s => s.date.slice(0, 10) >= p.from && s.date.slice(0, 10) <= p.to);
  const rev = sales.reduce((t, s) => t + s.total, 0); const cg = sales.reduce((t, s) => t + s.items.reduce((x, i) => x + (i.cost || 0) * i.qty, 0), 0);
  const exp = db.expenses.filter(e => e.date >= p.from && e.date <= p.to).reduce((t, e) => t + e.amount, 0);
  const net = rev - cg - exp;
  return `<tr><td>${p.label}</td><td>${fmt(rev)}</td><td>${fmt(cg)}</td><td>${fmt(rev - cg)}</td><td>${fmt(exp)}</td><td style="color: ${net >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${fmt(net)}</td></tr>`; }).join(''); }

// ===== INIT =====
window.addEventListener('offline', () => document.getElementById('offlineBar').classList.add('active'));
window.addEventListener('online', () => { document.getElementById('offlineBar').classList.remove('active'); syncFromCloud(); });
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
['creditCustomerName', 'creditCustomerPhone', 'creditDueDate'].forEach(id => document.getElementById(id).addEventListener('input', updatePaymentSplit));
document.getElementById('globalSearch').addEventListener('input', e => { if (currentPage === 'pos') { posSearch = e.target.value.trim().toLowerCase(); renderPOS(); } });
document.getElementById('globalSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { if (currentPage === 'pos') { posSearch = e.target.value.trim().toLowerCase(); renderPOS(); } else { showPage('inventory'); document.getElementById('invSearch').value = e.target.value; renderInventory(); e.target.value = ''; } } });
document.getElementById('historyDate').value = todayStr();
loadData();
updateDashboard();
renderPOS();
