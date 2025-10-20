javascript: (async () => {
	if (!window.location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}

	const url = window.location.href;
	let userId = window.bootstrap.currentUser.USER_ID || null;

	// Get user ID if not available from bootstrap
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

	if (!userId) {
		alert('Failed to fetch current user ID. Please try again later.');
		return;
	}

	function showSuccess(message, reload = true) {
		let element = document.createElement('div');
		element.setAttribute(
			'style',
			'position:fixed;top:0px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);pointer-events:none;'
		);
		element.innerHTML = `${message}<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

		document.body.appendChild(element);

		if (reload) {
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
			}, 20);
		}
	}

	function showError(message) {
		alert(message);
	}

	const parts = url.split(/[/?=&]/);

	switch (true) {
		case url.includes('datasources/'):
			// Share DataSet Account with Self
			const datasetId = parts[parts.indexOf('datasources') + 1];

			try {
				const datasetResponse = await fetch(
					`https://${window.location.hostname}/api/data/v3/datasources/${datasetId}?includeAllDetails=true`,
					{ method: 'GET' }
				);

				if (!datasetResponse.ok) {
					showError(
						`Failed to fetch DataSet ${datasetId}.\nHTTP status: ${datasetResponse.status}`
					);
					return;
				}

				const dataset = await datasetResponse.json();

				if (dataset.type === 'dataflow') {
					showError(
						`DataSet ${datasetId} is a DataFlow output and therefore does not have an account to share.`
					);
					return;
				}

				const accountId = dataset.accountId;
				const shareResponse = await fetch(
					`https://${window.location.hostname}/api/data/v2/accounts/share/${accountId}`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: 'USER',
							id: userId,
							accessLevel: 'CAN_VIEW'
						})
					}
				);

				if (shareResponse.ok) {
					showSuccess(`Account ${accountId} shared successfully`);
				} else {
					showError(
						`Failed to share Account ${accountId} with User ${userId}.\nHTTP status: ${shareResponse.status}`
					);
				}
			} catch (error) {
				showError(`Failed to share DataSet account.\nError: ${error.message}`);
				console.error(error);
			}
			break;

		case url.includes('assetlibrary/') || url.includes('pro-code-editor/'):
			// Share Custom App Design with Self
			const uriPart = url.includes('assetlibrary')
				? 'assetlibrary'
				: 'pro-code-editor';
			const appDesignId = parts[parts.indexOf(uriPart) + 1];

			try {
				const response = await fetch(
					`https://${window.location.hostname}/api/apps/v1/designs/${appDesignId}/permissions/ADMIN`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify([userId])
					}
				);

				if (response.ok) {
					showSuccess(`App Design ${appDesignId} shared successfully`);
				} else {
					showError(
						`Failed to share custom app design ${appDesignId}.\nHTTP status: ${response.status}`
					);
				}
			} catch (error) {
				showError(
					`Failed to share custom app design.\nError: ${error.message}`
				);
				console.error(error);
			}
			break;

		case url.includes('page/') || url.includes('pages/'):
			// Share Page with Self
			const pageId = url.includes('app-studio')
				? parts[parts.indexOf('pages') + 1]
				: parts[parts.indexOf('page') + 1];

			try {
				const response = await fetch(
					`https://${window.location.hostname}/api/content/v1/share?sendEmail=false`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							resources: [{ type: 'page', id: pageId }],
							recipients: [
								{ type: 'user', id: userId, permission: 'HAS_ACCESS' }
							]
						})
					}
				);

				if (response.ok) {
					showSuccess(`Page ${pageId} shared successfully`);
				} else {
					showError(
						`Failed to share page ${pageId}.\nHTTP status: ${response.status}`
					);
				}
			} catch (error) {
				showError(`Failed to share page.\nError: ${error.message}`);
				console.error(error);
			}
			break;

		default:
			showError(
				'This script only works on a DataSet, Custom App Design, or Page URLs.'
			);
	}
})();
