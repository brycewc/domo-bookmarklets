javascript: (async () => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = location.href;
	if (url.includes('assetlibrary/')) {
		const parts = url.split(/[/?=&]/);
		const appDesignId = parts[parts.indexOf('assetlibrary') + 1];
		if (
			confirm(
				`Are you sure you want to delete custom app design ${appDesignId}?`
			)
		) {
			fetch(`${location.origin}/api/apps/v1/designs/${appDesignId}`, {
				method: 'DELETE'
			})
				.then((response) => {
					if (response.ok) {
						let element = document.createElement('div');
						element.setAttribute(
							'style',
							'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
						);
						element.innerHTML = `Custom App Design ${appDesignId} deleted successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

						document.body.appendChild(element);

						let countdown = document.getElementById('countdown');
						let width = 100;
						let interval = setInterval(function () {
							width--;
							countdown.style.width = width + '%';
							if (width <= 0) {
								clearInterval(interval);
								element.parentNode.removeChild(element);
							}
						}, 30);
					} else {
						alert(
							`Failed to delete custom app design ${appDesignId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to delete custom app design ${appDesignId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	} else {
		alert(
			'This bookmarklet can only be used on custom app design URLs.\nPlease navigate to a valid custom app design URL and try again.'
		);
	}
})();
