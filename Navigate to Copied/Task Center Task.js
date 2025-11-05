javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	navigator.clipboard.readText().then((text) => {
		fetch(
			`${location.origin}/api/queues/v1/tasks/list?limit=100&offset=0&render=true&renderParts=NAME,DESCRIPTION,MAPPING,METADATA&direction=ASC&orderBy=createdOn`,
			{
				method: 'POST',
				body: JSON.stringify({ id: text }),
				headers: {
					'Content-Type': 'application/json'
				}
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const tasks = await response.json();
					if (Array.isArray(tasks) && tasks.length > 0) {
						const task = tasks[0];
						Object.assign(document.createElement('a'), {
							target: '_blank',
							rel: 'noopener noreferrer',
							href: `${location.origin}/queues/tasks?queueId=${task.queueId}&id=${text}&openTaskDrawer=true`
						}).click();
					} else {
						alert(`No tasks found for ID: ${text}`);
					}
				} else {
					alert(
						`Failed to fetch Task ${text}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(`Failed to fetch Task ${text}.\nError: ${error.message}`);
				console.error(error);
			});
	});
})();
