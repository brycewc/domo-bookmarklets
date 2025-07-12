javascript: (async () => {
	const url = window.location.href;

	if (url.includes('page')) {
		const parts = url.split('/');
		const pageId = parts[parts.indexOf('page') + 1];

		const page = await fetch(`/api/content/v3/stacks/${pageId}/cards`, {
			method: 'GET'
		});

		const cardIds = page.cards.map((card) => card.id).join(',');

		await fetch(`/api/content/v1/cards/bulk?cardIds=${cardIds}`, {
			method: 'DELETE'
		}).catch((error) =>
			alert(`Error deleting Cards for Page ${pageId}: ` + error.message)
		);

		await fetch(`/api/content/v1/pages/${pageId}`, {
			method: 'DELETE'
		})
			.then((response) => {
				if (response.ok) {
					alert(`Page ${pageId} and all cards deleted successfully.`);
					window.location.reload();
				}
			})
			.catch((error) =>
				alert(`Error deleting Page ${pageId}: ` + error.message)
			);
	}
})();
