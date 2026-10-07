// ===== INVENTORY =====
let editingProductId = null;
function renderInventory() { refreshCategoryControls(); const q = (document.getElementById('invSearch').value || '').toLowerCase(); const cat = document.getElementById('invCategory').value; const stockF = document.getElementById('invStock').value; const tbody = document.getElementById('inventoryTable');
 renderInvStats(); renderReceivals();
 let prods = db.products.filter(p => (!q || p.name.toLowerCase().includes(q) || (p.batch || '').toLowerCase().includes(q)) && (!cat || p.category === cat)).sort((a, b) => a.name.localeCompare(b.name));
 if (stockF === 'low') prods = prods.filter(p => p.stock > 0 && p.stock <= p.reorder);
 if (stockF === 'out') prods = prods.filter(p => p.stock <= 0);
 if (stockF === 'expiring') prods = prods.filter(p => p.expiry && Math.ceil((new Date(p.expiry) - new Date()) / 86400000) <= 30);
 if (!prods.length) { tbody.innerHTML = emptyRow('No products found'); return; }
 tbody.innerHTML = prods.map(p => { const days = p.expiry ? Math.ceil((new Date(p.expiry) - new Date()) / 86400000) : 9999;
  const status = p.stock <= 0 ? '<span class="badge badge-danger">Out of Stock</span>' : p.stock <= p.reorder ? '<span class="badge badge-warning">Low Stock</span>' : days < 0 ? '<span class="badge badge-danger">Expired</span>' : days <= 30 ? '<span class="badge badge-warning">Expiring</span>' : '<span class="badge badge-success">In Stock</span>';
  const pct = Math.min(100, Math.round(p.stock / Math.max(1, p.reorder * 2) * 100));
  const barColor = p.stock <= 0 ? 'var(--danger)' : p.stock <= p.reorder ? 'var(--warning)' : 'var(--success)';
  const daysColor = days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--success)';
  const daysText = p.expiry ? (days < 0 ? 'Expired ' + Math.abs(days) + 'd ago' : days + 'd left') : '';
  return `<tr><td><div class="product-cell"><img src="${p.image || PLACEHOLDER_IMG}" onerror="this.src=PLACEHOLDER_IMG"><div><div class="product-name">${p.name} ${p.rx === 'yes' ? '<span class="rx-tag">Rx</span>' : ''}</div><div class="product-meta">${p.dose} &bull; ${p.form}${p.batch ? ' &bull; ' + p.batch : ''}</div></div></div></td><td>${p.category}</td><td class="stock-cell"><span class="stock-num">${p.stock}</span> <span class="stock-unit">units</span><div class="stock-bar"><div style="width: ${pct}%; background: ${barColor};"></div></div></td><td class="expiry-cell">${p.expiry || '-'}<br><span class="days" style="color: ${daysColor};">${daysText}</span></td><td>${fmt(p.price)}</td><td>${fmt(p.stock * (p.cost || 0))}</td><td>${status}</td><td style="white-space: nowrap;"><button class="btn btn-success btn-sm btn-icon" onclick="openReceiveModal(${p.id})" title="Receive stock"><i class="fas fa-plus"></i></button> <button class="btn btn-outline btn-sm btn-icon" onclick="openProductModal(${p.id})" title="Edit"><i class="fas fa-pen"></i></button> <button class="btn btn-danger btn-sm btn-icon" onclick="deleteProduct(${p.id})" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`; }).join(''); }
