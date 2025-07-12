javascript: (async () => {
	const url = window.location.href;
	if (url.includes('page')) {
		const response = fetch(
			`https://${window.location.hostname}/api/sessions/v1/me`
		);
		const localStorageKeys = Object.keys(localStorage);
		var userId =
			localStorageKeys.find((key) => key.startsWith('dm:')).split(':')[1] ||
			null;
		if (!userId) {
			userId = response
				.then(async (res) => {
					if (res.ok) {
						const user = await res.json();
						return user.userId;
					} else {
						alert(`Failed to fetch User ID.\nHTTP status: ${res.status}`);
						throw new Error(
							`Failed to fetch User ID.\nHTTP status: ${res.status}`
						);
					}
				})
				.catch((error) => {
					alert(`Failed to fetch User ID.\nError: ${error.message}`);
					throw new Error(`Failed to fetch User ID.\nError: ${error.message}`);
				});
		}
		const parts = url.split('/');
		const pageId = parts[parts.indexOf('page') + 1];
		await fetch(
			`https://${window.location.hostname}/api/content/v1/share?sendEmail=false`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					resources: [
						{
							type: 'page',
							id: pageId
						}
					],
					recipients: [
						{
							type: 'user',
							id: userId
						}
					],
					message: 'Page shared with you via bookmarklet.'
				})
			}
		)
			.then((response) => {
				if (response.ok) {
					window.location.reload();
				} else {
					alert(`Failed to share Page ${id}.\nHTTP status: ${response.status}`);
				}
			})
			.catch((error) =>
				alert(`Failed to share Page ${id}.\nError: ${error.message}`)
			);
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
