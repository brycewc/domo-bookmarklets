javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('dataflows/')) {
		const parts = url.split(/[/?=&]/);
		const dataflowId = parts[parts.indexOf('dataflows') + 1];

		fetch(
			`https://${window.location.hostname}/api/dataprocessing/v2/dataflows/${dataflowId}`,
			{
				method: 'GET'
			}
		)
			.then(async (response) => {
				if (response.ok) {
					const dataflow = await response.json();

					// Display a prompt with the prefilled value
					const updatedDataflowName = prompt('Updated Name:', dataflow.name);

					if (updatedDataflowName === '') {
						alert('DataFlow name cannot be empty.');
						return;
					}

					if (updatedDataflowName === null) {
						return; // User pressed Cancel
					}

					if (updatedDataflowName) {
						fetch(
							`https://${window.location.hostname}/api/dataprocessing/v1/dataflows/${dataflowId}/patch`,
							{
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									name: updatedDataflowName
								})
							}
						)
							.then((res) => {
								if (res.ok) {
									window.location.reload();
								} else {
									alert(
										`Failed to update DataFlow ${dataflowId}.\nHTTP status: ${res.status}`
									);
								}
							})
							.catch((error) => {
								alert(
									`Failed to update DataFlow ${dataflowId}.\nError: ${error.message}`
								);
								console.error(error);
							});
					}
				} else {
					alert(
						`Failed to fetch DataFlow ${dataflowId}.\nHTTP status: ${response.status}`
					);
				}
			})
			.catch((error) => {
				alert(
					`Failed to fetch DataFlow ${dataflowId}.\nError: ${error.message}`
				);
				console.error(error);
			});
	} else {
		alert(
			'This bookmarklet can only be used on DataFlow URLs.\nPlease navigate to a valid DataFlow URL and try again.'
		);
	}
})();
