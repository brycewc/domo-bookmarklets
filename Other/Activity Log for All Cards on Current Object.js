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

	async function getCardIdsFromUrl(url) {
		const parts = url.split(/[/?=&]/);

		switch (true) {
			case url.includes('page/'):
			case url.includes('pages/'): {
				const pageId = url.includes('app-studio')
					? parts[parts.indexOf('pages') + 1]
					: parts[parts.indexOf('page') + 1];
				const response = await fetch(
					`${location.origin}/api/content/v3/stacks/${pageId}/cards`,
					{ method: 'GET' }
				);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch cards for Page ${pageId}.\nHTTP status: ${response.status}`
					);
				}
				const page = await response.json();
				const cards = page.cards || [];
				if (!cards.length) {
					throw new Error(`Page ${pageId} has no cards.`);
				}
				return cards.map((c) => c.id).filter((id) => Number.isFinite(id));
			}

			case url.includes('datasources/'): {
				const datasetId = parts[parts.indexOf('datasources') + 1];
				const response = await fetch(
					`${location.origin}/api/content/v1/datasources/${datasetId}/cards`,
					{ method: 'GET' }
				);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch cards for DataSet ${datasetId}.\nHTTP status: ${response.status}`
					);
				}
				const cards = await response.json();
				if (!cards.length) {
					throw new Error(`DataSet ${datasetId} has no cards.`);
				}
				return cards
					.map(
						(card) =>
							card.id ||
							card.kpiId ||
							(typeof card.urn === 'string' ? card.urn.split(':').pop() : '')
					)
					.filter(Boolean);
			}

			default:
				throw new Error(
					'This bookmarklet can only be used on a Page or DataSet URL.'
				);
		}
	}

	function openActivityLog(
		activityLogCardId,
		objectType,
		objectIds,
		objectIdColumn,
		objectTypeColumn
	) {
		const pfilters = [
			{
				column: objectTypeColumn,
				operand: 'IN',
				values: [objectType]
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
	}

	(async () => {
		try {
			const {
				cardId: activityLogCardId,
				objectIdColumn: activityLogObjectIdColumnName,
				objectTypeColumn: activityLogObjectTypeColumnName
			} = await getActivityLogConfig();

			const cardIds = await getCardIdsFromUrl(location.href);

			openActivityLog(
				activityLogCardId,
				'CARD',
				cardIds,
				activityLogObjectIdColumnName,
				activityLogObjectTypeColumnName
			);
		} catch (err) {
			console.error('Bookmarklet error:', err);
			alert(err.message);
		}
	})();
})();
