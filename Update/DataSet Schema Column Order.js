javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		return;
	}
	if (
		!/\/datasources\/[^/]+\/details\/data\/schema/.test(
			window.location.pathname
		)
	) {
		alert('Please navigate to a DataSet Schema tab first.');
		return;
	}
	if (
		window.__domoSchemaReorder &&
		typeof window.__domoSchemaReorder.stop === 'function'
	) {
		window.__domoSchemaReorder.stop(true);
		return;
	}
	const LOG_PREFIX = '[SchemaReorder]';
	const STATE = {
		schema: null,
		datasetId: null,
		rows: [],
		originalOrder: [],
		originalRowRefs: null,
		inFlight: false,
		dirty: false,
		stopRequested: false,
		debounceTimer: null
	};
	const log = (...a) => console.log(LOG_PREFIX, ...a);
	const error = (...a) => console.error(LOG_PREFIX, ...a);
	function buildPanel() {
		const p = document.createElement('div');
		p.id = 'schema-reorder-panel';
		Object.assign(p.style, {
			position: 'fixed',
			zIndex: 99999,
			bottom: '12px',
			right: '12px',
			fontFamily: 'system-ui,Arial,sans-serif',
			background: 'rgba(30,30,30,0.9)',
			color: '#fff',
			padding: '10px 14px',
			borderRadius: '8px',
			width: '260px',
			boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
			fontSize: '12px',
			lineHeight: 1.4
		});
		p.innerHTML =
			'<div style="font-weight:600;font-size:13px;margin-bottom:4px;">Schema Column Reorder</div>' +
			'<div id="schema-reorder-status" style="margin-bottom:6px;">Initializing…</div>' +
			'<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
			'<button id="schema-reorder-cancel" style="flex:1;cursor:pointer;background:#d9534f;border:0;color:#fff;padding:6px 8px;border-radius:4px;font-size:12px;">Cancel</button>' +
			'</div>' +
			'<div style="margin-top:6px;font-size:11px;opacity:.85;">After you move a column, the browser will reload and the session will end.<br><b>To move more columns, re-run the bookmarklet.</b></div>';
		document.body.appendChild(p);
		p.querySelector('#schema-reorder-cancel').onclick = () => api.stop();
		return p;
	}
	function setStatus(msg, tone) {
		const el = document.getElementById('schema-reorder-status');
		if (!el) return;
		el.textContent = msg;
		el.style.color = tone === 'error' ? '#ff7474' : '#fff';
	}

	// --- Helpers restored after corruption ---
	function getDatasetId() {
		const m = window.location.pathname.match(/datasources\/([^/]+)/);
		return m ? m[1] : null;
	}
	async function fetchSchema(id) {
		const url = `/api/query/v1/datasources/${id}/wrangle`;
		log('GET', url);
		const res = await fetch(url, { credentials: 'same-origin' });
		if (!res.ok) throw new Error('Schema fetch failed ' + res.status);
		const data = await res.json();
		log('Schema columns', data.columns?.length);
		return data;
	}
	async function postSchema(id, columns) {
		const url = `/api/query/v1/datasources/${id}/wrangle`;
		const body = {
			columns: columns.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				order: c.order
			}))
		};
		log('POST', url, 'payload(first10)', body.columns.slice(0, 10));
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			credentials: 'same-origin'
		});
		if (!res.ok) {
			const txt = await res.text();
			error('Post failed', res.status, txt);
			throw new Error('Post failed ' + res.status);
		}
		log('Post success');
	}
	function extractRowName(row) {
		// heuristic: look for name cell
		const attr = row.getAttribute('data-col-name');
		if (attr) return attr.trim();
		const nameEl = row.querySelector(
			'[data-testid*="column" i],[class*="columnName"], .name'
		);
		if (nameEl) {
			const t = nameEl.textContent.trim();
			if (t) return t;
		}
		return (row.textContent || '').trim().split(/\s+/).slice(0, 6).join(' ');
	}
	function detectVirtualRows() {
		const candidates = [
			...document.querySelectorAll(
				'.ReactVirtualized__Grid__innerScrollContainer'
			)
		];
		for (const parent of candidates) {
			const rows = [...parent.children].filter(
				(c) =>
					c.querySelector &&
					(c.className.includes('react-draggable') ||
						c.querySelector('i.icon-drag-vertical'))
			);
			if (rows.length > 2) {
				return { parent, rows };
			}
		}
		return null;
	}
	function findStructure() {
		// simple table fallback
		const table = document.querySelector('table');
		if (table) {
			const tbody = table.tBodies[0];
			if (tbody) {
				return {
					type: 'table',
					container: tbody,
					headerRow: table.tHead ? table.tHead.rows[0] : null
				};
			}
		}
		return null;
	}
	function mapRows(struct) {
		if (struct.type === 'table') {
			STATE.rows = [...struct.container.querySelectorAll('tr')].filter(
				(r) => r.parentNode === struct.container
			);
			STATE.rows.forEach((r, i) => {
				r.classList.add('schema-reorder-row');
				let h = r.querySelector('.schema-reorder-handle');
				if (!h) {
					h = document.createElement('span');
					h.className = 'schema-reorder-handle';
					h.textContent = '⋮⋮';
					h.style.marginRight = '4px';
					r.firstChild ? r.insertBefore(h, r.firstChild) : r.appendChild(h);
				}
				h.style.cursor = 'grab';
			});
		}
	}
	function mapVirtualRows(v) {
		STATE.rows = [...v.rows];
		STATE.rows.forEach((r, idx) => {
			r.__origIndex = idx;
			r.classList.add('schema-reorder-row');
			const existing = r.querySelector(
				'i.icon-drag-vertical, i[class*="module_handle_"]'
			);
			if (existing) {
				existing.classList.add('schema-reorder-handle');
				existing.style.cursor = 'grab';
			} else {
				const h = document.createElement('div');
				h.className = 'schema-reorder-handle';
				h.style.marginRight = '4px';
				h.innerHTML = '⋮⋮';
				h.style.cursor = 'grab';
				r.insertBefore(h, r.firstChild);
			}
		});
		const h = parseInt(getComputedStyle(STATE.rows[0]).height, 10) || 40;
		STATE._rowHeight = h; // provisional, refined below by transform deltas
		STATE._virtualParent = v.parent;
		log('Virtual rows mapped', STATE.rows.length, 'rowHeight', h);
	}
	function assignColumnsToRows() {
		if (!STATE.schema || !STATE.schema.columns || !STATE.rows.length) return;
		const cols = [...STATE.schema.columns].sort(
			(a, b) => (a.order ?? 0) - (b.order ?? 0)
		);
		const n = Math.min(cols.length, STATE.rows.length);
		for (let i = 0; i < n; i++) {
			STATE.rows[i].__column = cols[i];
		}
		if (cols.length !== STATE.rows.length) {
			log('Column/row length mismatch', {
				cols: cols.length,
				rows: STATE.rows.length
			});
		}
	}
	function buildColumnLookup() {
		const byName = new Map();
		STATE.schema.columns.forEach((c) => {
			byName.set(c.name, c);
		});
		return byName;
	}
	function currentDomOrderNames() {
		return STATE.rows.map((r) => extractRowName(r));
	}
	function applyOrderFromDom() {
		// Prefer direct row->column mapping if available
		const used = new Set();
		const ordered = [];
		let missingMap = false;
		for (const r of STATE.rows) {
			if (r.__column && !used.has(r.__column)) {
				ordered.push(r.__column);
				used.add(r.__column);
			} else {
				missingMap = true;
			}
		}
		if (missingMap) {
			log('Falling back to name-based mapping for some rows');
			const lookup = buildColumnLookup();
			for (const r of STATE.rows) {
				if (r.__column) continue;
				const nm = extractRowName(r);
				let col = lookup.get(nm);
				if (!col || used.has(col))
					col = STATE.schema.columns.find((c) => !used.has(c));
				if (col) {
					ordered.push(col);
					used.add(col);
				}
			}
		}
		// Append any remaining columns (safety)
		for (const c of STATE.schema.columns) {
			if (!used.has(c)) ordered.push(c);
		}
		ordered.forEach((c, i) => (c.order = i));
		log(
			'Prepared columns for POST (first 10)',
			ordered.slice(0, 10).map((c) => ({ name: c.name, order: c.order }))
		);
		return ordered;
	}
	function debounceSave() {
		STATE.dirty = true;
		clearTimeout(STATE.debounceTimer);
		STATE.debounceTimer = setTimeout(saveIfNeeded, 600);
		setStatus('Pending save…');
	}
	async function saveIfNeeded() {
		if (!STATE.dirty || STATE.inFlight) return;
		STATE.inFlight = true;
		STATE.dirty = false;
		setStatus('Saving…');
		try {
			const updated = applyOrderFromDom();
			await postSchema(STATE.datasetId, updated);
			setStatus('Saved ✔');
			if (
				STATE.mode === 'virtual' &&
				STATE._virtualParent &&
				STATE.rows?.length
			) {
				STATE.rows.forEach((r) => {
					if (r.parentNode === STATE._virtualParent)
						STATE._virtualParent.appendChild(r);
				});
			}
			// After save, reload the page to reflect new order
			setTimeout(() => {
				location.reload();
			}, 350);
		} catch (e) {
			error('Save failed', e);
			setStatus('Save failed', 'error');
		} finally {
			STATE.inFlight = false;
		}
	}
	function enableDragAndDrop(struct) {
		let dragEl = null;
		let dragIndex = -1;
		const placeholder = document.createElement('div');
		placeholder.className = 'schema-reorder-placeholder';
		placeholder.style.cssText =
			'height:6px;border:1px dashed #4da3ff;margin:2px 0;background:rgba(77,163,255,0.15);border-radius:3px;';
		const parent =
			struct.type === 'table' ? struct.container : struct.container;
		function rowList() {
			return STATE.rows;
		}
		function onDragStart(e) {
			// Only allow if initiated from handle or row itself (fallback)
			if (
				!e.target.closest('.schema-reorder-handle') &&
				!e.target.classList.contains('schema-reorder-row')
			) {
				e.preventDefault();
				return;
			}
			dragEl = e.currentTarget;
			dragIndex = rowList().indexOf(dragEl);
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', '');
			dragEl.style.opacity = '.4';
		}
		function onDragOver(e) {
			if (!dragEl) return;
			e.preventDefault();
			const target = e.currentTarget;
			if (target === dragEl || target === placeholder) return;
			const rect = target.getBoundingClientRect();
			const before = e.clientY - rect.top < rect.height / 2;
			if (before) parent.insertBefore(placeholder, target);
			else parent.insertBefore(placeholder, target.nextSibling);
		}
		function onDragEnd() {
			if (!dragEl) return;
			dragEl.style.opacity = '';
			if (placeholder.parentNode) {
				parent.insertBefore(dragEl, placeholder);
				placeholder.remove();
				STATE.rows = [...parent.children].filter(
					(c) => c.classList && c.classList.contains('schema-reorder-row')
				);
				if (STATE.rows.indexOf(dragEl) !== dragIndex) debounceSave();
			}
			dragEl = null;
			dragIndex = -1;
		}
		function onDragEnter(e) {
			e.preventDefault();
		}
		function applyListeners() {
			STATE.rows.forEach((r) => {
				if (r.__schemaReorderBound) return;
				r.__schemaReorderBound = true;
				r.addEventListener('dragstart', onDragStart, false);
				r.addEventListener('dragend', onDragEnd, false);
				r.addEventListener('dragover', onDragOver, false);
				r.addEventListener('dragenter', onDragEnter, false);
				r.classList.add('schema-reorder-draggable');
			});
		}
		applyListeners();
		const observer = new MutationObserver(() => {
			const newRows = struct
				.rows()
				.filter((r) => !r.classList.contains('schema-reorder-placeholder'));
			if (
				newRows.length !== STATE.rows.length ||
				newRows.some((r) => !r.__schemaReorderBound)
			) {
				STATE.rows = newRows;
				STATE.rows.forEach((r) => {
					r.style.cursor = 'grab';
					r.setAttribute('draggable', 'true');
					r.classList.add('schema-reorder-row');
				});
				applyListeners();
			}
		});
		observer.observe(parent, { childList: true, subtree: false });
		STATE._observer = observer;
		STATE._dndCleanup = () => {
			observer.disconnect();
			STATE.rows.forEach((r) => {
				r.removeEventListener('dragstart', onDragStart, false);
				r.removeEventListener('dragend', onDragEnd, false);
				r.removeEventListener('dragover', onDragOver, false);
				r.removeEventListener('dragenter', onDragEnter, false);
				r.removeAttribute('draggable');
				r.style.cursor = '';
				r.classList.remove('schema-reorder-draggable', 'schema-reorder-row');
				delete r.__schemaReorderBound;
			});
		};
	}
	function enableVirtualDrag() {
		const parent = STATE._virtualParent;
		if (!parent) return;
		const overflowFix = document.querySelector(
			'.ReactVirtualized__Grid__innerScrollContainer'
		);
		if (overflowFix) overflowFix.style.overflow = 'visible';
		if (!STATE._origTransforms) STATE._origTransforms = new Map();
		function parseTransform(tr) {
			if (!tr || tr === 'none') return { x: 0, y: 0 };
			if (tr.startsWith('matrix')) {
				const p = tr.replace('matrix(', '').replace(')', '').split(',');
				return { x: parseFloat(p[4]) || 0, y: parseFloat(p[5]) || 0 };
			}
			const m = tr.match(/translate(?:3d)?\(([-\d.]+)px,\s*([- -9.]+)px/);
			return m
				? { x: parseFloat(m[1]) || 0, y: parseFloat(m[2]) || 0 }
				: { x: 0, y: 0 };
		}
		function refreshRows() {
			STATE.rows = STATE.rows.filter((r) => r && r.parentNode);
		}
		let dragging = null,
			startY = 0,
			startIndex = 0,
			origPos = null;
		function computeOrdered() {
			return STATE.rows
				.slice()
				.sort(
					(a, b) =>
						a.getBoundingClientRect().top - b.getBoundingClientRect().top
				);
		}
		function onPointerDown(e) {
			const handle = e.target.closest('.schema-reorder-handle');
			if (!handle) return;
			const row = handle.closest('.schema-reorder-row');
			if (!row) return;
			refreshRows();
			const ordered = computeOrdered();
			startIndex = ordered.indexOf(row);
			if (startIndex < 0) return;
			dragging = row;
			const tr =
				row.style.transform || getComputedStyle(row).transform || 'none';
			if (!STATE._origTransforms.has(row)) STATE._origTransforms.set(row, tr);
			origPos = parseTransform(tr);
			startY = e.clientY;
			row.setPointerCapture(e.pointerId);
			row.style.zIndex = 999;
			row.style.transition = 'none';
		}
		function onPointerMove(e) {
			if (!dragging) return;
			const dy = e.clientY - startY;
			dragging.style.transform = `translate(${origPos.x}px, ${
				origPos.y + dy
			}px)`;
		}
		function onPointerUp(e) {
			if (!dragging) return;
			dragging.releasePointerCapture(e.pointerId);
			const ordered = computeOrdered();
			const dragRect = dragging.getBoundingClientRect();
			const dragMid = dragRect.top + dragRect.height / 2;
			// Compute insertion index as number of other row midpoints strictly below dragMid
			const others = ordered.filter((r) => r !== dragging);
			let targetIndex = 0;
			for (const r of others) {
				const mid =
					r.getBoundingClientRect().top + r.getBoundingClientRect().height / 2;
				if (dragMid > mid) targetIndex++;
				else break;
			}
			// Build new order
			const newOrder = [...others];
			newOrder.splice(targetIndex, 0, dragging);
			const changed = newOrder.indexOf(dragging) !== startIndex;
			STATE.rows = newOrder;
			// Animate and reorder DOM
			newOrder.forEach((row, idx) => {
				row.style.transition = 'transform 0.25s cubic-bezier(.4,1.6,.4,1)';
				row.style.transform = '';
			});
			setTimeout(() => {
				// Re-append the full row divs to the parent container if not already in order
				newOrder.forEach((r) => {
					if (r.parentNode === parent) parent.appendChild(r);
				});
				newOrder.forEach((r) => (r.style.transition = ''));
			}, 260);
			dragging.style.transform = STATE._origTransforms.get(dragging) || '';
			dragging.style.zIndex = '';
			dragging.style.transition = '';
			const wasDragging = dragging;
			dragging = null;
			if (changed) debounceSave();
		}
		parent.addEventListener('pointerdown', onPointerDown);
		parent.addEventListener('pointermove', onPointerMove);
		parent.addEventListener('pointerup', onPointerUp);
		parent.addEventListener('pointercancel', onPointerUp);
		STATE._dndCleanupVirtual = () => {
			parent.removeEventListener('pointerdown', onPointerDown);
			parent.removeEventListener('pointermove', onPointerMove);
			parent.removeEventListener('pointerup', onPointerUp);
			parent.removeEventListener('pointercancel', onPointerUp);
		};
	}
	function captureOriginalOrder() {
		STATE.originalOrder = currentDomOrderNames();
		STATE.originalRowRefs = STATE.rows.slice();
	}
	function undo() {
		if (STATE.mode === 'virtual' && STATE.originalRowRefs) {
			STATE.rows = STATE.originalRowRefs.slice();
			if (STATE._layoutVirtual) STATE._layoutVirtual();
		} else {
			if (!STATE.originalOrder.length) return;
			const parent = STATE.rows[0] && STATE.rows[0].parentNode;
			if (!parent) return;
			const nameToRow = new Map();
			STATE.rows.forEach((r) => nameToRow.set(extractRowName(r), r));
			STATE.originalOrder.forEach((name) => {
				const row = nameToRow.get(name);
				if (row) parent.appendChild(row);
			});
			STATE.rows = [...parent.children].filter(
				(c) => c.classList && c.classList.contains('schema-reorder-row')
			);
		}
		debounceSave();
	}
	async function init() {
		try {
			STATE.datasetId = getDatasetId();
			if (!STATE.datasetId)
				throw new Error('Could not parse dataset ID from URL');
			setStatus('Loading schema…');
			STATE.schema = await fetchSchema(STATE.datasetId);
			const virtual = detectVirtualRows();
			if (virtual) {
				STATE.mode = 'virtual';
				mapVirtualRows(virtual);
				assignColumnsToRows();
				captureOriginalOrder();
				const overflowFix = document.querySelector(
					'.ReactVirtualized__Grid__innerScrollContainer'
				);
				if (overflowFix) overflowFix.style.overflow = 'visible';
				enableVirtualDrag();
			} else {
				const struct = findStructure();
				if (!struct) throw new Error('Could not locate column list');
				STATE._headerRow = struct.headerRow;
				mapRows(struct);
				assignColumnsToRows();
				if (!STATE.rows.length) throw new Error('No column rows found');
				captureOriginalOrder();
				enableDragAndDrop(struct);
				STATE.mode = struct.type;
			}
			injectStyles();
			setStatus('Ready – drag rows');
			log(
				'Initialized mode',
				STATE.mode,
				'rows:',
				STATE.rows.length,
				'dataset',
				STATE.datasetId
			);
		} catch (e) {
			error(e);
			setStatus(e.message || 'Init failed', 'error');
		}
	}
	function injectStyles() {
		if (document.getElementById('schema-reorder-styles')) return;
		const s = document.createElement('style');
		s.id = 'schema-reorder-styles';
		s.textContent =
			'.schema-reorder-row{position:relative;} .schema-reorder-handle{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin:0 4px 0 0;color:#6699cc;font-size:14px;opacity:.65;flex:0 0 auto;position:relative;top:0;} .schema-reorder-handle:hover{opacity:1} .schema-reorder-draggable{transition:background-color .15s} .schema-reorder-draggable:hover{background:rgba(77,163,255,0.06)!important} .schema-reorder-placeholder{animation:pulse 1s infinite alternate} @keyframes pulse{from{background-color:rgba(77,163,255,0.15)} to{background-color:rgba(77,163,255,0.30)}} #schema-reorder-panel button:active{transform:translateY(1px)}';
		document.head.appendChild(s);
	}
	function stop(toggled) {
		if (STATE.stopRequested) return;
		STATE.stopRequested = true;
		clearTimeout(STATE.debounceTimer);
		saveIfNeeded();
		if (STATE._observer) STATE._observer.disconnect();
		if (STATE._dndCleanup) STATE._dndCleanup();
		if (STATE._dndCleanupVirtual) STATE._dndCleanupVirtual();
		const p = document.getElementById('schema-reorder-panel');
		if (p) p.remove();
		const style = document.getElementById('schema-reorder-styles');
		if (style) style.remove();
		window.removeEventListener('beforeunload', handleUnload);
		delete window.__domoSchemaReorder;
		if (!toggled) log('Session ended');
	}
	function handleUnload() {
		stop();
	}
	const panel = buildPanel();
	const api = { stop };
	window.__domoSchemaReorder = api;
	window.addEventListener('beforeunload', handleUnload);
	init();
})();
