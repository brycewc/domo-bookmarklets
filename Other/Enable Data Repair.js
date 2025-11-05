javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	if (!location.pathname.includes('datasources/')) {
		alert(
			'This bookmarklet can only be used on DataSet URLs.\nPlease navigate to a valid DataSet URL and try again.'
		);
		throw new Error('This bookmarklet can only be used on DataSet URLs.');
	}

	// Extract dataset ID from the URL
	const parts = location.pathname.split('/');
	const datasetId = parts[parts.indexOf('datasources') + 1];

	// Navigate to the data-repair page
	const dataRepairUrl = `${location.origin}/datasources/${datasetId}/details/data-repair?_f=dataRepair`;
	open(dataRepairUrl, '_self');
})();
