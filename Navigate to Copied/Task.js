javascript: (() => {
	navigator.clipboard.readText().then(async (text) => {
		await fetch(
			`https://${window.location.hostname}/api/content/v1/tasks/${text}`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const data = await response.json();
					Object.assign(document.createElement('a'), {
						target: '_blank',
						rel: 'noopener noreferrer',
						href: `https://${window.location.hostname}/project/${data.projectId}?taskId=${text}`
					}).click();
				} else {
					alert(
						`Failed to fetch Task ${text}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) =>
				alert(`Failed to fetch Task ${text}.\nError: ${error.message}`)
			);
	});
})();
