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

		// Check for child pages if this is a regular PAGE (not DATA_APP_VIEW)
		if (pageType === 'PAGE') {
			const childPagesBody = {
				orderBy: 'lastModified',
				ascending: true,
				includeParentPageIdsClause: true,
				parentPageIds: [parseInt(pageId)]
			};

			fetch(
				`${location.origin}/api/content/v1/pages/adminsummary?limit=100&skip=0`,
				{
					method: 'POST',
					body: JSON.stringify(childPagesBody),
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json'
					}
				}
			)
				.then(async (childResponse) => {
					if (childResponse.ok) {
						const adminSummaryResponse = await childResponse.json();
						const childPages = adminSummaryResponse.pageAdminSummaries || [];

						if (childPages.length > 0) {
							// Display child pages in a modal
							displayChildPagesModal(childPages);
							return;
						}

						// No child pages, proceed with deletion
						proceedWithDeletion();
					} else {
						alert(
							`Failed to check for child pages.\nHTTP status: ${childResponse.status}\n\nDeletion cancelled for safety.`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to check for child pages.\nError: ${error.message}\n\nDeletion cancelled for safety.`
					);
					console.error(error);
				});
		} else {
			// DATA_APP_VIEW doesn't have child pages, proceed directly
			proceedWithDeletion();
		}

		function displayChildPagesModal(pages) {
			// Build HTML for pages list
			const pagesHtml = `<ul style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">
				${pages
					.sort((a, b) => a.pageTitle.localeCompare(b.pageTitle))
					.map((page) => {
						const pageUrl = `${location.origin}/page/${page.pageId}`;
						const cardCount = page.cardCount || 0;
						const countLabel =
							cardCount === 1 ? '1 card' : `${cardCount} cards`;
						return `<li style="margin-bottom:0.25em;list-style:disc;">
							<a href="${pageUrl}" target="_blank" style="text-decoration:underline;">${page.pageTitle}</a>
							<span style="color:#666;font-size:12px;margin-left:8px;">(${countLabel})</span>
						</li>`;
					})
					.join('')}
			</ul>`;

			const message = `
				<div style="font-family:sans-serif;">
					<div style="display:flex;align-items:flex-start;justify-content:space-between;">
						<strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:140px;color:#721c24;">
							Cannot delete page ${pageId}
						</strong>
					</div>
					<p style="margin-top:0.5em;margin-bottom:0.5em;">
						This page has ${pages.length} child page(s). Please move or delete all child pages first.
					</p>
					${pagesHtml}
				</div>
			`;

			// Create modal
			const modal = document.createElement('div');
			modal.setAttribute(
				'style',
				'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:2147483647;display:flex;align-items:center;justify-content:center;'
			);

			const modalContent = document.createElement('div');
			modalContent.setAttribute(
				'style',
				'background:white;padding:24px 32px 24px 32px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:320px;max-width:600px;position:relative;overflow:auto;max-height:90vh;'
			);

			modalContent.innerHTML = message;

			// Create close button
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
					window.open(`${location.origin}/page/${id}`, '_blank');
				}
			};

			// Get current user ID for sharing functionality
			let userId = null;
			if (
				window.bootstrap &&
				window.bootstrap.currentUser &&
				window.bootstrap.currentUser.USER_ID
			) {
				userId = window.bootstrap.currentUser.USER_ID;
			}

			// Fetch user ID if not available from bootstrap
			if (!userId) {
				fetch(`${location.origin}/api/sessions/v1/me`)
					.then(async (userResponse) => {
						if (userResponse.ok) {
							const user = await userResponse.json();
							userId = user.userId || null;
						}
					})
					.catch((error) => {
						console.warn('Failed to fetch user ID for sharing:', error);
					});
			}

			// Share functions
			function showSuccess(message, duration = 20) {
				let element = document.createElement('div');
				element.setAttribute(
					'style',
					'position:fixed;top:20px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483648;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:14px;box-shadow:0 0 10px rgba(0,0,0,0.1);pointer-events:none;'
				);
				element.innerHTML = `${message}<div style="position:absolute;bottom:0;left:0;height:3px;background-color:#155724;width:100%;animation:countdown ${duration}ms linear;"></div>`;

				document.body.appendChild(element);

				let countdown = document.getElementById('countdown');
				let width = 100;
				let interval = setInterval(function () {
					width--;
					countdown.style.width = width + '%';
					if (width <= 0) {
						clearInterval(interval);
						element.parentNode.removeChild(element);
					}
				}, duration);
			}

			function showError(message, duration = 20) {
				let element = document.createElement('div');
				element.setAttribute(
					'style',
					'position:fixed;top:20px;left:50%;transform:translateX(-50%);background-color:#f8d7da;color:#721c24;z-index:2147483648;padding:10px;border:1px solid #f5c6cb;border-radius:5px;font-family:sans-serif;font-size:14px;box-shadow:0 0 10px rgba(0,0,0,0.1);cursor:pointer;'
				);
				element.textContent = message;
				element.onclick = () => element.remove();

				document.body.appendChild(element);

				let countdown = document.getElementById('countdown');
				let width = 100;
				let interval = setInterval(function () {
					width--;
					countdown.style.width = width + '%';
					if (width <= 0) {
						clearInterval(interval);
						element.parentNode.removeChild(element);
					}
				}, duration);
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
							`${location.origin}/api/content/v1/share?sendEmail=false`,
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

			// Wire up Share All button
			shareAllBtn.onclick = shareAllPagesWithSelf;

			const cleanup = () => {
				if (modal && modal.parentNode) modal.remove();
			};
			closeBtn.onclick = cleanup;

			// Add countdown animation CSS
			const style = document.createElement('style');
			style.textContent = `
				@keyframes countdown {
					from { width: 100%; }
					to { width: 0%; }
				}
			`;
			if (!document.head.querySelector('style[data-bookmarklet-countdown]')) {
				style.setAttribute('data-bookmarklet-countdown', 'true');
				document.head.appendChild(style);
			}

			modalContent.appendChild(shareAllBtn);
			modalContent.appendChild(openAllBtn);
			modalContent.appendChild(closeBtn);
			modal.appendChild(modalContent);
			document.body.appendChild(modal);
		}

		function proceedWithDeletion() {
			const response = fetch(
				`${location.origin}/api/content/v3/stacks/${pageId}/cards`,
				{
					method: 'GET'
				}
			);
			if (
				confirm(
					`Are you sure you want to delete page ${pageId} and all its cards?`
				)
			) {
				response
					.then(async (res) => {
						if (res.ok) {
							const page = await res.json();
							const cardIds = page.cards.map((card) => card.id).join(',');

							fetch(
								`${location.origin}/api/content/v1/cards/bulk?cardIds=${cardIds}`,
								{
									method: 'DELETE'
								}
							)
								.then((response) => {
									if (response.ok) {
										let pageDeleteUrl =
											pageType === 'PAGE'
												? `/api/content/v1/pages/${pageId}`
												: `/api/content/v1/dataapps/${appId}/views/${pageId}`;
										fetch(`${location.origin}${pageDeleteUrl}`, {
											method: 'DELETE'
										})
											.then((response) => {
												if (response.ok) {
													showSuccess(
														`Page ${pageId} and all ${page.cards.length} Cards were deleted successfully`
													);
												} else {
													alert(
														`Failed to delete page ${pageId}. All ${page.cards.length} cards were deleted successfully.\nHTTP status: ${response.status}`
													);
												}
											})
											.catch((error) => {
												alert(
													`Failed to delete page ${pageId}. All ${page.cards.length} cards were deleted successfully.\nError: ${error.message}`
												);
												console.error(error);
											});
									} else {
										alert(
											`Failed to delete cards for page ${pageId}. Page will not be deleted.\nHTTP status: ${response.status}`
										);
									}
								})
								.catch((error) => {
									alert(
										`Failed to delete cards for page ${pageId}. Page will not be deleted.\nError: ${error.message}`
									);
									console.error(error);
								});
						} else {
							alert(
								`Failed to fetch cards for page ${pageId}. Page and cards will not be deleted.\nHTTP status: ${response.status}`
							);
						}
					})
					.catch((error) => {
						alert(
							`Failed to fetch cards for page ${pageId}. Page and cards will not be deleted.\nError: ${error.message}`
						);
						console.error(error);
					});
			}
		} // End of proceedWithDeletion function
	} else {
		alert(
			'This bookmarklet can only be used on page URLs.\nPlease navigate to a valid page URL and try again.'
		);
	}
})();
