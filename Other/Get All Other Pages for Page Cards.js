javascript: (() => {
	// Ensure we are on a domo domain
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
		const pageId = parseInt(
			pageType === 'DATA_APP_VIEW'
				? parts[parts.indexOf('pages') + 1]
				: parts[parts.indexOf('page') + 1]
		);

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
			<div style="font-family:sans-serif;color:#666;">Loading page cards...</div>
			<style>
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			</style>
		`;
		loadingModal.appendChild(loadingContent);
		document.body.appendChild(loadingModal);

		// Create AbortController to cancel requests if user navigates away
		const abortController = new AbortController();
		const initialUrl = location.href;

		// Helper function to remove loading indicator and cleanup
		var removeLoading = () => {
			if (loadingModal && loadingModal.parentNode) {
				loadingModal.remove();
			}
			// Remove navigation listeners
			window.removeEventListener('popstate', handleNavigation);
			window.removeEventListener('hashchange', handleNavigation);
		};

		// Handle navigation away from page
		const handleNavigation = () => {
			if (location.href !== initialUrl) {
				abortController.abort();
				removeLoading();
			}
		};

		// Add navigation listeners
		window.addEventListener('popstate', handleNavigation);
		window.addEventListener('hashchange', handleNavigation);

		// Also check for URL changes periodically (for SPA navigation)
		var urlWatcher = setInterval(() => {
			if (location.href !== initialUrl) {
				clearInterval(urlWatcher);
				handleNavigation();
			}
		}, 250);

		// Clean up URL watcher when loading completes
		const originalRemoveLoading = removeLoading;
		const removeLoadingWithCleanup = () => {
			clearInterval(urlWatcher);
			originalRemoveLoading();
		};
		// Replace removeLoading references with the cleanup version
		removeLoading = removeLoadingWithCleanup;

		// Build the request (adminAllPages includes pages, app studio pages, and report builder pages)
		fetch(
			`${location.origin}/api/content/v3/stacks/${pageId}/cards?parts=adminAllPages`,
			{
				method: 'GET',
				signal: abortController.signal
			}
		)
			.then(async (response) => {
				if (!response.ok) {
					removeLoading();
					alert(
						`Failed to fetch Page ${pageId}.\nHTTP status: ${response.status}`
					);
					return;
				}
				const page = await response.json();
				const cards = page.cards || [];

				if (!cards.length) {
					removeLoading();
					alert(`Page ${pageId} has no cards.`);
					return;
				}

				// Build a flat list of all pages, app pages, and report builder pages from all cards
				const allPages = [];
				const allAppPages = [];
				const allReports = [];

				cards.forEach((card) => {
					if (card.adminAllPages) {
						allPages.push(
							...card.adminAllPages.filter((p) => p.pageId !== pageId)
						);
					}
					if (card.adminAllAppPages) {
						allAppPages.push(
							...card.adminAllAppPages.filter((p) => !(p.appPageId === pageId))
						);
					}
					if (card.adminAllReportPages) {
						allReports.push(
							...card.adminAllReportPages.map((p) => ({
								reportId: String(p.reportId),
								reportPageId: String(p.reportPageId),
								reportTitle: p.reportTitle || p.reportName || 'Report',
								reportPageTitle: p.reportPageTitle || p.title || 'Page'
							}))
						);
					}
				});

				// Deduplicate pages by pageId
				const pageMap = new Map();
				allPages.forEach((page) => {
					if (!pageMap.has(page.pageId)) {
						pageMap.set(page.pageId, page);
					}
				});
				const uniquePages = Array.from(pageMap.values());

				// Deduplicate app pages by appId + appPageId
				const appPageMap = new Map();
				allAppPages.forEach((appPage) => {
					const key = `${appPage.appId}:${appPage.appPageId}`;
					if (!appPageMap.has(key)) {
						appPageMap.set(key, appPage);
					}
				});
				const uniqueAppPages = Array.from(appPageMap.values());

				// Deduplicate report pages by reportId + reportPageId
				const reportPageMap = new Map();
				allReports.forEach((rp) => {
					const key = `${rp.reportId}:${rp.reportPageId}`;
					if (!reportPageMap.has(key)) {
						reportPageMap.set(key, rp);
					}
				});
				const uniqueReportPages = Array.from(reportPageMap.values());

				if (
					!uniquePages.length &&
					!uniqueAppPages.length &&
					!uniqueReportPages.length
				) {
					removeLoading();
					alert(
						`Cards on this page are not used on any other pages, app studio pages, or report builder pages.`
					);
					return;
				}

				// Build mapping of pageId -> cards that appear on that page
				const pageToCards = new Map();
				uniquePages.forEach((page) => {
					const cardsOnPage = cards.filter(
						(card) =>
							card.adminAllPages &&
							card.adminAllPages.some((p) => p.pageId === page.pageId)
					);
					if (cardsOnPage.length) {
						pageToCards.set(page.pageId, cardsOnPage);
					}
				});

				// Build mapping of appPageKey -> cards that appear on that app page
				const appPageToCards = new Map();
				uniqueAppPages.forEach((appPage) => {
					const key = `${appPage.appId}:${appPage.appPageId}`;
					const cardsOnAppPage = cards.filter(
						(card) =>
							card.adminAllAppPages &&
							card.adminAllAppPages.some(
								(p) => p.appPageId === appPage.appPageId
							)
					);
					if (cardsOnAppPage.length) {
						appPageToCards.set(key, cardsOnAppPage);
					}
				});

				// Build mapping of reportKey -> cards that appear on that report builder page
				const reportPageToCards = new Map();
				uniqueReportPages.forEach((reportPage) => {
					const key = `${reportPage.reportId}:${reportPage.reportPageId}`;
					const cardsOnReportPage = cards.filter(
						(card) =>
							card.adminAllReportPages &&
							card.adminAllReportPages.some(
								(p) =>
									String(p.reportPageId) === String(reportPage.reportPageId)
							)
					);
					if (cardsOnReportPage.length) {
						reportPageToCards.set(key, cardsOnReportPage);
					}
				});

				// Build HTML for pages section
				const pagesHtml = uniquePages.length
					? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${uniquePages
							.sort((a, b) =>
								String(a.title || '').localeCompare(String(b.title || ''))
							)
							.map((page) => {
								const cardsOnPage = pageToCards.get(page.pageId) || [];
								const count = cardsOnPage.length;
								const countLabel = count === 1 ? '1 card' : `${count} cards`;
								const cardsHtml = count
									? `<div class="page-cards" style="display:none;margin-top:4px;margin-left:0.5em;"><ul style="margin:0.25em 0 0 1em;padding-left:1em;">${cardsOnPage
											.map((card) => {
												const cardId =
													card.id ||
													card.kpiId ||
													(typeof card.urn === 'string'
														? card.urn.split(':').pop()
														: '');
												const cardTitle =
													card.title || card.name || `Card ${cardId}`;
												return { card, cardId, cardTitle };
											})
											.sort((a, b) =>
												String(a.cardTitle || '').localeCompare(
													String(b.cardTitle || '')
												)
											)
											.map(({ card, cardId, cardTitle }) => {
												return `<li style="margin:0.125em 0;list-style:disc;"><a href="${location.origin}/page/${page.pageId}/kpis/details/${cardId}" target="_blank" style="text-decoration:underline;">${cardTitle}</a></li>`;
											})
											.join('')}</ul></div>`
									: '';
								return `<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="${location.origin}/page/${page.pageId}" target="_blank" style="text-decoration:underline;">${page.title}</a><button class="page-count" data-pageid="${page.pageId}" aria-expanded="false" title="Show cards on this page" style="color:#666;font-size:12px;margin-left:8px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;"><svg class="page-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;transform:rotate(0deg);transition:transform 0.15s;"><polyline points="8 4 16 12 8 20"></polyline></svg>(${countLabel})</button><button class="page-open-all" data-pageid="${page.pageId}" title="Open all cards on this page in new tabs" style="display:none;background:none;border:none;cursor:pointer;color:#666;font-size:12px;margin-left:4px;padding:2px 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>${cardsHtml}</li>`;
							})
							.join('')}</ul>`
					: `<div style="color:#888;font-style:italic;margin-bottom:1em;">No other pages</div>`;

				// Build HTML for app pages section
				const appPagesHtml = uniqueAppPages.length
					? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:0;padding-left:1.5em;list-style:disc;">${uniqueAppPages
							.sort((a, b) =>
								String(a.appPageTitle || '').localeCompare(
									String(b.appPageTitle || '')
								)
							)
							.map((appPage) => {
								const key = `${appPage.appId}:${appPage.appPageId}`;
								const cardsOnAppPage = appPageToCards.get(key) || [];
								const count = cardsOnAppPage.length;
								const countLabel = count === 1 ? '1 card' : `${count} cards`;
								const cardsHtml = count
									? `<div class="apppage-cards" style="display:none;margin-top:4px;margin-left:0.5em;"><ul style="margin:0.25em 0 0 1em;padding-left:1em;">${cardsOnAppPage
											.map((card) => {
												const cardId =
													card.id ||
													card.kpiId ||
													(typeof card.urn === 'string'
														? card.urn.split(':').pop()
														: '');
												const cardTitle =
													card.title || card.name || `Card ${cardId}`;
												return { card, cardId, cardTitle };
											})
											.sort((a, b) =>
												String(a.cardTitle || '').localeCompare(
													String(b.cardTitle || '')
												)
											)
											.map(({ card, cardId, cardTitle }) => {
												return `<li style="margin:0.125em 0;list-style:disc;"><a href="${location.origin}/app-studio/${appPage.appId}/pages/${appPage.appPageId}/kpis/details/${cardId}" target="_blank" style="text-decoration:underline;">${cardTitle}</a></li>`;
											})
											.join('')}</ul></div>`
									: '';
								return `<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="${location.origin}/app-studio/${appPage.appId}/pages/${appPage.appPageId}" target="_blank" style="text-decoration:underline;">${appPage.appTitle} &gt; ${appPage.appPageTitle}</a><button class="apppage-count" data-appkey="${key}" aria-expanded="false" title="Show cards on this app page" style="color:#666;font-size:12px;margin-left:8px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;"><svg class="apppage-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;transform:rotate(0deg);transition:transform 0.15s;"><polyline points="8 4 16 12 8 20"></polyline></svg>(${countLabel})</button><button class="apppage-open-all" data-appkey="${key}" title="Open all cards on this app page in new tabs" style="display:none;background:none;border:none;cursor:pointer;color:#666;font-size:12px;margin-left:4px;padding:2px 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>${cardsHtml}</li>`;
							})
							.join('')}</ul>`
					: `<div style="color:#888;font-style:italic;">No other app studio pages</div>`;

				const currentPageTitle = page.page ? page.page.title : `Page ${pageId}`;
				const currentPageUrl =
					pageType === 'DATA_APP_VIEW'
						? `<a href="${location.origin}/app-studio/${appId}/pages/${pageId}" target="_blank">${currentPageTitle}</a>`
						: `<a href="${location.origin}/page/${pageId}" target="_blank">${currentPageTitle}</a>`;

				// Build HTML for report builder pages section (plain text, no links)
				const reportsHtml = uniqueReportPages.length
					? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:0;padding-left:1.5em;list-style:disc;">${uniqueReportPages
							.sort((a, b) =>
								String(a.reportTitle || '').localeCompare(
									String(b.reportTitle || '')
								)
							)
							.map((rp) => {
								const key = `${rp.reportId}:${rp.reportPageId}`;
								const cardsOnReport = reportPageToCards.get(key) || [];
								const count = cardsOnReport.length;
								const countLabel = count === 1 ? '1 card' : `${count} cards`;
								const cardsHtml = count
									? `<div class="reportpage-cards" style="display:none;margin-top:4px;margin-left:0.5em;"><ul style="margin:0.25em 0 0 1em;padding-left:1em;">${cardsOnReport
											.map((card) => {
												const cardId =
													card.id ||
													card.kpiId ||
													(typeof card.urn === 'string'
														? card.urn.split(':').pop()
														: '');
												const cardTitle =
													card.title || card.name || `Card ${cardId}`;
												return { cardId, cardTitle };
											})
											.sort((a, b) =>
												String(a.cardTitle || '').localeCompare(
													String(b.cardTitle || '')
												)
											)
											.map(
												({ cardTitle }) =>
													`<li style="margin:0.125em 0;list-style:disc;">${cardTitle}</li>`
											)
											.join('')}</ul></div>`
									: '';
								const displayTitle = `${rp.reportTitle} &gt; ${rp.reportPageTitle}`;
								return `<li style="margin-bottom:0.25em;list-style:disc;">${displayTitle}<button class="reportpage-count" data-reportkey="${key}" aria-expanded="false" title="Show cards on this report page" style="color:#666;font-size:12px;margin-left:8px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;"><svg class="reportpage-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;transform:rotate(0deg);transition:transform 0.15s;"><polyline points="8 4 16 12 8 20"></polyline></svg>(${countLabel})</button>${cardsHtml}</li>`;
							})
							.join('')}</ul>`
					: `<div style="color:#888;font-style:italic;">No report builder pages</div>`;

				const message = `
		<div style="font-family:sans-serif;">
				<div style="display:flex;align-items:flex-start;justify-content:space-between;">
						<strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:2.5em;">
								Cards from ${currentPageUrl} (ID: ${pageId}) also appear on these other pages:
						</strong>
				</div>
				<h4 style="margin-bottom:0.25em;">Pages</h4>
				${pagesHtml}
				<h4 style="margin-bottom:0.25em;margin-top:1em;">App Studio Pages</h4>
				${appPagesHtml}
				<h4 style="margin-bottom:0.25em;margin-top:1em;">Report Builder Pages</h4>
				${reportsHtml}
		</div>
`;

				// Present results in a dismissible overlay modal
				const modal = document.createElement('div');
				modal.setAttribute(
					'style',
					'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
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

				// Wire up page count toggles and arrow rotation
				const pageButtons = modalContent.querySelectorAll('button.page-count');
				pageButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const list =
							btn.parentElement &&
							btn.parentElement.querySelector('.page-cards');
						if (!list) return;
						const isHidden =
							list.style.display === 'none' || list.style.display === '';
						list.style.display = isHidden ? 'block' : 'none';
						btn.title = isHidden
							? 'Hide cards on this page'
							: 'Show cards on this page';
						btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
						const arrow = btn.querySelector('.page-arrow');
						if (arrow) {
							arrow.style.transform = isHidden
								? 'rotate(90deg)'
								: 'rotate(0deg)';
						}
						// Show/hide the open all button
						const openAllBtn =
							btn.parentElement.querySelector('.page-open-all');
						if (openAllBtn) {
							openAllBtn.style.display = isHidden ? 'inline-block' : 'none';
						}
					});
				});

				// Wire up app page count toggles and arrow rotation
				const appPageButtons = modalContent.querySelectorAll(
					'button.apppage-count'
				);
				appPageButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const list =
							btn.parentElement &&
							btn.parentElement.querySelector('.apppage-cards');
						if (!list) return;
						const isHidden =
							list.style.display === 'none' || list.style.display === '';
						list.style.display = isHidden ? 'block' : 'none';
						btn.title = isHidden
							? 'Hide cards on this app page'
							: 'Show cards on this app page';
						btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
						const arrow = btn.querySelector('.apppage-arrow');
						if (arrow) {
							arrow.style.transform = isHidden
								? 'rotate(90deg)'
								: 'rotate(0deg)';
						}
						// Show/hide the open all button
						const openAllBtn =
							btn.parentElement.querySelector('.apppage-open-all');
						if (openAllBtn) {
							openAllBtn.style.display = isHidden ? 'inline-block' : 'none';
						}
					});
				});

				// Wire up report page count toggles and arrow rotation
				const reportPageButtons = modalContent.querySelectorAll(
					'button.reportpage-count'
				);
				reportPageButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const list =
							btn.parentElement &&
							btn.parentElement.querySelector('.reportpage-cards');
						if (!list) return;
						const isHidden =
							list.style.display === 'none' || list.style.display === '';
						list.style.display = isHidden ? 'block' : 'none';
						btn.title = isHidden
							? 'Hide cards on this report page'
							: 'Show cards on this report page';
						btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
						const arrow = btn.querySelector('.reportpage-arrow');
						if (arrow) {
							arrow.style.transform = isHidden
								? 'rotate(90deg)'
								: 'rotate(0deg)';
						}
					});
				});

				// Wire up "open all cards" buttons for pages
				const pageOpenAllButtons = modalContent.querySelectorAll(
					'button.page-open-all'
				);
				pageOpenAllButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const pageId = btn.getAttribute('data-pageid');
						const cardsOnPage = pageToCards.get(parseInt(pageId)) || [];
						cardsOnPage.forEach((card) => {
							const cardId =
								card.id ||
								card.kpiId ||
								(typeof card.urn === 'string' ? card.urn.split(':').pop() : '');
							if (cardId) {
								window.open(
									`${location.origin}/page/${pageId}/kpis/details/${cardId}`,
									'_blank'
								);
							}
						});
					});
				});

				// Wire up "open all cards" buttons for app pages
				const appPageOpenAllButtons = modalContent.querySelectorAll(
					'button.apppage-open-all'
				);
				appPageOpenAllButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const appKey = btn.getAttribute('data-appkey');
						const cardsOnAppPage = appPageToCards.get(appKey) || [];
						const [appId, appPageId] = appKey.split(':');
						cardsOnAppPage.forEach((card) => {
							const cardId =
								card.id ||
								card.kpiId ||
								(typeof card.urn === 'string' ? card.urn.split(':').pop() : '');
							if (cardId) {
								window.open(
									`${location.origin}/app-studio/${appId}/pages/${appPageId}/kpis/details/${cardId}`,
									'_blank'
								);
							}
						});
					});
				});

				modalContent.appendChild(closeBtn);
				modal.appendChild(modalContent);
				document.body.appendChild(modal);

				// Remove loading indicator now that modal is displayed
				removeLoading();

				const initialUrl = location.href;
				urlWatcher = setInterval(() => {
					if (location.href !== initialUrl) cleanup();
				}, 500);
				window.addEventListener('popstate', cleanup);
				window.addEventListener('hashchange', cleanup);
			})
			.catch((error) => {
				// Don't show error message if request was aborted due to navigation
				if (error.name !== 'AbortError') {
					removeLoading();
					alert(`Failed to fetch Page ${pageId}.\nError: ${error.message}`);
					console.error(error);
				}
				// If AbortError, removeLoading was already called by handleNavigation
			});
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
