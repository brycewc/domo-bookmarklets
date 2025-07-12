javascript: (() => {
	navigator.clipboard.readText().then((text) => {
		Object.assign(document.createElement('a'), {
			target: '_blank',
			rel: 'noopener noreferrer',
			href: `https://${window.location.hostname}/admin/groups/${text}?tab=people`
		}).click();
	});
})();
