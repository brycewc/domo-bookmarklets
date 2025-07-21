javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('alerts')) {
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
			let alertId = url.substring(url.lastIndexOf('/') + 1);

			fetch(`https://domo.domo.com/api/social/v4/alerts/${alertId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: alertId,
					owner: userId
				})
			})
				.then((res) => {
					if (res.ok) {
						window.location.reload();
					} else {
						alert(
							`Failed to update Alert ${alertId}.\nHTTP status: ${res.status}`
						);
					}
				})
				.catch((error) => {
					alert(`Failed to update Alert ${alertId}.\nError: ${error.message}`);
					console.error(error);
				});
		} else {
			alert('Failed to fetch current User ID. Please try again later.');
		}
	} else {
		alert(
			'This bookmarklet can only be used on Alert URLs.\nPlease navigate to a valid Alert URL and try again.'
		);
	}
})();
