javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('dataflows')) {
		let parts = url.split('/');
		let id = parts[parts.indexOf('dataflows') + 1];

		fetch(
			`https://${window.location.hostname}/api/dataprocessing/v2/dataflows/${id}`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const dataflow = await response.json();

					// Display a prompt with the prefilled value
					const newDataflowName = prompt('New Name:', dataflow.name);

					if (newDataflowName) {
						fetch(
							`https://domo.domo.com/api/dataprocessing/v1/dataflows/${id}/patch`,
							{
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									name: newDataflowName
								})
							}
						)
							.then((res) => {
								if (res.ok) {
									window.location.reload();
								} else {
									alert(
										`Failed to update DataFlow ${id}.\nHTTP status: ${res.status}`
									);
								}
							})
							.catch((error) =>
								alert(
									`Failed to update DataFlow ${id}.\nError: ${error.message}`
								)
							);
					}
				} else {
					alert(
						`Failed to fetch DataFlow ${id}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(`Failed to fetch DataFlow ${id}.\nError: ${error.message}`);
			});
	} else {
		alert(
			'This bookmarklet can only be used on DataFlow URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
