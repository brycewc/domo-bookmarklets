javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	let url = new URL(window.location.href);
	url.searchParams.set('_f', 'dataRepair');
	window.open(url.href, '_self');
})();
