javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('kpis')) {
		const parts = url.split(/[/?=&]/);
		const cardId = parts[parts.indexOf('details') + 1];

		fetch(
			`https://${window.location.hostname}/api/content/v1/cards?urns=${cardId}&parts=adminAllPages`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const cards = await response.json();
					const card = cards[0];
					if (card) {
						if (
							(card.adminAllPages && card.adminAllPages.length > 0) ||
							(card.adminAllAppPages && card.adminAllAppPages.length > 0)
						) {
							const adminPages =
								card.adminAllPages && card.adminAllPages.length
									? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:1em;padding-left:1.5em;list-style:disc;">${card.adminAllPages
											.map(
												(page) =>
													`<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="https://${window.location.hostname}/page/${page.pageId}" target="_blank" style="text-decoration:underline;">${page.title}</a></li>`
											)
											.join('')}</ul>`
									: `<div style="color:#888;font-style:italic;margin-bottom:1em;">Card is not used on any Pages</div>`;

							const appPages =
								card.adminAllAppPages && card.adminAllAppPages.length
									? `<ul class="domo-bm-list" style="margin-top:0.5em;margin-bottom:0;padding-left:1.5em;list-style:disc;">${card.adminAllAppPages
											.map(
												(page) =>
													`<li style="margin-bottom:0.25em;list-style:disc;">\n<a href="https://${window.location.hostname}/app-studio/${page.appId}/pages/${page.appPageId}" target="_blank" style="text-decoration:underline;">${page.appTitle} &gt; ${page.appPageTitle}</a></li>`
											)
											.join('')}</ul>`
									: `<div style="color:#888;font-style:italic;">Card is not used on any App Pages</div>`;

							const message = `
    <div style="font-family:sans-serif;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;">
            <strong style="font-size:1.1em;line-height:1.3;display:block;padding-right:2.5em;">
                Card ${card.title} (ID: ${cardId}) is used in the following pages:
            </strong>
        </div>
        <h4 style="margin-bottom:0.25em;">Pages</h4>
        ${adminPages}
        <h4 style="margin-bottom:0.25em;margin-top:1em;">App Pages</h4>
        ${appPages}
    </div>
`;

							// Modal container
							const modal = document.createElement('div');
							modal.setAttribute(
								'style',
								'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center;'
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
							modalContent.appendChild(closeBtn);
							modal.appendChild(modalContent);
							document.body.appendChild(modal);

							// Watch for URL changes (SPA navigation or back/forward)
							const initialUrl = window.location.href;
							urlWatcher = setInterval(() => {
								if (window.location.href !== initialUrl) {
									cleanup();
								}
							}, 500);
							window.addEventListener('popstate', cleanup);
							window.addEventListener('hashchange', cleanup);
						} else {
							alert(`Card ${cardId} is not used in any pages or apps.`);
						}
					} else {
						alert(`Card ${cardId} not found.`);
					}
				} else {
					alert(
						`Failed to fetch Card ${cardId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(`Failed to fetch Card ${cardId}.\nError: ${error.message}`);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on Card URLs.\nPlease navigate to a valid Card URL and try again.'
		);
	}
})();
