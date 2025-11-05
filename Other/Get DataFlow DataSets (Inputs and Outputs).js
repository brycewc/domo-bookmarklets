javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('dataflows/')) {
		const parts = url.split(/[/?=&]/);
		const dataflowId = parts[parts.indexOf('dataflows') + 1];

		fetch(`${location.origin}/api/dataprocessing/v2/dataflows/${dataflowId}`, {
			method: 'GET'
		})
			.then(async (response) => {
				if (response.ok) {
					const dataflow = await response.json();
					const inputs = dataflow.inputs || [];
					const outputs = dataflow.outputs || [];

					if (inputs.length > 0 || outputs.length > 0) {
						// Build dataset elements for inputs
						const inputElements =
							inputs.length > 0
								? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${inputs
										.sort((a, b) => {
											const nameA =
												a.dataSourceName ?? `DataSet ${a.dataSourceId}`;
											const nameB =
												b.dataSourceName ?? `DataSet ${b.dataSourceId}`;
											return nameA.localeCompare(nameB);
										})
										.map((dataset) => {
											const dsId = dataset.dataSourceId;
											const dsName =
												dataset.dataSourceName ?? `DataSet ${dsId}`;
											const escapedName = dsName
												.replace(/'/g, "\\'")
												.replace(/"/g, '\\"');
											return `<li style="margin-bottom:0.25em;list-style:disc;">
										<a href="javascript:void(0)" onclick="openDataset('${dsId}', '${escapedName}')" style="text-decoration:underline;cursor:pointer;color:#0066cc;">${dsName}</a>
									</li>`;
										})
										.join('')}</ul>`
								: `<div style="color:#888;font-style:italic;margin:0.5em 0 1em 1.5em;">No input datasets</div>`;

						// Build dataset elements for outputs
						const outputElements =
							outputs.length > 0
								? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${outputs
										.sort((a, b) => {
											const nameA =
												a.dataSourceName ?? `DataSet ${a.dataSourceId}`;
											const nameB =
												b.dataSourceName ?? `DataSet ${b.dataSourceId}`;
											return nameA.localeCompare(nameB);
										})
										.map((dataset) => {
											const dsId = dataset.dataSourceId;
											const dsName =
												dataset.dataSourceName ?? `DataSet ${dsId}`;
											const escapedName = dsName
												.replace(/'/g, "\\'")
												.replace(/"/g, '\\"');
											return `<li style="margin-bottom:0.25em;list-style:disc;">
										<a href="javascript:void(0)" onclick="openDataset('${dsId}', '${escapedName}')" style="text-decoration:underline;cursor:pointer;color:#0066cc;">${dsName}</a>
									</li>`;
										})
										.join('')}</ul>`
								: `<div style="color:#888;font-style:italic;margin:0.5em 0 1em 1.5em;">No output datasets</div>`;

						const dataflowUrl = `<a href="${
							location.origin
						}/datacenter/dataflows/${dataflowId}/details#datasets" target="_blank">${
							dataflow.name || `DataFlow ${dataflowId}`
						}</a>`;
						const message = `
							<div style="font-family:sans-serif;">
								<div style="display:flex;align-items:flex-start;justify-content:space-between;">
									<strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:100px;">
										${dataflowUrl} (ID: ${dataflowId}) uses the following DataSets:
									</strong>
								</div>
								<div style="display:flex;align-items:center;justify-content:left;margin-top:1em;">
									<h4 style="margin:0;color:#333;">Input DataSets</h4>
									${
										inputs.length > 0
											? `<button class="open-inputs-btn" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;" title="Open all input DataSets, each in a new tab">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
									</button>`
											: ''
									}
								</div>
								${inputElements}
								<div style="display:flex;align-items:center;justify-content:left;margin-top:1em;">
									<h4 style="margin:0;color:#333;">Output DataSets</h4>
									${
										outputs.length > 0
											? `<button class="open-outputs-btn" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;" title="Open all output DataSets, each in a new tab">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
									</button>`
											: ''
									}
								</div>
								${outputElements}
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

						// Open All button (icon-only, styled like close button)
						const openAllBtn = document.createElement('button');
						openAllBtn.setAttribute(
							'style',
							'position:absolute;top:16px;right:56px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;'
						);
						openAllBtn.title = 'Open all DataSets, each in a new tab';
						openAllBtn.innerHTML =
							'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

						// Helper function to open dataset with proper title and navigation
						const openDatasetWithTitle = (dataset) => {
							const dsId =
								dataset.dataSourceId ??
								dataset.datasourceId ??
								dataset.id ??
								dataset.dataSetId;
							const dsName =
								dataset.dataSourceName ??
								dataset.datasourceName ??
								dataset.name ??
								'DataSet ' + dsId;
							if (!dsId) return;

							const newTab = window.open(
								location.origin +
									'/datasources/' +
									dsId +
									'/details/data/table',
								'_blank'
							);
							setTimeout(() => {
								try {
									newTab.document.title = dsName + ' - Data';
									// Set title again after a delay to override any Domo title changes
									setTimeout(() => {
										newTab.document.title = dsName + ' - Data';
									}, 1000);
									setTimeout(() => {
										newTab.document.title = dsName + ' - Data';
									}, 5000);
								} catch (e) {
									console.log('Could not set title for', dsName);
								}
							}, 1000);
						};

						// Global function for individual dataset links
						window.openDataset = function (dsId, dsName) {
							const newTab = window.open(
								location.origin +
									'/datasources/' +
									dsId +
									'/details/data/table',
								'_blank'
							);
							setTimeout(() => {
								try {
									newTab.document.title = dsName + ' - Data';
									// Set title again after a delay to override any Domo title changes
									setTimeout(() => {
										newTab.document.title = dsName + ' - Data';
									}, 1000);
									setTimeout(() => {
										newTab.document.title = dsName + ' - Data';
									}, 5000);
								} catch (e) {
									console.log('Could not set title for', dsName);
								}
							}, 1000);
						};

						openAllBtn.onclick = () => {
							const allDatasets = [...inputs, ...outputs];
							allDatasets.forEach((dataset, index) => {
								openDatasetWithTitle(dataset);
							});
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

						// Add event handlers for section-specific open buttons
						const openInputsBtn =
							modalContent.querySelector('.open-inputs-btn');
						if (openInputsBtn) {
							openInputsBtn.onclick = () => {
								inputs.forEach((dataset, index) => {
									openDatasetWithTitle(dataset);
								});
							};
						}

						const openOutputsBtn =
							modalContent.querySelector('.open-outputs-btn');
						if (openOutputsBtn) {
							openOutputsBtn.onclick = () => {
								outputs.forEach((dataset, index) => {
									openDatasetWithTitle(dataset);
								});
							};
						}

						modalContent.appendChild(openAllBtn);
						modalContent.appendChild(closeBtn);
						modal.appendChild(modalContent);
						document.body.appendChild(modal);

						// Watch for URL changes (SPA navigation or back/forward)
						const initialUrl = location.href;
						urlWatcher = setInterval(() => {
							if (location.href !== initialUrl) {
								cleanup();
							}
						}, 500);
						window.addEventListener('popstate', cleanup);
						window.addEventListener('hashchange', cleanup);
					} else {
						alert(`DataFlow ${dataflowId} does not use any DataSets`);
					}
				} else {
					alert(
						`Failed to fetch DataFlow ${dataflowId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to fetch DataFlow ${dataflowId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on DataFlow URLs.\nPlease navigate to a valid DataFlow URL and try again.'
		);
	}
})();
