javascript: (async () => {
	const url = window.location.href;
	if (url.includes('page')) {
		const response = await fetch(
			`https://${window.location.hostname}/api/sessions/v1/me`
		);
		if (response.ok) {
			const user = await response.json();

			const parts = url.split('/');
			const id = parts[parts.indexOf('page') + 1];
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
								id: id
							}
						],
						recipients: [
							{
								type: 'user',
								id: user.userId
							}
						],
						message: 'Page shared with you via bookmarklet.'
					})
				}
			)
				.then((response) => {
					if (response.ok) {
						alert(`Page ${id} shared successfully.`);
						window.location.reload();
					}
				})
				.catch((error) => alert(`Error sharing Page ${id}: ` + error.message));
		} else {
			alert('This bookmarklet can only be used on Page URLs.');
		}
	}
})();