function renderInvStats() { const el = document.getElementById('invStats'); if (!el) return;
 const totalUnits = db.products.reduce((t, p) => t + p.stock, 0);
 const stockValue = db.products.reduce((t, p) => t + p.stock * (p.cost || 0), 0);
 const low = db.products.filter(p => p.stock > 0 && p.stock <= p.reorder).length;
 const out = db.products.filter(p => p.stock <= 0).length;
 const exp = expiringList().length;
 el.innerHTML = `<div class="inv-stat"><div class="is-icon" style="background: #e3f2fd; color: var(--info);"><i class="fas fa-pills"></i></div><div><div class="is-label">Products</div><div class="is-value">${db.products.length}</div></div></div>
 <div class="inv-stat"><div class="is-icon" style="background: #e8f5e9; color: var(--success);"><i class="fas fa-cubes"></i></div><div><div class="is-label">Units in Stock</div><div class="is-value">${totalUnits.toLocaleString()}</div></div></div>
 <div class="inv-stat"><div class="is-icon" style="background: #f3e5f5; color: #9b27b0;"><i class="fas fa-sack-dollar"></i></div><div><div class="is-label">Stock Value</div><div class="is-value">${fmt(stockValue)}</div></div></div>
 <div class="inv-stat"><div class="is-icon" style="background: #fff3e0; color: var(--warning);"><i class="fas fa-triangle-exclamation"></i></div><div><div class="is-label">Low / Out</div><div class="is-value ${low + out > 0 ? 'warn' : ''}">${low} / ${out}</div></div></div>
 <div class="inv-stat"><div class="is-icon" style="background: #ffebee; color: var(--danger);"><i class="fas fa-calendar-xmark"></i></div><div><div class="is-label">Expiring Soon</div><div class="is-value ${exp > 0 ? 'danger' : ''}">${exp}</div></div></div>`; }
function renderReceivals() { const el = document.getElementById('receivalsList'); if (!el) return;
 const list = db.products.filter(p => p.lastReceived).sort((a, b) => b.lastReceived.localeCompare(a.lastReceived)).slice(0, 8);
 if (!list.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-truck-ramp-box"></i><h4>No receivals yet</h4><p>Received stock will appear here</p></div>'; return; }
 el.innerHTML = list.map(p => `<div class="receival-item"><div class="rcv-icon"><i class="fas fa-truck-ramp-box"></i></div><div class="rcv-info"><div class="title">${p.name} ${p.dose}</div><div class="meta">${new Date(p.lastReceived).toLocaleString()}${p.lastReceivedBy ? ' &bull; by ' + p.lastReceivedBy : ''}${p.receiveNotes ? ' &bull; ' + p.receiveNotes : ''}</div></div><div class="rcv-qty"><div class="q">+${p.lastReceivedQty}</div><div class="d">stock: ${p.stock}</div></div></div>`).join(''); }
function previewImage(input) { const file = input.files[0]; if (!file) return; const reader = new FileReader();
 reader.onload = e => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = Math.min(1, 240 / img.width); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); window._prodImageData = canvas.toDataURL('image/jpeg', 0.75); const prev = document.getElementById('prodImagePreview'); prev.src = window._prodImageData; prev.style.display = 'block'; }; img.src = e.target.result; };
 reader.readAsDataURL(file); }
function openProductModal(id = null) { editingProductId = id; window._prodImageData = null;
 document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add New Product';
 document.getElementById('prodSupplier').innerHTML = '<option value="">Select Supplier</option>' + db.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
 const prev = document.getElementById('prodImagePreview'); prev.style.display = 'none'; prev.src = '';
 refreshCategoryControls(); const newCatBox = document.getElementById('prodNewCategory'); if (newCatBox) { newCatBox.value = ''; newCatBox.style.display = 'none'; } const ids = ['prodName', 'prodDose', 'prodPrice', 'prodCost', 'prodStock', 'prodBatch', 'prodExpiry', 'prodDesc']; 
 if (id) { const p = db.products.find(x => x.id === id); if (!p) return;
  document.getElementById('prodName').value = p.name; const catSel = document.getElementById('prodCategory'); if (p.category && !Array.from(catSel.options).some(o => o.value === p.category)) { const o = document.createElement('option'); o.value = p.category; o.textContent = p.category; catSel.insertBefore(o, catSel.lastChild); } catSel.value = p.category; document.getElementById('prodDose').value = p.dose; document.getElementById('prodForm').value = p.form; document.getElementById('prodPrice').value = p.price; document.getElementById('prodCost').value = p.cost; document.getElementById('prodStock').value = p.stock; document.getElementById('prodReorder').value = p.reorder; document.getElementById('prodBatch').value = p.batch || ''; document.getElementById('prodExpiry').value = p.expiry || ''; document.getElementById('prodSupplier').value = p.supplier || ''; document.getElementById('prodRx').value = p.rx || 'no'; document.getElementById('prodDesc').value = p.desc || '';
  if (p.image) { prev.src = p.image; prev.style.display = 'block'; } }
 else { ids.forEach(x => document.getElementById(x).value = ''); document.getElementById('prodReorder').value = 10; document.getElementById('prodRx').value = 'no'; document.getElementById('prodImage').value = ''; }
 openModal('productModal'); }
