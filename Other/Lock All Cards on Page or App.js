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
			<div style="font-family:sans-serif;color:#666;">Locking cards...</div>
			<style>
				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			</style>
		`;
		loadingModal.appendChild(loadingContent);
		document.body.appendChild(loadingModal);

		// Helper function to remove loading indicator
		const removeLoading = () => {
			if (loadingModal && loadingModal.parentNode) {
				loadingModal.remove();
			}
		};

		// Function to fetch and lock all cards for a given pageId
		async function fetchAndLockCards(pageId) {
			try {
				const response = await fetch(
					`${location.origin}/api/content/v3/stacks/${pageId}/cards?parts=adminAllPages`
				);

				if (!response.ok) {
					return {
						locked: 0,
						failed: 0,
						pageTitle: 'Unknown',
						pageId: pageId,
						error: `Failed to fetch page (HTTP status: ${response.status})`
					};
				}

				const page = await response.json();
				const cards = page.cards || [];
				const pageTitle = page.title || `Page ${pageId}`;

				if (!cards.length) {
					return {
						locked: 0,
						failed: 0,
						pageTitle: pageTitle,
						pageId: pageId,
						noCards: true
					};
				}

				// Lock all cards on this page and return counts
				return await lockCards(cards, pageTitle, pageId);
			} catch (error) {
				return {
					locked: 0,
					failed: 0,
					pageTitle: 'Unknown',
					pageId: pageId,
					error: error.message
				};
			}
		}

		// Function to lock an array of cards
		async function lockCards(cards, pageTitle, pageId) {
			let lockedCount = 0;
			let failedCount = 0;

			for (const card of cards) {
				try {
					const lockResponse = await fetch(
						`${location.origin}/api/content/v1/cards/${card.id}`,
						{
							method: 'PUT',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({ locked: true })
						}
					);

					if (lockResponse.ok) {
						lockedCount++;
					} else {
						failedCount++;
						console.error(
							`Failed to lock card ${card.id}. HTTP status: ${lockResponse.status}`
						);
					}
				} catch (error) {
					failedCount++;
					console.error(`Error locking card ${card.id}: ${error.message}`);
				}
			}

			return { locked: lockedCount, failed: failedCount, pageTitle, pageId };
		}

		// If on an app, fetch all pages first, then get cards for each page
		if (pageType === 'DATA_APP_VIEW') {
			fetch(`${location.origin}/api/content/v1/dataapps/${appId}`)
				.then(async (response) => {
					if (!response.ok) {
						removeLoading();
						alert(
							`Failed to fetch App ${appId}.\nHTTP status: ${response.status}`
						);
						return;
					}

					const app = await response.json();
					const views = app.views || [];

					if (!views.length) {
						removeLoading();
						alert(`App ${appId} has no views.`);
						return;
					}

					// Fetch and lock cards for each view
					let totalLocked = 0;
					let totalFailed = 0;
					const noCardsPages = [];
					const errorPages = [];

					for (const view of views) {
						const result = await fetchAndLockCards(view.viewId);
						totalLocked += result.locked;
						totalFailed += result.failed;

						if (result.noCards) {
							noCardsPages.push(result);
						} else if (result.error) {
							errorPages.push(result);
						}
					}

					removeLoading();

					// Build summary message
					let summaryLines = [];
					summaryLines.push(`Locked ${totalLocked} card(s) across all pages.`);

					if (totalFailed > 0) {
						summaryLines.push(`${totalFailed} card(s) failed to lock.`);
					}

					if (noCardsPages.length > 0) {
						summaryLines.push('');
						summaryLines.push('Pages with no cards:');
						noCardsPages.forEach((page) => {
							summaryLines.push(`  - ${page.pageTitle} (ID: ${page.pageId})`);
						});
					}

					if (errorPages.length > 0) {
						summaryLines.push('');
						summaryLines.push('Pages with errors:');
						errorPages.forEach((page) => {
							summaryLines.push(
								`  - ${page.pageTitle} (ID: ${page.pageId}): ${page.error}`
							);
						});
					}

					alert(summaryLines.join('\n'));
				})
				.catch((error) => {
					removeLoading();
					alert(`Failed to fetch App ${appId}.\nError: ${error.message}`);
					console.error(error);
				});
		} else {
			// Single page - fetch and lock cards directly
			fetchAndLockCards(pageId).then((result) => {
				removeLoading();

				if (result.error) {
					alert(
						`Failed to fetch ${result.pageTitle} (ID: ${result.pageId}).\nError: ${result.error}`
					);
				} else if (result.noCards) {
					alert(`${result.pageTitle} (ID: ${result.pageId}) has no cards.`);
				} else {
					const message =
						result.failed === 0
							? `Successfully locked ${result.locked} card(s) on ${result.pageTitle} (ID: ${result.pageId}).`
							: `Locked ${result.locked} card(s) with ${result.failed} failure(s) on ${result.pageTitle} (ID: ${result.pageId}).`;

					alert(message);
				}
			});
		}
	} else {
		alert(
			'This bookmarklet can only be used on page or app studio URLs.\nPlease navigate to a valid page or app studio URL and try again.'
		);
	}
})();
