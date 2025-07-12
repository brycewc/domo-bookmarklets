javascript: (() => {
	const url = window.location.href;

	if (url.includes('page')) {
		const parts = url.split('/');
		const pageId = parts[parts.indexOf('page') + 1];
		const response = fetch(`/api/content/v3/stacks/${pageId}/cards`, {
			method: 'GET'
		});
		if (
			confirm(
				`Are you sure you want to delete Page ${pageId} and all its cards?`
			)
		) {
			response
				.then(async (res) => {
					if (res.ok) {
						const page = await res.json();
						const cardIds = page.cards.map((card) => card.id).join(',');

						fetch(`/api/content/v1/cards/bulk?cardIds=${cardIds}`, {
							method: 'DELETE'
						})
							.then((response) => {
								if (response.ok) {
									fetch(`/api/content/v1/pages/${pageId}`, {
										method: 'DELETE'
									})
										.then((response) => {
											if (response.ok) {
												alert(
													`Page ${pageId} and all ${page.cards.length} Cards were deleted successfully.`
												);
												window.location.reload();
											} else {
												alert(
													`Failed to delete Page ${pageId}. All ${page.cards.length} Cards were deleted successfully.\nHTTP status: ${response.status}`
												);
											}
										})
										.catch((error) =>
											alert(
												`Failed to delete Page ${pageId}. All ${page.cards.length} Cards were deleted successfully.\nError: ${error.message}`
											)
										);
								} else {
									alert(
										`Failed to delete Cards for Page ${pageId}. Page will not be deleted.\nHTTP status: ${response.status}`
									);
								}
							})
							.catch((error) =>
								alert(
									`Failed to delete Cards for Page ${pageId}. Page will not be deleted.\nError: ${error.message}`
								)
							);
					} else {
						alert(
							`Failed to fetch Cards for Page ${pageId}. Page and Cards will not be deleted.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) =>
					alert(
						`Failed to fetch Cards for Page ${pageId}. Page and Cards will not be deleted.\nError: ${error.message}`
					)
				);
		}
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