function saveProduct() { const name = document.getElementById('prodName').value.trim();
 if (!name) { showToast('Product name is required!', 'error'); return; }
 let chosenCat = document.getElementById('prodCategory').value; if (chosenCat === '__new__') { const nm = (document.getElementById('prodNewCategory').value || '').trim(); if (!nm) { showToast('Enter the new category name!', 'error'); return; } chosenCat = addCustomCategory(nm); if (!chosenCat) return; } const data = { name, category: chosenCat, dose: document.getElementById('prodDose').value.trim(), form: document.getElementById('prodForm').value, price: val('prodPrice'), cost: val('prodCost'), stock: parseInt(document.getElementById('prodStock').value) || 0, reorder: parseInt(document.getElementById('prodReorder').value) || 10, batch: document.getElementById('prodBatch').value.trim(), expiry: document.getElementById('prodExpiry').value || '', supplier: document.getElementById('prodSupplier').value || '', rx: document.getElementById('prodRx').value, desc: document.getElementById('prodDesc').value.trim() };
 if (editingProductId) { const p = db.products.find(x => x.id === editingProductId); if (p) { Object.assign(p, data); if (window._prodImageData) p.image = window._prodImageData; } }
 else { db.products.push({ id: nextId(db.products), image: window._prodImageData || '', ...data }); }
 saveData(); closeModal('productModal'); renderInventory(); renderPOS(); showToast('Product saved!', 'success'); }
