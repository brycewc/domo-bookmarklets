javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('appDb/')) {
		const parts = url.split(/[/?=&]/);
		const collectionId = parts[parts.indexOf('appDb') + 1];
		if (
			confirm(
				`Are you sure you want to delete AppDB Collection ${collectionId}?`
			)
		) {
			fetch(
				`${location.origin}/api/datastores/v1/collections/${collectionId}`,
				{
					method: 'DELETE'
				}
			)
				.then((response) => {
					if (response.ok) {
						let element = document.createElement('div');
						element.setAttribute(
							'style',
							'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
						);
						element.innerHTML = `AppDB Collection ${collectionId} deleted successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

						document.body.appendChild(element);

						let countdown = document.getElementById('countdown');
						let width = 100;
						let interval = setInterval(function () {
							width--;
							countdown.style.width = width + '%';
							if (width <= 0) {
								clearInterval(interval);
								element.parentNode.removeChild(element);
								open(`${location.origin}/appDb`, '_self');
							}
						}, 15);
					} else {
						alert(
							`Error deleting AppDB Collection ${collectionId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Error deleting AppDB Collection ${collectionId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	} else {
		alert(
			'This bookmarklet can only be used on AppDB Collection URLs.\nPlease navigate to a valid AppDB Collection URL and try again.'
		);
	}
})();
