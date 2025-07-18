javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;

	if (url.includes('page')) {
		const parts = url.split('/');
		const pageId = parts[parts.indexOf('page') + 1];
		const response = fetch(`/api/content/v3/stacks/${pageId}/cards`, {
			method: 'GET'
		});
		if (
			confirm(
				`Are you sure you want to delete Page ${pageId} and all its cards?`
			)
		) {
			response
				.then(async (res) => {
					if (res.ok) {
						const page = await res.json();
						const cardIds = page.cards.map((card) => card.id).join(',');

						fetch(`/api/content/v1/cards/bulk?cardIds=${cardIds}`, {
							method: 'DELETE'
						})
							.then((response) => {
								if (response.ok) {
									fetch(`/api/content/v1/pages/${pageId}`, {
										method: 'DELETE'
									})
										.then((response) => {
											if (response.ok) {
												let element = document.createElement('div');
												element.setAttribute(
													'style',
													'position:absolute;top:0;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:1000;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
												);
												element.innerHTML = `Page ${pageId} and all ${page.cards.length} Cards were deleted successfully.<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
												window.location.reload();
											} else {
												alert(
													`Failed to delete Page ${pageId}. All ${page.cards.length} Cards were deleted successfully.\nHTTP status: ${response.status}`
												);
											}
										})
										.catch((error) => {
											alert(
												`Failed to delete Page ${pageId}. All ${page.cards.length} Cards were deleted successfully.\nError: ${error.message}`
											);
											console.error(error);
										});
								} else {
									alert(
										`Failed to delete Cards for Page ${pageId}. Page will not be deleted.\nHTTP status: ${response.status}`
									);
								}
							})
							.catch((error) => {
								alert(
									`Failed to delete Cards for Page ${pageId}. Page will not be deleted.\nError: ${error.message}`
								);
								console.error(error);
							});
					} else {
						alert(
							`Failed to fetch Cards for Page ${pageId}. Page and Cards will not be deleted.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to fetch Cards for Page ${pageId}. Page and Cards will not be deleted.\nError: ${error.message}`
					);
					console.error(error);
				});
		}
	} else {
		alert(
			'This bookmarklet can only be used on Page URLs.\nPlease navigate to a valid Page URL and try again.'
		);
	}
})();
