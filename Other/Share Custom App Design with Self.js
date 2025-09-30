javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('assetlibrary/') || url.includes('pro-code-editor/')) {
		let userId = window.bootstrap.currentUser.USER_ID || null;
		if (!userId) {
			userId = await fetch(
				`https://${window.location.hostname}/api/sessions/v1/me`
			).then(async (res) => {
				if (res.ok) {
					const user = await res.json();
					return user.userId || null;
				} else {
					alert(`Failed to fetch current user ID.\nHTTP status: ${res.status}`);
					throw new Error(
						`Failed to fetch current user ID.\nHTTP status: ${res.status}`
					);
				}
			});
		}
		if (userId) {
			const parts = url.split(/[/?=&]/);
			const uriPart = url.includes('assetlibrary')
				? 'assetlibrary'
				: 'pro-code-editor';
			const appDesignId = parts[parts.indexOf(uriPart) + 1];
			fetch(
				`https://${window.location.hostname}/api/apps/v1/designs/${appDesignId}/permissions/ADMIN`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify([userId])
				}
			)
				.then((response) => {
					if (response.ok) {
						window.location.reload();
					} else {
						alert(
							`Failed to share custom app design ${appDesignId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to share custom app design ${appDesignId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		} else {
			alert('Failed to fetch current user ID. Please try again later.');
		}
	} else {
		alert(
			'This bookmarklet can only be used on custom app design URLs.\nPlease navigate to a valid custom app design URL and try again.'
		);
	}
})();
