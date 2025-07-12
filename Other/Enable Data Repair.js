javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	window.open(`${window.location.href}?_f=dataRepair`, '_self');
})();
