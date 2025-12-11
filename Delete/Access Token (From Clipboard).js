javascript: (() => {
	navigator.clipboard.readText().then((accessTokenId) => {
		// Validate UUID format (36 characters: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
		const uuidPattern =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		if (!uuidPattern.test(accessTokenId)) {
			alert(
				`Invalid access token ID. Expected a UUID but got: ${accessTokenId}`
			);
			throw new Error('Access token ID is not a valid UUID.');
		}

		if (
			confirm(`Are you sure you want to revoke access token ${accessTokenId}?`)
		) {
			fetch(`${location.origin}/api/data/v1/accesstokens/${accessTokenId}`, {
				method: 'DELETE'
			})
				.then((response) => {
					if (response.ok) {
						let element = document.createElement('div');
						element.setAttribute(
							'style',
							'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
						);
						element.innerHTML = `Access token ${accessTokenId} revoked successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
						}, 20);
					} else {
						alert(
							`Error revoking access token ${accessTokenId}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Error revoking access token ${accessTokenId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	});
})();
