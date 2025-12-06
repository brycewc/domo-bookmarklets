javascript: (() => {
	function setActivityLogConfig(cfg, storageKey, instanceLabel) {
		try {
			localStorage.setItem(storageKey, JSON.stringify(cfg));
			// Optional: let power users know how to reset
			console.info(
				`Saved activity log settings for instance "${instanceLabel}". To reset, run: localStorage.removeItem('${storageKey}')`
			);
		} catch (e) {
			console.warn('Failed to save activity log settings to localStorage:', e);
		}
	}

	// Persist simple configuration per subdomain (portion before `.domo.com`) so users only enter it once
	async function getActivityLogConfig() {
		const host = location.hostname.toLowerCase();
		const rootSuffix = '.domo.com';
		const subdomain = host.endsWith(rootSuffix)
			? host.slice(0, -rootSuffix.length) // everything before `.domo.com`
			: host;
		const storageKey = `domo-bookmarklet-activity-log:${subdomain}`;
		let cfg = null;
		try {
			cfg = JSON.parse(localStorage.getItem(storageKey) || 'null');
		} catch (_) {
			cfg = null;
		}

		if (!cfg || !cfg.cardId || !cfg.objectIdColumn || !cfg.objectTypeColumn) {
			// First-time (or incomplete) setup: prompt for values
			const cardIdInput = prompt(
				"This bookmarklet requires a card built on activity log data, since DataSets don't support pfilters. The card must contain an object ID column and an object type column but doesn't have to be the raw DomoStats DataSet. This information will be saved in your browser's local storage so you don't have to enter it again.\n\nFirst, enter your activity log card ID:",
				cfg && cfg.cardId ? String(cfg.cardId) : ''
			);
			if (!cardIdInput) {
				alert('Activity log card ID is required.');
				throw new Error('Missing activity log card ID');
			}
			const cardId = parseInt(cardIdInput);
			if (!Number.isFinite(cardId) || cardId <= 0) {
				alert('Activity log card ID must be a positive integer.');
				throw new Error('Invalid activity log card ID');
			}
			try {
				const response = await fetch(
					`${location.origin}/api/content/v1/cards?urns=${cardId}&parts=datasources`,
					{ method: 'GET' }
				);
				if (response.ok) {
					const data = await response.json();
					if (data && data.length > 0) {
						const ds = data[0].datasources && data[0].datasources[0];
						if (ds && ds.providerType === 'domostats') {
							cfg = {
								cardId,
								objectIdColumn: 'Object_ID',
								objectTypeColumn: 'Object_Type'
							};
							setActivityLogConfig(cfg, storageKey, subdomain);
							return cfg;
						}
					}
				}
				// If non-OK, fall through to prompt path without throwing
			} catch (e) {
				// Network or fetch error: continue to prompt path
			}

			const objectIdColumn = prompt(
				'Next, enter the object ID column name, as it appears in the DataSet powering your activity log card:',
				(cfg && cfg.objectIdColumn) || 'Object_ID'
			);
			if (!objectIdColumn) {
				alert('Object ID column name is required.');
				throw new Error('Missing object ID column name');
			}

			const objectTypeColumn = prompt(
				'Last, enter the object type column name, as it appears in the DataSet powering your activity log card. Make sure it matches DomoStats formatting (e.g., DATA_SOURCE, DRILL_VIEW, etc.):',
				(cfg && cfg.objectTypeColumn) || 'Object_Type'
			);
			if (!objectTypeColumn) {
				alert('Object type column name is required.');
				throw new Error('Missing object type column name');
			}

			cfg = { cardId, objectIdColumn, objectTypeColumn };
			setActivityLogConfig(cfg, storageKey, subdomain);
		}

		return cfg;
	}

	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}

	// Show loading indicator
	const loadingModal = document.createElement('div');
	loadingModal.setAttribute(
		'style',
		'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
	);
	const loadingContent = document.createElement('div');
	loadingContent.setAttribute(
		'style',
		'background:white;padding:32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);display:flex;flex-direction:column;align-items:center;gap:16px;'
	);
	loadingContent.innerHTML = `
		<div style="width:32px;height:32px;border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div>
		<div style="font-family:sans-serif;color:#666;">Loading activity log...</div>
		<style>
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
		</style>
	`;
	loadingModal.appendChild(loadingContent);
	document.body.appendChild(loadingModal);

	const removeLoading = () => {
		if (loadingModal && loadingModal.parentNode) {
			loadingModal.remove();
		}
	};

	function openActivityLog(
		activityLogCardId,
		objectTypeOrTypes,
		objectIds,
		objectIdColumn,
		objectTypeColumn
	) {
		// Handle both single objectType (string) and multiple objectTypes (array)
		const objectTypes = Array.isArray(objectTypeOrTypes)
			? [...new Set(objectTypeOrTypes)] // Deduplicate if array
			: [objectTypeOrTypes];

		const pfilters = [
			{
				column: objectTypeColumn,
				operand: 'IN',
				values: objectTypes
			},
			{
				column: objectIdColumn,
				operand: 'IN',
				values: objectIds
			}
		];

		Object.assign(document.createElement('a'), {
			target: '_blank',
			rel: 'noopener noreferrer',
			href: `https://${
				location.hostname
			}/kpis/details/${activityLogCardId}?pfilters=${JSON.stringify(pfilters)}`
		}).click();
		removeLoading();
	}

	async function getPageIdsFromUrl(url) {
		const parts = url.split(/[/?=&]/);

		switch (true) {
			case url.includes('page/'):
			case url.includes('pages/'): {
				const pageType = url.includes('app-studio') ? 'DATA_APP_VIEW' : 'PAGE';
				const appId = parseInt(
					pageType === 'DATA_APP_VIEW'
						? parts[parts.indexOf('app-studio') + 1]
						: null
				);
				const pageId = parseInt(
					pageType === 'DATA_APP_VIEW'
						? parts[parts.indexOf('pages') + 1]
						: parts[parts.indexOf('page') + 1]
				);

				let body = {
					orderBy: 'lastModified',
					ascending: true
				};
				if (pageType === 'DATA_APP_VIEW') {
					body.includeDataAppIdsClause = true;
					body.includeDataAppViews = true;
					body.dataAppIds = [appId];
				} else {
					body.includeParentPageIdsClause = true;
					body.parentPageIds = [pageId];
				}

				const response = await fetch(
					`${location.origin}/api/content/v1/pages/adminsummary?limit=100&skip=0`,
					{
						method: 'POST',
						body: JSON.stringify(body),
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json'
						}
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch page ${pageId}.\nHTTP status: ${response.status}`
					);
				}

				const adminSummaryResponse = await response.json();
				const pages = adminSummaryResponse.pageAdminSummaries || [];

				if (!pages.length) {
					throw new Error(
						pageType === 'DATA_APP_VIEW'
							? `No views (pages) found for app studio app ${appId}.`
							: `No child pages found for page ${pageId}.`
					);
				}

				return {
					pageIds: pages.map((p) => String(p.pageId)).filter(Boolean),
					objectType: pageType === 'DATA_APP_VIEW' ? 'DATA_APP_VIEW' : 'PAGE'
				};
			}

			case url.includes('datasources/'): {
				const datasetId = parts[parts.indexOf('datasources') + 1];
				const cardsResponse = await fetch(
					`${location.origin}/api/content/v1/datasources/${datasetId}/cards`,
					{ method: 'GET' }
				);

				if (!cardsResponse.ok) {
					throw new Error(
						`Failed to fetch dataset ${datasetId}.\nHTTP status: ${cardsResponse.status}`
					);
				}

				const cards = await cardsResponse.json();

				if (!cards.length) {
					throw new Error(`DataSet ${datasetId} has no cards.`);
				}

				const cardIds = cards.map(
					(card) =>
						card.id ||
						card.kpiId ||
						(typeof card.urn === 'string' ? card.urn.split(':').pop() : '')
				);

				// Fetch cards with adminAllPages to get all pages they appear on (including app studio and report builder)
				const detailResponse = await fetch(
					`${location.origin}/api/content/v1/cards?urns=${cardIds.join(
						','
					)}&parts=adminAllPages`,
					{ method: 'GET' }
				);

				if (!detailResponse.ok) {
					throw new Error(
						`Failed to fetch cards for dataset ${datasetId}.\nHTTP status: ${detailResponse.status}`
					);
				}

				const detailCards = await detailResponse.json();

				if (!detailCards.length) {
					throw new Error(`DataSet ${datasetId} has no cards.`);
				}

				// Build flat lists of all pages, app pages, and report pages from all cards
				const allPageIds = [];
				const allAppPageIds = [];
				const allReportPageIds = [];

				detailCards.forEach((card) => {
					// Regular pages
					if (Array.isArray(card.adminAllPages)) {
						allPageIds.push(
							...card.adminAllPages
								.map((p) => {
									const pid = (p && (p.pageId ?? p.pageID)) || null;
									if (!pid) return null;
									return String(pid);
								})
								.filter(Boolean)
						);
					}
					// App studio pages
					if (Array.isArray(card.adminAllAppPages)) {
						allAppPageIds.push(
							...card.adminAllAppPages
								.map((p) => {
									const appPageId = p && p.appPageId;
									if (!appPageId) return null;
									return String(appPageId);
								})
								.filter(Boolean)
						);
					}
					// Report builder pages
					if (Array.isArray(card.adminAllReportPages)) {
						allReportPageIds.push(
							...card.adminAllReportPages
								.map((p) => {
									const reportPageId = p && p.reportPageId;
									if (!reportPageId) return null;
									return String(reportPageId);
								})
								.filter(Boolean)
						);
					}
				});

				// Deduplicate page IDs for each type
				const uniquePageIds = [...new Set(allPageIds)];
				const uniqueAppPageIds = [...new Set(allAppPageIds)];
				const uniqueReportPageIds = [...new Set(allReportPageIds)];

				// Combine all page IDs and object types
				const allIds = [];
				const allTypes = [];

				if (uniquePageIds.length) {
					allIds.push(...uniquePageIds);
					allTypes.push(...Array(uniquePageIds.length).fill('PAGE'));
				}
				if (uniqueAppPageIds.length) {
					allIds.push(...uniqueAppPageIds);
					allTypes.push(
						...Array(uniqueAppPageIds.length).fill('DATA_APP_VIEW')
					);
				}
				if (uniqueReportPageIds.length) {
					allIds.push(...uniqueReportPageIds);
					allTypes.push(
						...Array(uniqueReportPageIds.length).fill('REPORT_BUILDER_PAGE')
					);
				}

				if (!allIds.length) {
					throw new Error(
						`Cards on DataSet ${datasetId} are not used on any pages.`
					);
				}

				return {
					pageIds: allIds,
					objectTypes: allTypes
				};
			}

			case url.includes('app-studio/'): {
				const appId = parts[parts.indexOf('app-studio') + 1];

				const body = {
					orderBy: 'lastModified',
					ascending: true,
					includeDataAppIdsClause: true,
					includeDataAppViews: true,
					dataAppIds: [parseInt(appId)]
				};

				const response = await fetch(
					`${location.origin}/api/content/v1/pages/adminsummary?limit=100&skip=0`,
					{
						method: 'POST',
						body: JSON.stringify(body),
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json'
						}
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch app studio app ${appId}.\nHTTP status: ${response.status}`
					);
				}

				const adminSummaryResponse = await response.json();
				const pages = adminSummaryResponse.pageAdminSummaries || [];

				if (!pages.length) {
					throw new Error(`No pages found for app studio app ${appId}.`);
				}

				return {
					pageIds: pages.map((p) => String(p.pageId)).filter(Boolean),
					objectType: 'DATA_APP_VIEW'
				};
			}

			default:
				throw new Error(
					'This bookmarklet can only be used on page, app studio, or dataset URLs.'
				);
		}
	}

	(async () => {
		try {
			const {
				cardId: activityLogCardId,
				objectIdColumn: activityLogObjectIdColumnName,
				objectTypeColumn: activityLogObjectTypeColumnName
			} = await getActivityLogConfig();

			const result = await getPageIdsFromUrl(location.href);
			const pageIds = result.pageIds;
			const objectTypeOrTypes = result.objectTypes || result.objectType;

			openActivityLog(
				activityLogCardId,
				objectTypeOrTypes,
				pageIds,
				activityLogObjectIdColumnName,
				activityLogObjectTypeColumnName
			);
		} catch (err) {
			removeLoading();
			console.error('Bookmarklet error:', err);
			alert(err.message);
		}
	})();
})();