function deleteProduct(id) { if (!confirm('Delete this product?')) return; db.products = db.products.filter(p => p.id !== id); saveData(); renderInventory(); renderPOS(); showToast('Product deleted', 'success'); }
function exportInventory(format) { const rows = db.products.map(p => ({ Name: p.name, Category: p.category, Dose: p.dose, Form: p.form, Batch: p.batch || '', Stock: p.stock, Expiry: p.expiry || '', Price: p.price, Cost: p.cost }));
 if (!rows.length) { showToast('No data to export', 'warning'); return; }
 if (format === 'excel') { const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventory'); XLSX.writeFile(wb, 'inventory.xlsx'); }
 else { const doc = new jspdf.jsPDF(); doc.text(db.settings.pharmacyName + ' - Inventory', 14, 15); doc.autoTable({ head: [Object.keys(rows[0])], body: rows.map(r => Object.values(r)), startY: 20, styles: { fontSize: 8 } }); doc.save('inventory.pdf'); } }

// ===== RECEIVE INVENTORY =====
function openReceiveModal(productId = null) { const sel = document.getElementById('rcvProduct');
 const prods = [...db.products].sort((a, b) => a.name.localeCompare(b.name));
 sel.innerHTML = prods.length ? prods.map(x => `<option value="${x.id}">${x.name} ${x.dose} (Stock: ${x.stock})</option>`).join('') : '<option value="">No products - add one first</option>';
 document.getElementById('rcvSupplier').innerHTML = '<option value="">Select Supplier</option>' + db.suppliers.map(x => `<option value="${x.id}">${x.name}</option>`).join('');
 ['rcvQty', 'rcvBatch', 'rcvExpiry', 'rcvCost', 'rcvNotes'].forEach(id => document.getElementById(id).value = '');
 if (productId) sel.value = productId;
 updateReceivePreview();
 openModal('receiveModal'); }
function updateReceivePreview() { const x = db.products.find(y => y.id === parseInt(document.getElementById('rcvProduct').value));
 const qty = parseInt(document.getElementById('rcvQty').value) || 0;
 document.getElementById('rcvCurrentStock').textContent = x ? x.stock : 0;
 document.getElementById('rcvNewStock').textContent = x ? x.stock + qty : 0; }
function saveReceival() { const x = db.products.find(y => y.id === parseInt(document.getElementById('rcvProduct').value));
 if (!x) { showToast('Select a product!', 'error'); return; }
 const qty = parseInt(document.getElementById('rcvQty').value) || 0;
 if (qty <= 0) { showToast('Enter a valid quantity!', 'error'); return; }
 x.stock += qty;
 const batch = document.getElementById('rcvBatch').value.trim(); if (batch) x.batch = batch;
 const expiry = document.getElementById('rcvExpiry').value; if (expiry) x.expiry = expiry;
 const cost = parseFloat(document.getElementById('rcvCost').value); if (!isNaN(cost) && document.getElementById('rcvCost').value !== '') x.cost = cost;
 const supplier = document.getElementById('rcvSupplier').value; if (supplier) x.supplier = supplier;
 x.lastReceived = new Date().toISOString(); x.lastReceivedQty = qty; x.lastReceivedBy = db.currentUser ? db.currentUser.name : 'Unknown';
 const notes = document.getElementById('rcvNotes').value.trim(); if (notes) x.receiveNotes = notes;
 saveData(); closeModal('receiveModal'); renderInventory(); renderPOS(); updateDashboard();
 showToast(`Received ${qty} units of ${x.name} - new stock: ${x.stock}`, 'success'); }

// ===== CREDIT ACCOUNTS =====
function creditInfo(sale) { const creditAmt = (sale.payments && sale.payments.credit) || 0; const paid = (sale.settlements || []).reduce((s, x) => s + x.amount, 0); const balance = +(creditAmt - paid).toFixed(2);
 const overdue = balance > 0.005 && sale.creditDetails && sale.creditDetails.dueDate && sale.creditDetails.dueDate < todayStr();
 let status = balance <= 0.005 ? 'settled' : paid > 0 ? 'partial' : 'outstanding'; if (overdue) status = 'overdue';
 return { creditAmt, paid, balance, status, overdue }; }
function renderCredits() { const q = (document.getElementById('creditSearch').value || '').toLowerCase(); const sf = document.getElementById('creditStatus').value; const tbody = document.getElementById('creditsTable');
 let list = db.sales.filter(s => s.payments && s.payments.credit > 0 && s.status !== 'returned');
 if (q) list = list.filter(s => ((s.creditDetails && s.creditDetails.name) || '').toLowerCase().includes(q) || ((s.creditDetails && s.creditDetails.phone) || '').includes(q));
 if (sf) list = list.filter(s => creditInfo(s).status === sf);
 if (!list.length) { tbody.innerHTML = emptyRow('No credit accounts'); return; }
 tbody.innerHTML = list.map(s => { const ci = creditInfo(s); const badge = { settled: 'badge-success', partial: 'badge-info', outstanding: 'badge-warning', overdue: 'badge-danger' }[ci.status];
  return `<tr><td>${s.receipt}</td><td>${(s.creditDetails && s.creditDetails.name) || '-'}</td><td>${(s.creditDetails && s.creditDetails.phone) || '-'}</td><td>${fmt(ci.creditAmt)}</td><td>${fmt(ci.paid)}</td><td><strong style="color: var(--danger);">${fmt(ci.balance)}</strong></td><td>${(s.creditDetails && s.creditDetails.dueDate) || '-'}</td><td><span class="badge ${badge}">${ci.status.toUpperCase()}</span></td><td>${ci.balance > 0.005 ? `<button class="btn btn-primary btn-sm" onclick="openSettleModal(${s.id})">Pay</button>` : ''}</td></tr>`; }).join(''); }
let settleSaleId = null;
function openSettleModal(saleId) { const s = db.sales.find(x => x.id === saleId); if (!s) return; settleSaleId = saleId; const ci = creditInfo(s);
 document.getElementById('settleCustomer').value = (s.creditDetails && s.creditDetails.name) || '';
 document.getElementById('settleOriginal').value = fmt(ci.creditAmt); document.getElementById('settlePaid').value = fmt(ci.paid); document.getElementById('settleBalance').value = fmt(ci.balance);
 document.getElementById('settleAmount').value = ci.balance; openModal('settleModal'); }
function saveSettlement() { const s = db.sales.find(x => x.id === settleSaleId); if (!s) return;
 const amt = parseFloat(document.getElementById('settleAmount').value) || 0; const ci = creditInfo(s);
 if (amt <= 0 || amt > ci.balance + 0.005) { showToast('Invalid payment amount!', 'error'); return; }
 s.settlements = s.settlements || []; s.settlements.push({ date: new Date().toISOString(), amount: amt, method: document.getElementById('settleMethod').value, by: db.currentUser ? db.currentUser.name : 'Unknown' });
 saveData(); closeModal('settleModal'); renderCredits(); updateDashboard(); showToast('Payment recorded!', 'success'); }

// ===== SALES HISTORY =====
let historyTab = 'daily';
function switchHistoryTab(tab) { historyTab = tab; document.querySelectorAll('#page-history .tab').forEach(t => t.classList.toggle('active', t.textContent.trim().toLowerCase() === tab)); renderHistory(); }
function saleHistoryRow(s) { const payLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', insurance: 'Insur', credit: 'Credit' };
 const paySummary = Object.entries(s.payments).filter(([, v]) => v > 0).map(([k, v]) => `${payLabels[k]} ${fmt(v)}`).join(', ');
 const returned = s.status === 'returned';
 return `<tr style="${returned ? 'opacity:0.55;' : ''}"><td>${s.receipt}${returned ? ' <span class="badge badge-danger">RETURNED</span>' : ''}</td><td>${new Date(s.date).toLocaleTimeString()}</td><td>${s.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td><td>${paySummary}</td><td>${s.by}</td><td><strong>${fmt(s.total)}</strong></td><td style="white-space: nowrap;"><button class="btn btn-outline btn-sm btn-icon" onclick="viewTransaction(${s.id})" title="View"><i class="fas fa-eye"></i></button> ${!returned ? `<button class="btn btn-warning btn-sm btn-icon" onclick="returnSale(${s.id})" title="Return"><i class="fas fa-rotate-left"></i></button>` : ''} <button class="btn btn-danger btn-sm btn-icon" onclick="deleteSale(${s.id})" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`; }
function renderHistory() { const tbody = document.getElementById('historyTable'); const title = document.getElementById('historyTitle'); const dateVal = document.getElementById('historyDate').value || todayStr();
 if (historyTab === 'daily') { title.textContent = 'Transactions - ' + dateVal;
  const list = db.sales.filter(s => s.date.startsWith(dateVal)).sort((a, b) => b.date.localeCompare(a.date));
  tbody.innerHTML = list.length ? list.map(saleHistoryRow).join('') : emptyRow('No transactions for this date'); }
 else if (historyTab === 'weekly') { title.textContent = 'Last 7 Days Summary'; const rows = [];
  for (let i = 6; i >= 0; i--) { const key = offsetDate(-i); const daySales = db.sales.filter(s => s.date.startsWith(key) && s.status !== 'returned');
   rows.push(`<tr><td>${key}</td><td>${new Date(key + 'T12:00:00').toLocaleDateString('en-KE', { weekday: 'long' })}</td><td>${daySales.reduce((n, s) => n + s.items.reduce((x, i2) => x + i2.qty, 0), 0)} items</td><td>${daySales.length} sale(s)</td><td>-</td><td><strong>${fmt(daySales.reduce((t, s) => t + s.total, 0))}</strong></td><td></td></tr>`); }
  tbody.innerHTML = rows.join(''); }
 else if (historyTab === 'monthly') { const yr = new Date().getFullYear(); title.textContent = 'Monthly Summary - ' + yr; const rows = [];
  for (let m = 0; m < 12; m++) { const key = `${yr}-${String(m + 1).padStart(2, '0')}`; const ms = db.sales.filter(s => s.date.startsWith(key) && s.status !== 'returned'); if (!ms.length) continue;
   rows.push(`<tr><td>${key}</td><td>${new Date(yr, m, 1).toLocaleDateString('en-KE', { month: 'long' })}</td><td>${ms.reduce((n, s) => n + s.items.reduce((x, i2) => x + i2.qty, 0), 0)} items</td><td>${ms.length} sale(s)</td><td>-</td><td><strong>${fmt(ms.reduce((t, s) => t + s.total, 0))}</strong></td><td></td></tr>`); }
  tbody.innerHTML = rows.length ? rows.join('') : emptyRow('No sales this year'); }
 else { title.textContent = 'Expenses History'; const list = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date));
  tbody.innerHTML = list.length ? list.map(e => `<tr><td>EXP-${e.id}</td><td>${e.date}</td><td>${e.desc}</td><td><span class="badge badge-info">${e.category}</span></td><td>${e.by || '-'}</td><td><strong>${fmt(e.amount)}</strong></td><td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></td></tr>`).join('') : emptyRow('No expenses recorded'); } }
