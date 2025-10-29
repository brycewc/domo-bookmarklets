javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('datasources/') || url.includes('fusion/')) {
		const parts = url.split(/[/?=&]/);
		const viewId = url.includes('datasources/')
			? parts[parts.indexOf('datasources') + 1]
			: parts[parts.indexOf('fusion') + 1];

		fetch(
			`https://${window.location.hostname}/api/data/v3/datasources/${viewId}?includeAllDetails=true`,
			{ method: 'GET' }
		).then(async (viewResponse) => {
			if (!viewResponse.ok) {
				alert(
					`Failed to fetch View ${viewId}.\nHTTP status: ${viewResponse.status}`
				);
				return;
			}
			const view = await viewResponse.json();
			const providerType =
				view?.dataProviderType || view?.displayType || view?.type.toLowerCase();
			if (providerType !== 'dataset-view' && providerType !== 'datafusion') {
				alert(
					`DataSet ${viewId} is not a DataSet View. This bookmarklet only works on DataSet Views. Please navigate to a valid DataSet View and try again.`
				);
				return;
			}

			// 1) Fetch the View schema
			fetch(
				`https://${window.location.hostname}/api/query/v1/datasources/${viewId}/schema/indexed?includeHidden=true`,
				{ method: 'GET' }
			)
				.then(async (response) => {
					if (!response.ok) {
						alert(
							`Failed to fetch View ${viewId}.\nHTTP status: ${response.status}`
						);
						return;
					}
					const schema = await response.json();

					// 2) Extract DataSet IDs from both SQL and DataFusion schema structures
					const idsSet = new Set();
					const stripTicks = (s) =>
						typeof s === 'string' ? s.replace(/`/g, '') : s;

					// Handle DataFusion schema structure (has 'views' array)
					if (schema.views && Array.isArray(schema.views)) {
						for (const view of schema.views) {
							// Extract from 'from' field
							if (view.from) {
								idsSet.add(stripTicks(view.from));
							}
							// Extract from columnFuses datasource references
							if (view.columnFuses && Array.isArray(view.columnFuses)) {
								for (const fuse of view.columnFuses) {
									if (fuse.datasource) {
										idsSet.add(stripTicks(fuse.datasource));
									}
								}
							}
						}
					}
					// Handle SQL schema structure (has 'select' object)
					else if (schema.select && schema.select.selectBody) {
						const sel = schema.select.selectBody;
						if (sel.fromItem && sel.fromItem.name) {
							idsSet.add(stripTicks(sel.fromItem.name));
						}
						if (Array.isArray(sel.joins)) {
							for (const j of sel.joins) {
								if (!j) continue;
								// If left is true, use rightItem.name; if left is false, use leftItem.name
								const name =
									j.left === false
										? j.leftItem && j.leftItem.name
										: j.rightItem && j.rightItem.name;
								if (name) idsSet.add(stripTicks(name));
							}
						}
					} else {
						alert(
							'Unsupported schema structure. This View may use a format not yet supported by this bookmarklet.'
						);
						return;
					}

					const dataSourceIds = Array.from(idsSet).filter(Boolean);
					if (dataSourceIds.length === 0) {
						alert('No DataSets found in this View.');
						return;
					}

					// 3) Fetch DataSet names via bulk endpoint
					const bulkUrl = `https://${window.location.hostname}/api/data/v3/datasources/bulk?includePrivate=true&includeAllDetails=true`;
					const namesResp = await fetch(bulkUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(dataSourceIds)
					});
					if (!namesResp.ok) {
						alert(
							`Failed to fetch DataSet names.\nHTTP status: ${namesResp.status}`
						);
						return;
					}
					const namesJson = await namesResp.json();
					const dsArray = (namesJson && namesJson.dataSources) || [];

					if (!Array.isArray(dsArray) || dsArray.length === 0) {
						alert('No DataSets returned from bulk API.');
						return;
					}

					// 4) Build modal with just DataSets (names + links)
					// Keep original request order when possible
					const byId = Object.fromEntries(
						dsArray.map((d) => [d.id || d.dataSourceId, d])
					);
					const ordered = dataSourceIds.map((id) => byId[id]).filter(Boolean);

					const listHtml = `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${ordered
						.map((d) => {
							const id = d.id || d.dataSourceId;
							const name = d.name || d.dataSourceName || `DataSet ${id}`;
							return `<li style="margin-bottom:0.25em;list-style:disc;"><a href="https://${window.location.hostname}/datasources/${id}/details/overview" target="_blank" style="text-decoration:underline;">${name}</a></li>`;
						})
						.join('')}</ul>`;

					const message = `
						<div style="font-family:sans-serif;">
							<div style="display:flex;align-items:flex-start;justify-content:space-between;">
								<strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:5em;">
									View <a href="https://${window.location.hostname}/datasources/${viewId}/details/overview" target="_blank" style="text-decoration:underline;">${view.name}</a> (ID: ${viewId}) contains the following DataSets:
								</strong>
							</div>
							${listHtml}
						</div>
					`;

					// Modal container
					const modal = document.createElement('div');
					modal.setAttribute(
						'style',
						'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
					);

					// Modal content
					const modalContent = document.createElement('div');
					modalContent.setAttribute(
						'style',
						'background:white;padding:24px 32px 24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:320px;max-width:90vw;position:relative;overflow:auto;max-height:90vh;'
					);

					// Dismiss button
					const closeBtn = document.createElement('button');
					closeBtn.innerHTML = '&times;';
					closeBtn.setAttribute(
						'style',
						'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;'
					);

					// Open All button (icon-only)
					const openAllBtn = document.createElement('button');
					openAllBtn.setAttribute(
						'style',
						'position:absolute;top:16px;right:56px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;'
					);
					openAllBtn.title = 'Open all DataSets, each in a new tab';
					openAllBtn.innerHTML =
						'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
					openAllBtn.onclick = () => {
						for (const d of ordered) {
							const id = d.id || d.dataSourceId;
							if (!id) continue;
							window.open(
								`https://${window.location.hostname}/datasources/${id}/details/overview`,
								'_blank'
							);
						}
					};

					// URL change cleanup
					let urlWatcher;
					const cleanup = () => {
						if (modal && modal.parentNode) modal.remove();
						window.removeEventListener('popstate', cleanup);
						window.removeEventListener('hashchange', cleanup);
						if (urlWatcher) clearInterval(urlWatcher);
					};
					closeBtn.onclick = cleanup;

					modalContent.innerHTML = message;
					modalContent.appendChild(openAllBtn);
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
					alert(`Failed to fetch View ${viewId}.\nError: ${error.message}`);
					console.error(error);
				});
		});
	} else {
		alert(
			'This bookmarklet can only be used on DataSet URLs.\nPlease navigate to a valid DataSet URL and try again.'
		);
	}
})();
