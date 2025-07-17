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
						alert(`Access Token ${text} revoked successfully.`);
					} else {
						alert(
							`Error revoking Access Token ${text}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) =>
					alert(`Error revoking Access Token ${text}.\nError: ${error.message}`)
				);
		}
	});
})();
