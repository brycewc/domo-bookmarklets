javascript: (() => {
	const url = window.location.href;
	if (url.includes('beastmode')) {
		const id = url.substring(url.lastIndexOf('id=') + 3);
		if (confirm(`Are you sure you want to delete Beast Mode ${id}?`)) {
			fetch(
				`https://${window.location.hostname}/api/query/v1/functions/template/${id}`,
				{
					method: 'DELETE'
				}
			)
				.then((response) => {
					if (response.ok) {
						alert(`Beast Mode ${id} deleted successfully.`);
					} else {
						alert(
							`Error deleting Beast Mode ${id}.\nHTTP status: ${response.status}`
						);
					}
				})
				.catch((error) =>
					alert(`Error deleting Beast Mode ${id}.\nError: ${error.message}`)
				);
		}
	} else {
		alert(
			'This bookmarklet can only be used on Beast Mode URLs.\nPlease navigate to a valid Beast Mode URL and try again.'
		);
	}
})();