function viewTransaction(id) { const s = db.sales.find(x => x.id === id); if (!s) return;
 document.querySelector('#transModal .modal-header h3').textContent = 'Transaction Details';
 const payLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', insurance: 'Insurance', credit: 'Credit' };
 let html = `<div class="receipt-row"><span>Receipt</span><strong>${s.receipt}</strong></div><div class="receipt-row"><span>Date</span><span>${new Date(s.date).toLocaleString()}</span></div><div class="receipt-row"><span>Sold by</span><span>${s.by}</span></div><div class="receipt-row"><span>Status</span><span>${s.status === 'returned' ? '<span class="badge badge-danger">RETURNED</span>' : '<span class="badge badge-success">COMPLETED</span>'}</span></div><hr class="receipt-divider">`;
 html += s.items.map(i => `<div class="receipt-row"><span>${i.name} ${i.dose} x${i.qty}</span><span>${fmt(i.total)}</span></div>`).join('');
 html += `<hr class="receipt-divider"><div class="receipt-row"><span>Subtotal</span><span>${fmt(s.subtotal)}</span></div>`;
 if (s.discountAmt > 0) html += `<div class="receipt-row"><span>Discount (${s.discount}%)</span><span>-${fmt(s.discountAmt)}</span></div>`;
 html += `<div class="receipt-row bold"><span>Total</span><span>${fmt(s.total)}</span></div><hr class="receipt-divider">`;
 html += Object.entries(s.payments).filter(([, v]) => v > 0).map(([k, v]) => `<div class="receipt-row"><span>${payLabels[k]}</span><span>${fmt(v)}</span></div>`).join('');
 if (s.creditDetails) { const ci = creditInfo(s);
  html += `<hr class="receipt-divider"><div class="receipt-row"><span>Credit customer</span><span>${s.creditDetails.name} (${s.creditDetails.phone})</span></div><div class="receipt-row"><span>Due date</span><span>${s.creditDetails.dueDate}</span></div><div class="receipt-row"><span>Credit balance</span><strong style="color: var(--danger);">${fmt(ci.balance)}</strong></div>`;
  if ((s.settlements || []).length) html += '<hr class="receipt-divider"><strong>Payments received:</strong>' + s.settlements.map(st => `<div class="receipt-row"><span>${new Date(st.date).toLocaleDateString()} (${st.method})</span><span>${fmt(st.amount)}</span></div>`).join(''); }
 document.getElementById('transBody').innerHTML = html;
 document.getElementById('transFooter').innerHTML = `${s.status !== 'returned' ? `<button class="btn btn-outline" onclick="editSale(${s.id})"><i class="fas fa-pen"></i> Edit</button><button class="btn btn-warning" onclick="returnSale(${s.id}); closeModal('transModal');"><i class="fas fa-rotate-left"></i> Return</button>` : ''}<button class="btn btn-danger" onclick="deleteSale(${s.id}); closeModal('transModal');"><i class="fas fa-trash"></i> Delete</button><button class="btn btn-outline" onclick="openInvoice(${s.id})"><i class="fas fa-file-invoice"></i> Invoice</button><button class="btn btn-primary" onclick="showReceipt(db.sales.find(x => x.id === ${s.id}))"><i class="fas fa-print"></i> Receipt</button>`;
 openModal('transModal'); }
