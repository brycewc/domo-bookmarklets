javascript: (() => {
	// If you add a matches quick filter for a string column to a card in Domo, it defaults to filtering on an empty string. But this causes null values to be excluded, which is often not the desired behavior. This bookmarklet updates the card to remove any empty string values applied from the quick filters, so that null values are included again.

	// Ensure we are on a domo domain
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}

	const url = location.href;

	// --- Helper: attempt to pull a card ID from an open details modal ---
	function getModalCardId() {
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
			// fall back to other strategies
		}
		return null;
	}

	// --- Helper: parse card ID from URL segments ---
	function getUrlCardId() {
		const parts = url.split(/[/?&#=]/).filter(Boolean);
		const idxDetails = parts.indexOf('details');
		if (idxDetails !== -1 && parts[idxDetails + 1]) {
			return parts[idxDetails + 1];
		}

		// Query string
		try {
			const u = new URL(url);
			if (u.searchParams.get('kpiId')) return u.searchParams.get('kpiId');
			if (u.searchParams.get('kpi')) return u.searchParams.get('kpi');
			if (u.searchParams.get('cardId')) return u.searchParams.get('cardId');
		} catch (_) {}
		return null;
	}

	// --- Helper: attempt to discover card ID from DOM data attributes (future-proofing) ---
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
	const cardId = getModalCardId() || getUrlCardId() || getDomDataCardId();

	if (!cardId) {
		alert(
			'Unable to determine card ID.\nOpen a card (details view or modal) and then run the bookmarklet again.'
		);
		throw new Error('Unable to determine card ID.');
	}

	// First, get the dataset ID
	fetch(`${location.origin}/api/content/v1/cards/${cardId}/details`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	})
		.then(async (response) => {
			if (!response.ok) {
				alert(
					`Failed to fetch card details for ${cardId}.\nHTTP status: ${response.status}`
				);
				throw new Error(`Failed to fetch card details: ${response.status}`);
			}
			const cardDetails = await response.json();

			// Get the dataset ID from the first property in columns.cardTargets
			const cardTargets = cardDetails?.columns?.cardTargets;
			if (!cardTargets || typeof cardTargets !== 'object') {
				alert('Unable to find dataset ID in card details.');
				throw new Error('Unable to find dataset ID in card details.');
			}

			const datasetId = Object.keys(cardTargets)[0];
			if (!datasetId) {
				alert('No dataset ID found in card targets.');
				throw new Error('No dataset ID found in card targets.');
			}

			// Now fetch the card definition
			return fetch(`${location.origin}/api/content/v3/cards/kpi/definition`, {
				method: 'PUT',
				body: JSON.stringify({
					dynamicText: true,
					variables: true,
					urn: cardId
				}),
				headers: { 'Content-Type': 'application/json' }
			}).then(async (response) => {
				if (!response.ok) {
					alert(
						`Failed to fetch card ${cardId}.\nHTTP status: ${response.status}`
					);
					return;
				}
				let card = await response.json();
				if (!card) {
					alert(`Card ${cardId} not found.`);
					throw new Error(`Card ${cardId} not found.`);
				}

				// Return both card and datasetId for further processing
				return { card, datasetId };
			});
		})
		.then(async (result) => {
			if (!result) return;

			const { card, datasetId } = result;

			delete card.id;
			delete card.urn;
			delete card.columns;
			delete card.drillpath;
			delete card.embedded;
			delete card.dataSourceWrite;

			card.dataProvider = {
				dataSourceId: datasetId
			};
			card.variables = true;

			card.definition.formulas = {
				dsUpdated: [],
				dsDeleted: [],
				card: []
			};
			card.definition.annotations = {
				new: [],
				modified: [],
				deleted: []
			};

			// Transform conditionalFormats from array to object with card and datasource arrays
			if (Array.isArray(card.definition.conditionalFormats)) {
				const cardFormats = [];
				const datasourceFormats = [];

				card.definition.conditionalFormats.forEach((format) => {
					if (format.dataSourceId) {
						datasourceFormats.push(format);
					} else {
						cardFormats.push(format);
					}
				});

				card.definition.conditionalFormats = {
					card: cardFormats,
					datasource: datasourceFormats
				};
			}

			// Remove empty string filters from controls
			if (Array.isArray(card.definition.controls)) {
				card.definition.controls.forEach((control) => {
					if (
						Array.isArray(control.values) &&
						control.values.length === 1 &&
						control.values[0] === ''
					) {
						control.values = [];
					}
				});
			}

			// Update the card with the modifications
			return fetch(`${location.origin}/api/content/v3/cards/kpi/${cardId}`, {
				method: 'PUT',
				body: JSON.stringify(card),
				headers: { 'Content-Type': 'application/json' }
			});
		})
		.then(async (response) => {
			if (!response) return;

			if (response.ok) {
				alert(
					`Card ${cardId} updated successfully! Empty strings removed from filters so they don't exclude null values.`
				);
			} else {
				alert(
					`Failed to update card ${cardId}.\nHTTP status: ${response.status}`
				);
				console.error(error);
			}
		})
		.catch((error) => {
			alert(`Failed to fetch card ${cardId}.\nError: ${error.message}`);
			console.error(error);
		});
})();
