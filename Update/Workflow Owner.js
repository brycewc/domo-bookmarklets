javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('workflows')) {
		let userId = window.bootstrap.currentUser.USER_ID || null;
		if (!userId) {
			userId = await fetch(
				`https://${window.location.hostname}/api/sessions/v1/me`
			).then(async (res) => {
				if (res.ok) {
					const user = await res.json();
					return user.userId || null;
				}
			});
		}

		const newOwnerId = prompt(
			'User ID of New Owner (Defaults to Current User ID):',
			userId
		);

		if (newOwnerId === '') {
			newOwnerId = userId;
		}

		if (!newOwnerId) {
			return; // User pressed Cancel
		}

		const parts = url.split(/[/?=&]/);
		const workflowId = parts[parts.indexOf('models') + 1];

		fetch(
			`https://${window.location.hostname}/api/workflow/v1/models/${workflowId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: workflowId,
					owner: userId.toString()
				})
			}
		)
			.then((res) => {
				if (res.ok) {
					window.location.reload();
				} else {
					alert(
						`Failed to update Workflow ${workflowId} to Owner ${userId}.\nHTTP status: ${res.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to update Workflow ${workflowId} to Owner ${userId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on Workflow URLs.\nPlease navigate to a valid Workflow URL and try again.'
		);
	}
})();
