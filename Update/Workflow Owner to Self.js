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
						owner: userId
					})
				}
			)
				.then((res) => {
					if (res.ok) {
						window.location.reload();
					} else {
						alert(
							`Failed to update Workflow ${workflowId}.\nHTTP status: ${res.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to update Workflow ${workflowId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		} else {
			alert('Failed to fetch current User ID. Please try again later.');
		}
	} else {
		alert(
			'This bookmarklet can only be used on Workflow URLs.\nPlease navigate to a valid Workflow URL and try again.'
		);
	}
})();
