javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('page/') || url.includes('pages/')) {
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

		// Fetch all cards on the page
		fetch(
			`${location.origin}/api/content/v3/stacks/${pageId}/cards?parts=datasources`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (!response.ok) {
					alert(
						`Failed to fetch Page ${pageId}.\nHTTP status: ${response.status}`
					);
					return;
				}

				const page = await response.json();
				const cards = page.cards;
				if (!cards || cards.length === 0) {
					alert(`Page ${pageId} does not contain any cards.`);
					return;
				}

				// Show modal to get new dataset ID
				showInputModal(pageId, page.page.title, cards, pageType, appId);
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

	function showInputModal(pageId, pageTitle, cards, pageType, appId) {
		const modal = document.createElement('div');
		modal.setAttribute(
			'style',
			'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
		);

		const modalContent = document.createElement('div');
		modalContent.setAttribute(
			'style',
			'background:white;padding:24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:400px;max-width:90vw;position:relative;'
		);

		const closeBtn = document.createElement('button');
		closeBtn.innerHTML = '&times;';
		closeBtn.setAttribute(
			'style',
			'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;'
		);
		closeBtn.onclick = () => modal.remove();

		const pageUrl =
			pageType === 'DATA_APP_VIEW'
				? `${location.origin}/app-studio/${appId}/pages/${pageId}`
				: `${location.origin}/page/${pageId}`;

		modalContent.innerHTML = `
			<div style="font-family:sans-serif;">
				<h3 style="margin:0 0 16px 0;padding-right:40px;">Switch All Cards to New DataSet</h3>
				<p style="margin:0 0 16px 0;color:#666;">
					<a href="${pageUrl}" target="_blank" style="text-decoration:underline;">Page ${pageTitle}</a> (${
			cards.length
		} card${cards.length === 1 ? '' : 's'})
				</p>
				<label style="display:block;margin-bottom:8px;font-weight:500;">New DataSet ID:</label>
				<input type="text" id="newDatasetId" placeholder="Enter DataSet ID" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;box-sizing:border-box;" />
				<div style="margin-top:20px;text-align:right;">
					<button id="cancelBtn" style="padding:8px 16px;margin-right:8px;background:#f5f5f5;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:14px;">Cancel</button>
					<button id="validateBtn" style="padding:8px 16px;background:#1a73e8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">Validate</button>
				</div>
			</div>
		`;

		modalContent.appendChild(closeBtn);
		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		const input = modalContent.querySelector('#newDatasetId');
		const cancelBtn = modalContent.querySelector('#cancelBtn');
		const validateBtn = modalContent.querySelector('#validateBtn');

		cancelBtn.onclick = () => modal.remove();
		validateBtn.onclick = () => {
			const newDatasetId = input.value.trim();
			if (!newDatasetId) {
				alert('Please enter a DataSet ID.');
				return;
			}
			modal.remove();
			validateCards(pageId, pageTitle, cards, newDatasetId, pageType, appId);
		};

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				validateBtn.click();
			}
		});

		input.focus();
	}

	async function validateCards(
		pageId,
		pageTitle,
		cards,
		newDatasetId,
		pageType,
		appId
	) {
		// Show loading modal
		const loadingModal = showLoadingModal('Validating cards...');

		const validationResults = [];

		for (const card of cards) {
			const cardId =
				card.id ??
				card.kpiId ??
				(typeof card.urn === 'string' ? card.urn.split(':').pop() : undefined);
			const cardTitle =
				card.title ?? card.name ?? (cardId ? `Card ${cardId}` : 'Card');

			// Get current dataset(s) for this card
			const currentDatasets = card.datasources || [];
			const currentDatasetId =
				currentDatasets.length > 0
					? currentDatasets[0].dataSourceId ??
					  currentDatasets[0].datasourceId ??
					  currentDatasets[0].id ??
					  currentDatasets[0].dataSetId
					: null;

			try {
				const response = await fetch(
					`${location.origin}/api/content/v1/cards/kpi/${cardId}/comparemove/${newDatasetId}`,
					{
						method: 'GET'
					}
				);

				if (response.ok) {
					const result = await response.json();
					validationResults.push({
						cardId,
						cardTitle,
						currentDatasetId,
						valid: result.equivalent === true,
						error: null
					});
				} else {
					validationResults.push({
						cardId,
						cardTitle,
						currentDatasetId,
						valid: false,
						error: `HTTP ${response.status}`
					});
				}
			} catch (error) {
				validationResults.push({
					cardId,
					cardTitle,
					currentDatasetId,
					valid: false,
					error: error.message
				});
			}
		}

		loadingModal.remove();
		showValidationResults(
			pageId,
			pageTitle,
			validationResults,
			newDatasetId,
			pageType,
			appId
		);
	}

	function showValidationResults(
		pageId,
		pageTitle,
		validationResults,
		newDatasetId,
		pageType,
		appId
	) {
		const nonEquivalentCards = validationResults.filter((r) => !r.valid);
		const equivalentCards = validationResults.filter((r) => r.valid);

		const modal = document.createElement('div');
		modal.setAttribute(
			'style',
			'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
		);

		const modalContent = document.createElement('div');
		modalContent.setAttribute(
			'style',
			'background:white;padding:24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:500px;max-width:90vw;max-height:90vh;overflow:auto;position:relative;'
		);

		const closeBtn = document.createElement('button');
		closeBtn.innerHTML = '&times;';
		closeBtn.setAttribute(
			'style',
			'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;'
		);
		closeBtn.onclick = () => modal.remove();

		const pageUrl =
			pageType === 'DATA_APP_VIEW'
				? `${location.origin}/app-studio/${appId}/pages/${pageId}`
				: `${location.origin}/page/${pageId}`;

		let warningBanner = '';
		if (nonEquivalentCards.length > 0) {
			warningBanner = `
				<div style="margin:16px 0;padding:16px;background:#fff3cd;border:2px solid #ffc107;border-radius:4px;">
					<div style="display:flex;align-items:flex-start;gap:12px;">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
						<div>
							<h4 style="margin:0 0 8px 0;color:#856404;font-size:16px;">⚠️ Warning: Non-Equivalent DataSets Detected</h4>
							<p style="margin:0 0 8px 0;font-size:13px;color:#856404;line-height:1.5;"><strong>${
								nonEquivalentCards.length
							} card${
				nonEquivalentCards.length === 1 ? '' : 's'
			}</strong> may not be fully compatible with the new DataSet. Switching these cards may result in:</p>
							<ul style="margin:0 0 8px 0;padding-left:20px;font-size:13px;color:#856404;line-height:1.5;">
								<li>Missing columns or fields</li>
								<li>Broken visualizations or charts</li>
								<li>Card errors requiring manual fixes</li>
                <li>Unexpected behavior in filters or interactions</li>
                <li>Missing or broken Beast Modes</li>
							</ul>
							<p style="margin:0;font-size:13px;color:#856404;font-weight:500;">Proceed with caution and verify cards after switching.</p>
						</div>
					</div>
				</div>
			`;
		}

		let nonEquivalentCardsHtml = '';
		if (nonEquivalentCards.length > 0) {
			nonEquivalentCardsHtml = `
				<div style="margin:16px 0;padding:12px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;">
					<h4 style="margin:0 0 8px 0;color:#856404;">⚠️ Non-Equivalent Cards (${
						nonEquivalentCards.length
					})</h4>
					<p style="margin:0 0 8px 0;font-size:13px;color:#856404;">These cards are not schema-equivalent with DataSet ${newDatasetId} and may break:</p>
					<ul style="margin:0;padding-left:20px;">
						${nonEquivalentCards
							.map((card) => {
								const cardUrl =
									pageType === 'DATA_APP_VIEW'
										? `${location.origin}/app-studio/${appId}/pages/${pageId}/kpis/details/${card.cardId}`
										: `${location.origin}/page/${pageId}/kpis/details/${card.cardId}`;
								return `<li style="margin:4px 0;font-size:13px;"><a href="${cardUrl}" target="_blank" style="text-decoration:underline;color:#856404;">${
									card.cardTitle
								}</a>${card.error ? ` (${card.error})` : ''}</li>`;
							})
							.join('')}
					</ul>
				</div>
			`;
		}

		let equivalentCardsHtml = '';
		if (equivalentCards.length > 0) {
			equivalentCardsHtml = `
				<div style="margin:16px 0;padding:12px;background:#d4edda;border:1px solid #28a745;border-radius:4px;">
					<h4 style="margin:0 0 8px 0;color:#155724;">✓ Equivalent Cards (${equivalentCards.length})</h4>
					<p style="margin:0;font-size:13px;color:#155724;">These cards are schema-equivalent and should switch safely to DataSet ${newDatasetId}.</p>
				</div>
			`;
		}

		const proceedStyle =
			'padding:8px 16px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
		const totalCards = validationResults.length;

		modalContent.innerHTML = `
			<div style="font-family:sans-serif;">
				<h3 style="margin:0 0 8px 0;padding-right:40px;">Validation Results</h3>
				<p style="margin:0 0 16px 0;color:#666;font-size:14px;">
					<a href="${pageUrl}" target="_blank" style="text-decoration:underline;">Page ${pageTitle}</a> | New DataSet: <a href="${
			location.origin
		}/datasources/${newDatasetId}/details/overview" target="_blank" style="text-decoration:underline;">${newDatasetId}</a>
				</p>
				${warningBanner}
				${nonEquivalentCardsHtml}
				${equivalentCardsHtml}
				<div style="margin-top:20px;text-align:right;">
					<button id="cancelBtn" style="padding:8px 16px;margin-right:8px;background:#f5f5f5;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:14px;">Cancel</button>
					<button id="proceedBtn" style="${proceedStyle}">Proceed with All ${totalCards} Card${
			totalCards === 1 ? '' : 's'
		}</button>
				</div>
			</div>
		`;

		modalContent.appendChild(closeBtn);
		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		const cancelBtn = modalContent.querySelector('#cancelBtn');
		const proceedBtn = modalContent.querySelector('#proceedBtn');

		cancelBtn.onclick = () => modal.remove();
		proceedBtn.onclick = () => {
			modal.remove();
			updateCards(
				pageId,
				pageTitle,
				validationResults,
				newDatasetId,
				pageType,
				appId
			);
		};
	}

	async function updateCards(
		pageId,
		pageTitle,
		validationResults,
		newDatasetId,
		pageType,
		appId
	) {
		const loadingModal = showLoadingModal(
			`Updating ${validationResults.length} card${
				validationResults.length === 1 ? '' : 's'
			}...`
		);

		const updateResults = [];

		for (const card of validationResults) {
			try {
				const response = await fetch(
					`${location.origin}/api/content/v1/cards/${card.cardId}/datasource/${newDatasetId}?currentDsId=${card.currentDatasetId}`,
					{
						method: 'PUT'
					}
				);

				updateResults.push({
					cardId: card.cardId,
					cardTitle: card.cardTitle,
					success: response.ok,
					status: response.status
				});
			} catch (error) {
				updateResults.push({
					cardId: card.cardId,
					cardTitle: card.cardTitle,
					success: false,
					status: 'Error',
					error: error.message
				});
			}
		}

		loadingModal.remove();
		showUpdateResults(
			pageId,
			pageTitle,
			updateResults,
			newDatasetId,
			pageType,
			appId
		);
	}

	function showUpdateResults(
		pageId,
		pageTitle,
		updateResults,
		newDatasetId,
		pageType,
		appId
	) {
		const successResults = updateResults.filter((r) => r.success);
		const failureResults = updateResults.filter((r) => !r.success);

		const modal = document.createElement('div');
		modal.setAttribute(
			'style',
			'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
		);

		const modalContent = document.createElement('div');
		modalContent.setAttribute(
			'style',
			'background:white;padding:24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:500px;max-width:90vw;max-height:90vh;overflow:auto;position:relative;'
		);

		const closeBtn = document.createElement('button');
		closeBtn.innerHTML = '&times;';
		closeBtn.setAttribute(
			'style',
			'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;'
		);
		closeBtn.onclick = () => modal.remove();

		const pageUrl =
			pageType === 'DATA_APP_VIEW'
				? `${location.origin}/app-studio/${appId}/pages/${pageId}`
				: `${location.origin}/page/${pageId}`;

		let successHtml = '';
		if (successResults.length > 0) {
			successHtml = `
				<div style="margin:16px 0;padding:12px;background:#d4edda;border:1px solid #28a745;border-radius:4px;">
					<h4 style="margin:0 0 8px 0;color:#155724;">Successfully Updated (${
						successResults.length
					})</h4>
					<ul style="margin:0;padding-left:20px;">
						${successResults
							.map((result) => {
								const cardUrl =
									pageType === 'DATA_APP_VIEW'
										? `${location.origin}/app-studio/${appId}/pages/${pageId}/kpis/details/${result.cardId}`
										: `${location.origin}/page/${pageId}/kpis/details/${result.cardId}`;
								return `<li style="margin:4px 0;font-size:13px;"><a href="${cardUrl}" target="_blank" style="text-decoration:underline;color:#155724;">${result.cardTitle}</a></li>`;
							})
							.join('')}
					</ul>
				</div>
			`;
		}

		let failureHtml = '';
		if (failureResults.length > 0) {
			failureHtml = `
				<div style="margin:16px 0;padding:12px;background:#f8d7da;border:1px solid #dc3545;border-radius:4px;">
					<h4 style="margin:0 0 8px 0;color:#721c24;">Failed to Update (${
						failureResults.length
					})</h4>
					<ul style="margin:0;padding-left:20px;">
						${failureResults
							.map((result) => {
								const cardUrl =
									pageType === 'DATA_APP_VIEW'
										? `${location.origin}/app-studio/${appId}/pages/${pageId}/kpis/details/${result.cardId}`
										: `${location.origin}/page/${pageId}/kpis/details/${result.cardId}`;
								const errorMsg = result.error
									? ` - ${result.error}`
									: ` (HTTP ${result.status})`;
								return `<li style="margin:4px 0;font-size:13px;"><a href="${cardUrl}" target="_blank" style="text-decoration:underline;color:#721c24;">${result.cardTitle}</a>${errorMsg}</li>`;
							})
							.join('')}
					</ul>
				</div>
			`;
		}

		modalContent.innerHTML = `
			<div style="font-family:sans-serif;">
				<h3 style="margin:0 0 8px 0;padding-right:40px;">Update Complete</h3>
				<p style="margin:0 0 16px 0;color:#666;font-size:14px;">
					<a href="${pageUrl}" target="_blank" style="text-decoration:underline;">Page ${pageTitle}</a> | New DataSet: <a href="${location.origin}/datasources/${newDatasetId}/details/overview" target="_blank" style="text-decoration:underline;">${newDatasetId}</a>
				</p>
				${successHtml}
				${failureHtml}
				<div style="margin-top:20px;text-align:right;">
					<button id="closeBtn" style="padding:8px 16px;background:#1a73e8;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">Close</button>
				</div>
			</div>
		`;

		modalContent.appendChild(closeBtn);
		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		const closeBtnBottom = modalContent.querySelector('#closeBtn');
		closeBtnBottom.onclick = () => {
			modal.remove();
			location.reload();
		};
		closeBtn.onclick = () => {
			modal.remove();
			location.reload();
		};
	}

	function showLoadingModal(message) {
		const modal = document.createElement('div');
		modal.setAttribute(
			'style',
			'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
		);

		const modalContent = document.createElement('div');
		modalContent.setAttribute(
			'style',
			'background:white;padding:32px 48px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);text-align:center;'
		);

		modalContent.innerHTML = `
			<div style="font-family:sans-serif;">
				<div style="margin-bottom:16px;">
					<div style="border:4px solid #f3f3f3;border-top:4px solid #1a73e8;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto;"></div>
					<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
				</div>
				<p style="margin:0;font-size:16px;color:#333;">${message}</p>
			</div>
		`;

		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		return modal;
	}
})();
