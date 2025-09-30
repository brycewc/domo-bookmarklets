javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('beastmode?')) {
		const parts = url.split(/[/?=&]/);
		const beastModeId = parts[parts.indexOf('id') + 1];
		if (confirm(`Are you sure you want to delete Beast Mode ${beastModeId}?`)) {
			fetch(
				`https://${window.location.hostname}/api/query/v1/functions/template/${beastModeId}`,
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
						element.innerHTML = `Beast Mode ${beastModeId} deleted successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
							`Error deleting Beast Mode ${beastModeId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Error deleting Beast Mode ${beastModeId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	} else {
		alert(
			'This bookmarklet can only be used on Beast Mode URLs.\nPlease navigate to a valid Beast Mode URL and try again.'
		);
	}
})();
