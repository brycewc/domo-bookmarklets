javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	navigator.clipboard.readText().then((appPageId) => {
		fetch(
			`https://${window.location.hostname}/api/content/v3/stacks/${appPageId}/cards`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const page = await response.json();
					if (Array.isArray(page.cards) && page.cards.length > 0) {
						const card = page.cards[0];
						fetch(
							`https://${window.location.hostname}/api/content/v1/cards?urns=${card.id}&parts=adminAllPages`,
							{
								method: 'GET'
							}
						)
							.then(async (cardResponse) => {
								if (cardResponse.ok) {
									const cards = await cardResponse.json();
									if (Array.isArray(cards) && cards.length > 0) {
										const card = cards[0];
										const appId = card.adminAllAppPages.find(
											(appPage) => appPage.appPageId == appPageId
										)?.appId;
										if (appId) {
											Object.assign(document.createElement('a'), {
												target: '_blank',
												rel: 'noopener noreferrer',
												href: `https://${window.location.hostname}/app-studio/${appId}/pages/${appPageId}`
											}).click();
										} else {
											alert(
												`Failed to get App ID from first card on page ${appPageId}.`
											);
										}
									} else {
										alert(
											'App has no Cards. The only way to get App ID (needed to navigate) is through cards on the App Studio Page.'
										);
									}
								} else {
									alert(
										`Failed to fetch Card details.\nHTTP status: ${cardResponse.status}`
									);
								}
							})
							.catch((error) => {
								alert(`Failed to fetch Card details.\nError: ${error.message}`);
								console.error(error);
							});
					} else {
						alert(
							`The App Studio Page ${appPageId} has no Cards. The only way to get App ID (needed to navigate) is through Cards on the App Studio Page.`
						);
					}
				} else {
					alert(
						`Failed to fetch App Studio Page ${appPageId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to fetch App Studio Page ${appPageId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	});
})();
