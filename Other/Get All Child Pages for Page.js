javascript: (() => {
	// Ensure we are on a domo domain
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}

	const url = window.location.href;
	if (url.includes('page/') || url.includes('pages/')) {
		const parts = url.split(/[/?=&]/);
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
			<div style="font-family:sans-serif;color:#666;">Loading child pages...</div>
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
		const initialUrl = window.location.href;

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
			if (window.location.href !== initialUrl) {
				abortController.abort();
				removeLoading();
			}
		};

		// Add navigation listeners
		window.addEventListener('popstate', handleNavigation);
		window.addEventListener('hashchange', handleNavigation);

		// Also check for URL changes periodically (for SPA navigation)
		var urlWatcher = setInterval(() => {
			if (window.location.href !== initialUrl) {
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

		fetch(
			`https://${window.location.hostname}/api/content/v1/pages/adminsummary?limit=100&skip=0`,
			{
				method: 'POST',
				signal: abortController.signal,
				body: JSON.stringify(body),
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				}
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
				const adminSummaryResponse = await response.json();
				const pages = adminSummaryResponse.pageAdminSummaries || [];

				if (!pages.length) {
					removeLoading();
					alert(
						pageType === 'DATA_APP_VIEW'
							? `No views (pages) found for app studio app ${appId}.`
							: `No child pages found for page ${pageId}.`
					);
					return;
				}

				// Create state management for cards loading
				const pageCardsState = new Map();
				const pageToCards = new Map();

				// Initialize state for each page
				pages.forEach((page) => {
					pageCardsState.set(page.pageId, {
						loading: true,
						cards: [],
						error: false
					});
				});

				// Build initial HTML for pages section (without cards, showing loading state)
				const buildPageHtml = (page) => {
					const pageUrl =
						pageType === 'DATA_APP_VIEW'
							? `https://${window.location.hostname}/app-studio/${appId}/pages/${page.pageId}`
							: `https://${window.location.hostname}/page/${page.pageId}`;

					const state = pageCardsState.get(page.pageId);
					const cardCount = page.cardCount || 0;
					const countLabel = cardCount === 1 ? '1 card' : `${cardCount} cards`;

					return `<li style="margin-bottom:0.25em;list-style:disc;" data-page-id="${page.pageId}">
						<a href="${pageUrl}" target="_blank" style="text-decoration:underline;">${page.pageTitle}</a>
						<button class="page-count" data-pageid="${page.pageId}" aria-expanded="false" title="Show cards on this page" style="color:#666;font-size:12px;margin-left:8px;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;display:inline-flex;align-items:center;gap:4px;">
							<svg class="page-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;transform:rotate(0deg);transition:transform 0.15s;">
								<polyline points="8 4 16 12 8 20"></polyline>
							</svg>
							(${countLabel})
						</button>
						<button class="page-open-all" data-pageid="${page.pageId}" title="Open all cards on this page in new tabs" style="display:none;background:none;border:none;cursor:pointer;color:#666;font-size:12px;margin-left:4px;padding:2px 4px;">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
								<polyline points="15 3 21 3 21 9"/>
								<line x1="10" y1="14" x2="21" y2="3"/>
							</svg>
						</button>
						<button class="page-share" data-pageid="${page.pageId}" title="Share this page with yourself" style="background:none;border:none;cursor:pointer;color:#666;font-size:12px;margin-left:4px;padding:2px 4px;">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
								<polyline points="16 6 12 2 8 6"/>
								<line x1="12" y1="2" x2="12" y2="15"/>
							</svg>
						</button>
						<div class="page-cards" style="display:none;margin-top:4px;margin-left:0.5em;">
							<div class="cards-loading" style="padding:8px 0;color:#666;font-style:italic;">
								<div style="display:flex;align-items:center;gap:8px;">
									<div style="width:16px;height:16px;border:2px solid #f3f3f3;border-top:2px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;"></div>
									Loading cards...
								</div>
							</div>
							<ul class="cards-list" style="margin:0.25em 0 0 1em;padding-left:1em;display:none;"></ul>
						</div>
					</li>`;
				};

				const pagesHtml = pages.length
					? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">
						${pages
							.sort((a, b) => a.pageTitle.localeCompare(b.pageTitle))
							.map(buildPageHtml)
							.join('')}
					</ul>`
					: `<div style="color:#888;font-style:italic;margin-bottom:1em;">No child pages</div>`;

				const currentPageTitle =
					pageType === 'DATA_APP_VIEW'
						? pages[0].dataAppTitle
						: pages[0].topPageTitle
						? `${pages[0].topPageTitle} > ${pages[0].parentPageTitle}`
						: pages[0].parentPageTitle;
				const currentPageLink =
					pageType === 'DATA_APP_VIEW'
						? `<a href="https://${window.location.hostname}/app-studio/${appId}/pages/${pageId}" target="_blank">${currentPageTitle}</a>`
						: `<a href="https://${window.location.hostname}/page/${pageId}" target="_blank">${currentPageTitle}</a>`;

				const message = `
          <div style="font-family:sans-serif;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                  <strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:140px;">
                      ${currentPageLink} (ID: ${pageId}) has the following child pages:
                  </strong>
              </div>
              ${pagesHtml}
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

				modalContent.innerHTML = message;

				// Create buttons after content is set to ensure proper positioning
				const closeBtn = document.createElement('button');
				closeBtn.innerHTML = '&times;';
				closeBtn.setAttribute(
					'style',
					'position:absolute;top:16px;right:16px;font-size:28px;background:none;border:none;cursor:pointer;color:#333;line-height:1;width:36px;height:36px;z-index:1;'
				);

				// Share All button (icon-only)
				const shareAllBtn = document.createElement('button');
				shareAllBtn.setAttribute(
					'style',
					'position:absolute;top:16px;right:56px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;z-index:1;'
				);
				shareAllBtn.title = 'Share all pages with yourself';
				shareAllBtn.innerHTML =
					'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
				shareAllBtn.onclick = shareAllPagesWithSelf;

				// Open All button (icon-only)
				const openAllBtn = document.createElement('button');
				openAllBtn.setAttribute(
					'style',
					'position:absolute;top:16px;right:96px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;background:none;border:none;cursor:pointer;color:#333;line-height:1;z-index:1;'
				);
				openAllBtn.title = 'Open all pages, each in a new tab';
				openAllBtn.innerHTML =
					'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
				openAllBtn.onclick = () => {
					for (const p of pages) {
						const id = p.pageId || p.id;
						if (!id) continue;
						window.open(
							pageType === 'DATA_APP_VIEW'
								? `https://${window.location.hostname}/app-studio/${appId}/pages/${id}`
								: `https://${window.location.hostname}/page/${id}`,
							'_blank'
						);
					}
				};

				// Get current user ID for sharing functionality
				let userId = window.bootstrap.currentUser.USER_ID || null;
				if (!userId) {
					try {
						const userResponse = await fetch(
							`https://${window.location.hostname}/api/sessions/v1/me`
						);
						if (userResponse.ok) {
							const user = await userResponse.json();
							userId = user.userId || null;
						}
					} catch (error) {
						console.warn('Failed to fetch user ID for sharing:', error);
					}
				}

				// Share functions
				function showSuccess(message, reload = false, duration = 3000) {
					let element = document.createElement('div');
					element.setAttribute(
						'style',
						'position:fixed;top:20px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483648;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:14px;box-shadow:0 0 10px rgba(0,0,0,0.1);pointer-events:none;'
					);
					element.innerHTML = `${message}<div style="position:absolute;bottom:0;left:0;height:3px;background-color:#155724;width:100%;animation:countdown ${duration}ms linear;"></div>`;

					document.body.appendChild(element);

					setTimeout(() => {
						if (element.parentNode) {
							element.parentNode.removeChild(element);
						}
						if (reload) {
							window.location.reload();
						}
					}, duration);
				}

				function showError(message) {
					let element = document.createElement('div');
					element.setAttribute(
						'style',
						'position:fixed;top:20px;left:50%;transform:translateX(-50%);background-color:#f8d7da;color:#721c24;z-index:2147483648;padding:10px;border:1px solid #f5c6cb;border-radius:5px;font-family:sans-serif;font-size:14px;box-shadow:0 0 10px rgba(0,0,0,0.1);cursor:pointer;'
					);
					element.textContent = message;
					element.onclick = () => element.remove();

					document.body.appendChild(element);

					setTimeout(() => {
						if (element.parentNode) {
							element.parentNode.removeChild(element);
						}
					}, 5000);
				}

				async function sharePageWithSelf(pageId) {
					if (!userId) {
						showError('User ID not available for sharing');
						return;
					}

					try {
						const response = await fetch(
							`https://${window.location.hostname}/api/content/v1/share?sendEmail=false`,
							{
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									resources: [{ type: 'page', id: pageId }],
									recipients: [
										{ type: 'user', id: userId, permission: 'HAS_ACCESS' }
									]
								})
							}
						);

						if (response.ok) {
							showSuccess(`Page ${pageId} shared successfully`);
						} else {
							showError(
								`Failed to share page ${pageId}. HTTP status: ${response.status}`
							);
						}
					} catch (error) {
						showError(`Failed to share page: ${error.message}`);
						console.error(error);
					}
				}

				async function shareAllPagesWithSelf() {
					if (!userId) {
						showError('User ID not available for sharing');
						return;
					}

					let successCount = 0;
					let errorCount = 0;

					for (const page of pages) {
						try {
							const response = await fetch(
								`https://${window.location.hostname}/api/content/v1/share?sendEmail=false`,
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({
										resources: [{ type: 'page', id: page.pageId }],
										recipients: [
											{ type: 'user', id: userId, permission: 'HAS_ACCESS' }
										]
									})
								}
							);

							if (response.ok) {
								successCount++;
							} else {
								errorCount++;
								console.warn(
									`Failed to share page ${page.pageId}: ${response.status}`
								);
							}
						} catch (error) {
							errorCount++;
							console.error(`Error sharing page ${page.pageId}:`, error);
						}
					}

					if (errorCount === 0) {
						showSuccess(`All ${successCount} pages shared successfully`);
					} else if (successCount > 0) {
						showSuccess(`${successCount} pages shared, ${errorCount} failed`);
					} else {
						showError(`Failed to share all ${errorCount} pages`);
					}
				}

				// Function to update page UI when cards are loaded
				const updatePageUI = (pageId, cards, error = false) => {
					const pageElement = modalContent.querySelector(
						`[data-page-id="${pageId}"]`
					);
					if (!pageElement) return;

					const state = pageCardsState.get(pageId);
					state.loading = false;
					state.cards = cards || [];
					state.error = error;

					// Update cards container
					const cardsContainer = pageElement.querySelector('.page-cards');
					const loadingDiv = cardsContainer.querySelector('.cards-loading');
					const cardsList = cardsContainer.querySelector('.cards-list');

					if (error) {
						loadingDiv.innerHTML =
							'<div style="color:#999;font-style:italic;">Failed to load cards</div>';
					} else if (cards.length === 0) {
						loadingDiv.innerHTML =
							'<div style="color:#999;font-style:italic;">No cards on this page</div>';
					} else {
						// Hide loading, show cards
						loadingDiv.style.display = 'none';
						cardsList.style.display = 'block';

						// Build cards HTML
						const cardsHtml = cards
							.sort((a, b) =>
								String(a.title || '').localeCompare(String(b.title || ''))
							)
							.map((card) => {
								const cardId = card.id || card.kpiId || '';
								const cardTitle = card.title || card.name || `Card ${cardId}`;
								const cardUrl =
									pageType === 'DATA_APP_VIEW'
										? `https://${window.location.hostname}/app-studio/${appId}/pages/${pageId}/kpis/details/${cardId}`
										: `https://${window.location.hostname}/page/${pageId}/kpis/details/${cardId}`;
								return `<li style="margin:0.125em 0;list-style:disc;"><a href="${cardUrl}" target="_blank" style="text-decoration:underline;">${cardTitle}</a></li>`;
							})
							.join('');

						cardsList.innerHTML = cardsHtml;
						pageToCards.set(pageId, cards);
					}
				};

				let urlWatcher;
				const cleanup = () => {
					if (modal && modal.parentNode) modal.remove();
					window.removeEventListener('popstate', cleanup);
					window.removeEventListener('hashchange', cleanup);
					if (urlWatcher) clearInterval(urlWatcher);
				};
				closeBtn.onclick = cleanup;

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

				// Wire up "open all cards" buttons
				const pageOpenAllButtons = modalContent.querySelectorAll(
					'button.page-open-all'
				);
				pageOpenAllButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const pageIdAttr = btn.getAttribute('data-pageid');
						const cardsOnPage = pageToCards.get(parseInt(pageIdAttr)) || [];
						cardsOnPage.forEach((card) => {
							const cardId = card.id || card.kpiId || '';
							if (cardId) {
								const cardUrl =
									pageType === 'DATA_APP_VIEW'
										? `https://${window.location.hostname}/app-studio/${appId}/pages/${pageIdAttr}/kpis/details/${cardId}`
										: `https://${window.location.hostname}/page/${pageIdAttr}/kpis/details/${cardId}`;
								window.open(cardUrl, '_blank');
							}
						});
					});
				});

				// Wire up individual page share buttons
				const pageShareButtons =
					modalContent.querySelectorAll('button.page-share');
				pageShareButtons.forEach((btn) => {
					btn.addEventListener('click', () => {
						const pageIdAttr = btn.getAttribute('data-pageid');
						sharePageWithSelf(parseInt(pageIdAttr));
					});
				});

				modalContent.appendChild(shareAllBtn);
				modalContent.appendChild(openAllBtn);
				modalContent.appendChild(closeBtn);
				modal.appendChild(modalContent);
				document.body.appendChild(modal);

				// Add countdown animation CSS
				const style = document.createElement('style');
				style.textContent = `
					@keyframes countdown {
						from { width: 100%; }
						to { width: 0%; }
					}
				`;
				document.head.appendChild(style);

				// Remove loading indicator now that modal is displayed
				removeLoading();

				const initialUrl = window.location.href;
				urlWatcher = setInterval(() => {
					if (window.location.href !== initialUrl) cleanup();
				}, 500);
				window.addEventListener('popstate', cleanup);
				window.addEventListener('hashchange', cleanup);

				// Now fetch cards for each page in the background
				pages.forEach(async (page) => {
					try {
						const cardsResponse = await fetch(
							`https://${window.location.hostname}/api/content/v1/pages/${page.pageId}/cards?parts=metadata&showAllCards=true`,
							{
								method: 'GET',
								signal: abortController.signal
							}
						);
						if (cardsResponse.ok) {
							const cards = await cardsResponse.json();
							updatePageUI(page.pageId, cards || []);
						} else {
							updatePageUI(page.pageId, [], true);
						}
					} catch (error) {
						if (error.name !== 'AbortError') {
							console.warn(
								`Failed to fetch cards for page ${page.pageId}:`,
								error
							);
							updatePageUI(page.pageId, [], true);
						}
					}
				});
			})
			.catch((error) => {
				// Don't show error message if request was aborted due to navigation
				if (error.name !== 'AbortError') {
					removeLoading();
					alert(`Failed to fetch page ${pageId}.\nError: ${error.message}`);
					console.error(error);
				}
				// If AbortError, removeLoading was already called by handleNavigation
			});
	} else {
		alert(
			'This bookmarklet can only be used on page or app studio URLs.\nPlease navigate to a valid page or app studio URL and try again.'
		);
	}
})();
