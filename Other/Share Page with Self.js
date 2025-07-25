javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('page')) {
		let userId = window.bootstrap.currentUser.USER_ID || null;
		if (!userId) {
			userId = await fetch(
				`https://${window.location.hostname}/api/sessions/v1/me`
			).then(async (res) => {
				if (res.ok) {
					const user = await res.json();
					return user.userId || null;
				} else {
					alert(`Failed to fetch current User ID.\nHTTP status: ${res.status}`);
					throw new Error(
						`Failed to fetch current User ID.\nHTTP status: ${res.status}`
					);
				}
			});
		}
		if (userId) {
			const parts = url.split(/[/?=&]/);
			const pageId = parts[parts.indexOf('page') + 1];
			fetch(
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
						alert(
							`Failed to share Page ${pageId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(`Failed to share Page ${pageId}.\nError: ${error.message}`);
					console.error(error);
				});
		} else {
			alert('Failed to fetch current User ID. Please try again later.');
		}
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
