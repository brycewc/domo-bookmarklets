javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('datasources/')) {
		const parts = url.split(/[/?=&]/);
		const datasetId = parts[parts.indexOf('datasources') + 1];

		fetch(
			`${location.origin}/api/data/v1/lineage/DATA_SOURCE/${datasetId}?traverseUp=false&requestEntities=DATA_SOURCE`,
			{ method: 'GET' }
		).then(async (datasetResponse) => {
			if (!datasetResponse.ok) {
				alert(
					`Failed to fetch DataSet ${datasetId}.\nHTTP status: ${datasetResponse.status}`
				);
				return;
			}
			const datasetLineage = await datasetResponse.json();
			const datasets = Object.values(datasetLineage);

			const datasetIds = datasets.map((ds) => ds.id);

			fetch(
				`${location.origin}/api/data/v3/datasources/bulk?includePrivate=true&part=core,impactcounts&includeFormulas=false`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(datasetIds)
				}
			)
				.then(async (response) => {
					if (!response.ok) {
						alert(
							`Failed to fetch DataSet details.\nHTTP status: ${response.status}`
						);
						return;
					}
					const datasetsWithDetails = await response.json();

					const dsArray =
						(datasetsWithDetails && datasetsWithDetails.dataSources) || [];

					if (!Array.isArray(dsArray) || dsArray.length === 0) {
						alert('No DataSets returned from bulk API.');
						return;
					}

					// Extract current dataset info for the title
					const currentDataset = dsArray.find(
						(d) => (d.id || d.dataSourceId) === datasetId
					);
					const dataset = currentDataset || {
						name: `DataSet ${datasetId}`,
						id: datasetId
					};

					// Build modal with dependent DataSets (exclude current dataset from list)
					const byId = Object.fromEntries(
						dsArray.map((d) => [d.id || d.dataSourceId, d])
					);
					const dependentDatasetIds = datasetIds.filter(
						(id) => id !== datasetId
					);
					const ordered = dependentDatasetIds
						.map((id) => byId[id])
						.filter(Boolean);

					// Check if there are no dependent views
					let listHtml;
					if (ordered.length === 0) {
						listHtml = `<p style="margin-top:0.5em;margin-bottom:1em;color:#666;font-style:italic;">No dependent DataSet Views found. This DataSet is not used by any other DataSets.</p>`;
					} else {
						listHtml = `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${ordered
							.map((d) => {
								const id = d.id || d.dataSourceId;
								const name = d.name || d.dataSourceName || `DataSet ${id}`;
								const cardCount = d?.cardCount || 0;
								const cardText = cardCount === 1 ? 'card' : 'cards';
								const dataflowCount = d?.dataFlowCount || 0;
								const dataflowText =
									dataflowCount === 1 ? 'dataflow' : 'dataflows';
								return `<li style="margin-bottom:0.25em;list-style:disc;"><a href="${location.origin}/datasources/${id}/details/overview" target="_blank" style="text-decoration:underline;">${name}</a> <span style="color:#666;font-size:0.9em;">(${cardCount} ${cardText}, ${dataflowCount} ${dataflowText})</span></li>`;
							})
							.join('')}</ul>`;
					}
					const message = `
            <div style="font-family:sans-serif;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:5em;">
                  DataSet <a href="https://${
										location.hostname
									}/datasources/${datasetId}/details/overview" target="_blank" style="text-decoration:underline;">${
						dataset.name
					}</a> (ID: ${datasetId})${
						ordered.length === 0
							? ':'
							: ' has the following dependent DataSet Views:'
					}
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

					// Open All button (icon-only) - only show if there are dependent views
					let openAllBtn = null;
					if (ordered.length > 0) {
						openAllBtn = document.createElement('button');
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
									`${location.origin}/datasources/${id}/details/overview`,
									'_blank'
								);
							}
						};
					}

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
					if (openAllBtn) modalContent.appendChild(openAllBtn);
					modalContent.appendChild(closeBtn);
					modal.appendChild(modalContent);
					document.body.appendChild(modal);

					const initialUrl = location.href;
					urlWatcher = setInterval(() => {
						if (location.href !== initialUrl) cleanup();
					}, 500);
					window.addEventListener('popstate', cleanup);
					window.addEventListener('hashchange', cleanup);
				})
				.catch((error) => {
					alert(`Failed to fetch View ${datasetId}.\nError: ${error.message}`);
					console.error(error);
				});
		});
	} else {
		alert(
			'This bookmarklet can only be used on DataSet URLs.\nPlease navigate to a valid DataSet URL and try again.'
		);
	}
})();
