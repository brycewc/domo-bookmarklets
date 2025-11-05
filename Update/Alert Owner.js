javascript: (async () => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('alerts/')) {
		let userId = window.bootstrap.currentUser.USER_ID || null;
		if (!userId) {
			userId = await fetch(`${location.origin}/api/sessions/v1/me`).then(
				async (res) => {
					if (res.ok) {
						const user = await res.json();
						return user.userId || null;
					}
				}
			);
		}

		const newOwnerId = prompt(
			'Enter the user ID of new owner (defaults to current user ID):',
			userId
		);

		if (newOwnerId === '') {
			newOwnerId = userId;
		}

		if (!newOwnerId) {
			return; // User pressed Cancel
		}

		const parts = url.split(/[/?=&]/);
		const alertId = parts[parts.indexOf('alerts') + 1];

		fetch(`${location.origin}/api/social/v4/alerts/${alertId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				id: alertId,
				owner: parseInt(newOwnerId)
			})
		})
			.then((res) => {
				if (res.ok) {
					location.reload();
				} else {
					alert(
						`Failed to update alert ${alertId} to owner ${newOwnerId}.\nHTTP status: ${res.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to update alert ${alertId} to owner ${newOwnerId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on alert URLs.\nPlease navigate to a valid alert URL and try again.'
		);
	}
})();
