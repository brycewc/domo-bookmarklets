javascript: (() => {
	navigator.clipboard.readText().then((drillViewId) => {
		fetch(`${location.origin}/api/content/v1/cards/${drillViewId}/urn`, {
			method: 'GET'
		})
			.then(async (response) => {
				if (response.ok) {
					const card = await response.json();
					Object.assign(document.createElement('a'), {
						target: '_blank',
						rel: 'noopener noreferrer',
						href: `${location.origin}/analyzer?cardid=${card.rootId}&drillviewid=${drillViewId}`
					}).click();
				} else {
					alert(
						`Failed to fetch Drill Path ${drillViewId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to fetch Drill Path ${drillViewId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	});
})();
