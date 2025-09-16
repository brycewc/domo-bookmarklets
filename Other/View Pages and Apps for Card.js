javascript: (() => {
	// Ensure we are on a domo domain
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}

	const url = window.location.href;

	// --- Helper: attempt to pull a KPI/Card ID from an open details modal (used on Pages & App Studio) ---
	function getModalKpiId() {
		try {
			const detailsEl = document.querySelector('cd-details-title');
			if (
				detailsEl &&
				window.angular &&
				typeof window.angular.element === 'function'
			) {
				const ngScope = window.angular.element(detailsEl).scope();
				const kpiId = ngScope && ngScope.$ctrl && ngScope.$ctrl.kpiId;
				if (kpiId) return String(kpiId);
			}
		} catch (e) {
			// swallow – we'll fall back to other strategies
		}
		return null;
	}

	// --- Helper: parse card id from URL segments (classic KPI detail URLs) ---
	function getUrlCardId() {
		// Common patterns observed:
		// /kpis/details/{id}
		// /kpis/preview/{id}
		// /kpis/shared/details/{id}
		// query params ?kpiId={id} or ?kpi={id}
		const parts = url.split(/[/?&#=]/).filter(Boolean);
		const idxDetails = parts.indexOf('details');
		if (idxDetails !== -1 && parts[idxDetails + 1])
			return parts[idxDetails + 1];
		const idxPreview = parts.indexOf('preview');
		if (idxPreview !== -1 && parts[idxPreview + 1])
			return parts[idxPreview + 1];

		// Query string
		try {
			const u = new URL(url);
			if (u.searchParams.get('kpiId')) return u.searchParams.get('kpiId');
			if (u.searchParams.get('kpi')) return u.searchParams.get('kpi');
			if (u.searchParams.get('cardId')) return u.searchParams.get('cardId');
		} catch (_) {}
		return null;
	}

	// --- Helper: attempt to discover card id from DOM data attributes (future-proofing) ---
	function getDomDataCardId() {
		// Look for any element that exposes a data attribute with plausible id
		const selectorCandidates = [
			'[data-kpi-id]',
			'[data-card-id]',
			'[data-kpiid]',
			'[data-cardid]'
		];
		for (const sel of selectorCandidates) {
			const el = document.querySelector(sel);
			if (el) {
				const val =
					el.getAttribute('data-kpi-id') ||
					el.getAttribute('data-card-id') ||
					el.getAttribute('data-kpiid') ||
					el.getAttribute('data-cardid');
				if (val) return val;
			}
		}
		return null;
	}

	// Determine the cardId (priority: modal scope > URL > DOM data attributes)
	const cardId = getModalKpiId() || getUrlCardId() || getDomDataCardId();

	if (!cardId) {
		alert(
			'Unable to determine Card ID.\nOpen a card (details view or modal) and then run the bookmarklet again.'
		);
		return;
	}

	// Build the request (keeping existing parts param for pages & app pages)
	fetch(
		`https://${window.location.hostname}/api/content/v1/cards?urns=${cardId}&parts=adminAllPages`,
		{ method: 'GET' }
	)
		.then(async (response) => {
			if (!response.ok) {
				alert(
					`Failed to fetch Card ${cardId}.\nHTTP status: ${response.status}`
				);
				return;
			}
			const cards = await response.json();
			const card = cards && cards[0];
			if (!card) {
				alert(`Card ${cardId} not found.`);
				return;
			}

			const hasPages = card.adminAllPages && card.adminAllPages.length > 0;
			const hasAppPages =
				card.adminAllAppPages && card.adminAllAppPages.length > 0;

			if (!hasPages && !hasAppPages) {
				alert(`Card ${cardId} is not used in any pages or apps.`);
				return;
			}

			const adminPages = hasPages
				? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${card.adminAllPages
						.map(
							(page) =>
								`<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="https://${window.location.hostname}/page/${page.pageId}" target="_blank" style="text-decoration:underline;">${page.title}</a></li>`
						)
						.join('')}</ul>`
				: `<div style="color:#888;font-style:italic;margin-bottom:1em;">Card is not used on any Pages</div>`;

			const appPages = hasAppPages
				? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:0;padding-left:1.5em;list-style:disc;">${card.adminAllAppPages
						.map(
							(page) =>
								`<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="https://${window.location.hostname}/app-studio/${page.appId}/pages/${page.appPageId}" target="_blank" style="text-decoration:underline;">${page.appTitle} &gt; ${page.appPageTitle}</a></li>`
						)
						.join('')}</ul>`
				: `<div style="color:#888;font-style:italic;">Card is not used on any App Pages</div>`;

			const message = `
		<div style="font-family:sans-serif;">
				<div style="display:flex;align-items:flex-start;justify-content:space-between;">
						<strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:2.5em;">
								<a href="https://${window.location.hostname}/kpis/details/${cardId}" target="_blank">Card ${card.title}</a> (ID: ${cardId}) is used in the following pages:
						</strong>
				</div>
				<h4 style="margin-bottom:0.25em;">Pages</h4>
				${adminPages}
				<h4 style="margin-bottom:0.25em;margin-top:1em;">App Pages</h4>
				${appPages}
		</div>
`;

			// Present results in a dismissible overlay modal
			const modal = document.createElement('div');
			modal.setAttribute(
				'style',
				'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center;'
			);

			const modalContent = document.createElement('div');
			modalContent.setAttribute(
				'style',
				'background:white;padding:24px 32px 24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:320px;max-width:90vw;position:relative;overflow:auto;max-height:90vh;'
			);

			const closeBtn = document.createElement('button');
			closeBtn.innerHTML = '&times;';
			closeBtn.setAttribute(
				'style',
				'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;'
			);

			let urlWatcher;
			const cleanup = () => {
				if (modal && modal.parentNode) modal.remove();
				window.removeEventListener('popstate', cleanup);
				window.removeEventListener('hashchange', cleanup);
				if (urlWatcher) clearInterval(urlWatcher);
			};
			closeBtn.onclick = cleanup;

			modalContent.innerHTML = message;
			modalContent.appendChild(closeBtn);
			modal.appendChild(modalContent);
			document.body.appendChild(modal);

			const initialUrl = window.location.href;
			urlWatcher = setInterval(() => {
				if (window.location.href !== initialUrl) cleanup();
			}, 500);
			window.addEventListener('popstate', cleanup);
			window.addEventListener('hashchange', cleanup);
		})
		.catch((error) => {
			alert(`Failed to fetch Card ${cardId}.\nError: ${error.message}`);
			console.error(error);
		});
})();
