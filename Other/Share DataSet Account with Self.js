javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	const url = window.location.href;
	if (url.includes('datasources/')) {
		let userId = window.bootstrap.currentUser.USER_ID || null;
		if (!userId) {
			userId = await fetch(
				`https://${window.location.hostname}/api/sessions/v1/me`
			).then(async (res) => {
				if (res.ok) {
					const user = await res.json();
					return user.userId || null;
				} else {
					alert(`Failed to fetch current user ID.\nHTTP status: ${res.status}`);
					throw new Error(
						`Failed to fetch current user ID.\nHTTP status: ${res.status}`
					);
				}
			});
		}
		if (userId) {
			const parts = url.split(/[/?=&]/);
			const datasetId = parts[parts.indexOf('datasources') + 1];
			fetch(
				`https://${window.location.hostname}/api/data/v3/datasources/${datasetId}?includeAllDetails=true`,
				{
					method: 'GET'
				}
			)
				.then(async (datasetResponse) => {
					if (datasetResponse.ok) {
						const dataset = await datasetResponse.json();
						if (dataset.type !== 'dataflow') {
							const accountId = dataset.accountId;
							fetch(
								`https://${window.location.hostname}/api/data/v2/accounts/share/${accountId}`,
								{
									method: 'PUT',
									headers: {
										'Content-Type': 'application/json'
									},
									body: JSON.stringify({
										type: 'USER',
										id: userId,
										accessLevel: 'CAN_VIEW'
									})
								}
							)
								.then((shareResponse) => {
									if (shareResponse.ok) {
										let element = document.createElement('div');
										element.setAttribute(
											'style',
											// Centered horizontally at the top of the screen
											'position:fixed;top:0px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);pointer-events:none;'
										);
										element.innerHTML = `Account ${accountId} shared successfully<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

										document.body.appendChild(element);

										let countdown = document.getElementById('countdown');
										let width = 100;
										let interval = setInterval(function () {
											width--;
											countdown.style.width = width + '%';
											if (width <= 0) {
												clearInterval(interval);
												element.parentNode.removeChild(element);
												window.location.reload();
											}
										}, 30);
									} else {
										alert(
											`Failed to share Account ${accountId} with User ${userId}.\nHTTP status: ${shareResponse.status}`
										);
									}
								})
								.catch((error) => {
									alert(
										`Failed to share Account ${accountId} with User ${userId}.\nError: ${error.message}`
									);
									console.error(error);
								});
						} else {
							alert(
								`DataSet ${datasetId} is a dataflow output and therefore does not have an account to share.`
							);
						}
					} else {
						alert(
							`Failed to fetch DataSet ${datasetId}.\nHTTP status: ${datasetResponse.status}`
						);
					}
				})
				.catch((error) => {
					alert(
						`Failed to fetch DataSet ${datasetId}.\nError: ${error.message}`
					);
					console.error(error);
				});
		} else {
			alert('Failed to fetch current user ID. Please try again later.');
		}
	} else {
		alert(
			'This bookmarklet can only be used on DataSet URLs.\nPlease navigate to a valid DataSet URL and try again.'
		);
	}
})();
