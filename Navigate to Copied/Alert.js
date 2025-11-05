javascript: (() => {
	navigator.clipboard.readText().then((text) => {
		Object.assign(document.createElement('a'), {
			target: '_blank',
			rel: 'noopener noreferrer',
			href: `${location.origin}/alerts/${text}`
		}).click();
	});
})();