function returnSale(id) { const s = db.sales.find(x => x.id === id); if (!s || s.status === 'returned') return;
 if (!confirm(`Return sale ${s.receipt}? All items will be restored to stock.`)) return;
 s.status = 'returned'; s.returnedAt = new Date().toISOString(); s.returnedBy = db.currentUser ? db.currentUser.name : 'Unknown';
 s.items.forEach(i => { const p = db.products.find(x => x.id === i.id); if (p) p.stock += i.qty; });
 saveData(); renderHistory(); updateDashboard(); showToast('Sale returned and stock restored', 'success'); }
function deleteSale(id) { const s = db.sales.find(x => x.id === id); if (!s) return;
 if (!confirm(`Permanently delete transaction ${s.receipt}?`)) return;
 if (s.status !== 'returned') { s.items.forEach(i => { const p = db.products.find(x => x.id === i.id); if (p) p.stock += i.qty; }); }
 db.sales = db.sales.filter(x => x.id !== id);
 saveData(); renderHistory(); updateDashboard(); showToast('Transaction deleted', 'success'); }
let editSaleId = null;
function editSale(id) { const s = db.sales.find(x => x.id === id); if (!s) return; editSaleId = id;
 document.querySelector('#transModal .modal-header h3').textContent = 'Edit Transaction ' + s.receipt;
 document.getElementById('transBody').innerHTML = `
 <div class="form-group"><label>Discount %</label><input type="number" id="editSaleDisc" value="${s.discount || 0}" min="0" max="100"></div>
 <div class="form-grid">
 <div class="form-group"><label>Cash</label><input type="number" id="editPayCash" value="${s.payments.cash || 0}" min="0" step="0.01"></div>
 <div class="form-group"><label>M-Pesa</label><input type="number" id="editPayMpesa" value="${s.payments.mpesa || 0}" min="0" step="0.01"></div>
 <div class="form-group"><label>Card</label><input type="number" id="editPayCard" value="${s.payments.card || 0}" min="0" step="0.01"></div>
 <div class="form-group"><label>Insurance</label><input type="number" id="editPayInsurance" value="${s.payments.insurance || 0}" min="0" step="0.01"></div>
 <div class="form-group"><label>Credit</label><input type="number" id="editPayCredit" value="${s.payments.credit || 0}" min="0" step="0.01"></div>
 </div>
 <div class="form-group"><label>Credit Customer Name</label><input type="text" id="editCreditName" value="${(s.creditDetails && s.creditDetails.name) || ''}"></div>
 <div class="form-grid"><div class="form-group"><label>Phone</label><input type="text" id="editCreditPhone" value="${(s.creditDetails && s.creditDetails.phone) || ''}"></div>
 <div class="form-group"><label>Due Date</label><input type="date" id="editCreditDue" value="${(s.creditDetails && s.creditDetails.dueDate) || ''}"></div></div>
 <p style="font-size: 13px; color: var(--gray);">New total: <strong id="editSaleTotal"></strong> &mdash; payments must add up to this amount.</p>`;
 const recalc = () => { const d = parseFloat(document.getElementById('editSaleDisc').value) || 0; document.getElementById('editSaleTotal').textContent = fmt(+(s.subtotal * (1 - d / 100)).toFixed(2)); };
 document.getElementById('editSaleDisc').addEventListener('input', recalc); recalc();
 document.getElementById('transFooter').innerHTML = `<button class="btn btn-outline" onclick="closeModal('transModal')">Cancel</button><button class="btn btn-primary" onclick="saveEditSale()"><i class="fas fa-save"></i> Save Changes</button>`;
 openModal('transModal'); }
