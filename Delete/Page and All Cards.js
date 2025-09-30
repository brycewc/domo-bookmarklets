javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
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
		const response = fetch(
			`https://${window.location.hostname}/api/content/v3/stacks/${pageId}/cards`,
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
							`https://${window.location.hostname}/api/content/v1/cards/bulk?cardIds=${cardIds}`,
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
									fetch(`https://${window.location.hostname}${pageDeleteUrl}`, {
										method: 'DELETE'
									})
										.then((response) => {
											if (response.ok) {
												let element = document.createElement('div');
												element.setAttribute(
													'style',
													'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
												);
												element.innerHTML = `Page ${pageId} and all ${page.cards.length} Cards were deleted successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
												}, 30);
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
	} else {
		alert(
			'This bookmarklet can only be used on page URLs.\nPlease navigate to a valid page URL and try again.'
		);
	}
})();
