javascript: (() => {
	navigator.clipboard.readText().then((text) => {
		Object.assign(document.createElement('a'), {
			target: '_blank',
			rel: 'noopener noreferrer',
			href: `${location.origin}/approval/request-details/${text}?tabSelected=details`
		}).click();
	});
})();
