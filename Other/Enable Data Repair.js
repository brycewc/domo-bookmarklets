javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	let url = window.location.href;
	if (!url.includes('datasources/')) {
		alert(
			'This bookmarklet can only be used on DataSet URLs.\nPlease navigate to a valid DataSet URL and try again.'
		);
		throw new Error('This bookmarklet can only be used on DataSet URLs.');
	}
	url = new URL(url);
	url.searchParams.set('_f', 'dataRepair');
	window.open(url.href, '_self');
})();