function saveEditSale() { const s = db.sales.find(x => x.id === editSaleId); if (!s) return;
 const disc = Math.min(100, Math.max(0, parseFloat(document.getElementById('editSaleDisc').value) || 0));
 const total = +(s.subtotal * (1 - disc / 100)).toFixed(2);
 const pays = { cash: val('editPayCash'), mpesa: val('editPayMpesa'), card: val('editPayCard'), insurance: val('editPayInsurance'), credit: val('editPayCredit') };
 const alloc = Object.values(pays).reduce((a2, b2) => a2 + b2, 0);
 if (Math.abs(alloc - total) >= 0.005) { showToast(`Payments (${fmt(alloc)}) must equal the total (${fmt(total)})`, 'error'); return; }
 const paidSettlements = (s.settlements || []).reduce((t, x) => t + x.amount, 0);
 if (pays.credit < paidSettlements) { showToast('Credit cannot be less than payments already received!', 'error'); return; }
 if (pays.credit > 0) { const cd = { name: document.getElementById('editCreditName').value.trim(), phone: document.getElementById('editCreditPhone').value.trim(), dueDate: document.getElementById('editCreditDue').value, notes: (s.creditDetails && s.creditDetails.notes) || '' };
  if (!cd.name || !cd.dueDate) { showToast('Credit customer name and due date are required!', 'error'); return; } s.creditDetails = cd; }
 else { s.creditDetails = null; }
 s.discount = disc; s.discountAmt = +(s.subtotal * disc / 100).toFixed(2); s.total = total; s.payments = pays;
 s.editedAt = new Date().toISOString(); s.editedBy = db.currentUser ? db.currentUser.name : 'Unknown';
 saveData(); closeModal('transModal'); renderHistory(); renderCredits(); updateDashboard(); showToast('Transaction updated!', 'success'); }
function exportHistory(format) { const dateVal = document.getElementById('historyDate').value || todayStr();
 const list = db.sales.filter(s => s.date.startsWith(dateVal));
 const rows = list.map(s => ({ Receipt: s.receipt, Time: new Date(s.date).toLocaleTimeString(), Items: s.items.map(i => `${i.name} x${i.qty}`).join('; '), Total: s.total, By: s.by, Status: s.status }));
 if (!rows.length) { showToast('No data to export for this date', 'warning'); return; }
 if (format === 'excel') { const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sales'); XLSX.writeFile(wb, `sales_${dateVal}.xlsx`); }
 else { const doc = new jspdf.jsPDF(); doc.text(`Sales Report - ${dateVal}`, 14, 15); doc.autoTable({ head: [Object.keys(rows[0])], body: rows.map(r => Object.values(r)), startY: 20, styles: { fontSize: 8 } }); doc.save(`sales_${dateVal}.pdf`); } }
