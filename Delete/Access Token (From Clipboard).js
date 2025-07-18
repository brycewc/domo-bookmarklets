javascript: (() => {
	navigator.clipboard.readText().then((text) => {
		if (confirm(`Are you sure you want to revoke Access Token ${text}?`)) {
			fetch(
				`https://${window.location.hostname}/api/data/v1/accesstokens/${text}`,
				{
					method: 'DELETE'
				}
			)
				.then((response) => {
					if (response.ok) {
						let element = document.createElement('div');
						element.setAttribute(
							'style',
							'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:1000;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
						);
						element.innerHTML = `Access Token ${text} revoked successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
						}, 30); // Adjust the interval time to match the total duration
					} else {
						alert(
							`Error revoking Access Token ${text}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Error revoking Access Token ${text}.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	});
})();
