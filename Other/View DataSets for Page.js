javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('page')) {
		const parts = url.split(/[/?=&]/);
		const pageType = url.includes('app-studio') ? 'DATA_APP_VIEW' : 'PAGE';
		const appId =
			pageType === 'DATA_APP_VIEW'
				? parts[parts.indexOf('app-studio') + 1]
				: null;
		const pageId =
			pageType === 'DATA_APP_VIEW'
				? parts[parts.indexOf('pages') + 1]
				: parts[parts.indexOf('page') + 1];

		fetch(
			`https://${window.location.hostname}/api/content/v3/stacks/${pageId}/cards?parts=datasources`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const page = await response.json();
					const cards = page.cards;
					if (cards && cards.length > 0) {
						// Build a flat, de-duplicated list of datasets by ID
						const allDatasets = cards.reduce((acc, card) => {
							if (card && Array.isArray(card.datasources)) {
								acc.push(...card.datasources);
							}
							return acc;
						}, []);
						const seen = new Set();
						var datasets = [];
						for (const ds of allDatasets) {
							if (!ds) continue;
							const key =
								ds.dataSourceId ?? ds.datasourceId ?? ds.id ?? ds.dataSetId;
							if (!key || seen.has(key)) continue;
							seen.add(key);
							datasets.push(ds);
						}
						if (datasets && datasets.length > 0) {
							// Build map of datasetId -> unique list of cards using it
							const dsToCards = {};
							for (const card of cards) {
								if (!card || !Array.isArray(card.datasources)) continue;
								const perCardSet = new Set();
								for (const ds of card.datasources) {
									if (!ds) continue;
									const id =
										ds.dataSourceId ?? ds.datasourceId ?? ds.id ?? ds.dataSetId;
									if (id) perCardSet.add(id);
								}
								const cardId =
									card.id ??
									card.kpiId ??
									(typeof card.urn === 'string'
										? card.urn.split(':').pop()
										: undefined);
								const cardTitle =
									card.title ??
									card.name ??
									(cardId ? `Card ${cardId}` : 'Card');
								perCardSet.forEach((id) => {
									if (!dsToCards[id]) dsToCards[id] = [];
									if (!dsToCards[id].some((c) => c.id === cardId)) {
										dsToCards[id].push({ id: cardId, title: cardTitle });
									}
								});
							}
							const datasetElements = `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${datasets
								.map((dataset) => {
									const dsId =
										dataset.dataSourceId ??
										dataset.datasourceId ??
										dataset.id ??
										dataset.dataSetId;
									const dsName =
										dataset.dataSourceName ??
										dataset.datasourceName ??
										dataset.name ??
										`DataSet ${dsId}`;
									const cardsForDs = dsToCards[dsId] || [];
									const count = cardsForDs.length;
									const countLabel = count === 1 ? '1 card' : `${count} cards`;
									const cardsHtml = count
										? `<div class="ds-cards" style="display:none;margin-top:4px;margin-left:0.5em;"><ul style="margin:0.25em 0 0 1em;padding-left:1em;">${[
												...cardsForDs
										  ]
												.sort((a, b) =>
													String(a.title).localeCompare(String(b.title))
												)
												.map((c) =>
													pageType === 'DATA_APP_VIEW'
														? `<li style="margin:0.125em 0;list-style:disc;"><a href="https://${window.location.hostname}/app-studio/${appId}/pages/${pageId}/kpis/details/${c.id}" target="_blank" style="text-decoration:underline;">${c.title}</a></li>`
														: `<li style="margin:0.125em 0;list-style:disc;"><a href="https://${window.location.hostname}/page/${pageId}/kpis/details/${c.id}" target="_blank" style="text-decoration:underline;">${c.title}</a></li>`
												)
												.join('')}</ul></div>`
										: '';
									return `<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="https://${window.location.hostname}/datasources/${dsId}/details/overview" target="_blank" style="text-decoration:underline;">${dsName}</a><button class="ds-count" data-dsid="${dsId}" aria-expanded="false" title="Show cards using this DataSet" style="color:#666;font-size:12px;margin-left:8px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;"><svg class="ds-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;transform:rotate(0deg);transition:transform 0.15s;"><polyline points="8 4 16 12 8 20"></polyline></svg>(${countLabel})</button>${cardsHtml}</li>`;
								})
								.join('')}</ul>`;
							const pageUrls =
								pageType === 'DATA_APP_VIEW'
									? `<a href="https://${window.location.hostname}/app-studio/${appId}/pages/${pageId}" target="_blank">App Page ${page.page.title}</a>`
									: `<a href="https://${window.location.hostname}/page/${pageId}" target="_blank">Page ${page.page.title}</a>`;
							const message = `
    <div style="font-family:sans-serif;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;">
            <strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:5em;">${pageUrls} (ID: ${pageId}) contains the following DataSets:
            </strong>
        </div>
        ${datasetElements}
    </div>
`;

							// Modal container
							const modal = document.createElement('div');
							modal.setAttribute(
								'style',
								'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center;'
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

							// Open All button (icon-only, styled like close button)
							const openAllBtn = document.createElement('button');
							openAllBtn.setAttribute(
								'style',
								'position:absolute;top:16px;right:56px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;'
							);
							openAllBtn.title = 'Open all DataSets, each in a new tab';
							openAllBtn.innerHTML =
								'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
							openAllBtn.onclick = () => {
								for (const dataset of datasets) {
									const dsId =
										dataset.dataSourceId ??
										dataset.datasourceId ??
										dataset.id ??
										dataset.dataSetId;
									if (!dsId) continue;
									window.open(
										`https://${window.location.hostname}/datasources/${dsId}/details/overview`,
										'_blank'
									);
								}
							};

							// Placeholder for URL watcher interval id (must exist before cleanup definition)
							let urlWatcher;
							// Cleanup function to remove modal & listeners
							const cleanup = () => {
								if (modal && modal.parentNode) modal.remove();
								window.removeEventListener('popstate', cleanup);
								window.removeEventListener('hashchange', cleanup);
								if (urlWatcher) clearInterval(urlWatcher);
							};

							closeBtn.onclick = cleanup;

							modalContent.innerHTML = message;
							// Wire up dataset count toggles and arrow rotation
							const dsButtons =
								modalContent.querySelectorAll('button.ds-count');
							dsButtons.forEach((btn) => {
								btn.addEventListener('click', () => {
									const list =
										btn.parentElement &&
										btn.parentElement.querySelector('.ds-cards');
									if (!list) return;
									const isHidden =
										list.style.display === 'none' || list.style.display === '';
									list.style.display = isHidden ? 'block' : 'none';
									btn.title = isHidden
										? 'Hide cards using this DataSet'
										: 'Show cards using this DataSet';
									btn.setAttribute(
										'aria-expanded',
										isHidden ? 'true' : 'false'
									);
									const arrow = btn.querySelector('.ds-arrow');
									if (arrow) {
										arrow.style.transform = isHidden
											? 'rotate(90deg)'
											: 'rotate(0deg)';
									}
								});
							});
							modalContent.appendChild(openAllBtn);
							modalContent.appendChild(closeBtn);
							modal.appendChild(modalContent);
							document.body.appendChild(modal);

							// Watch for URL changes (SPA navigation or back/forward)
							const initialUrl = window.location.href;
							urlWatcher = setInterval(() => {
								if (window.location.href !== initialUrl) {
									cleanup();
								}
							}, 500);
							window.addEventListener('popstate', cleanup);
							window.addEventListener('hashchange', cleanup);
						} else {
							alert(`Page ${pageId} does not use any DataSets`);
						}
					} else {
						alert(`Page ${pageId} not found.`);
					}
				} else {
					alert(
						`Failed to fetch Page ${pageId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(`Failed to fetch Page ${pageId}.\nError: ${error.message}`);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
