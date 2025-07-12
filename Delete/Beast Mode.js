javascript: (() => {
	const url = window.location.href;
	if (url.includes('beastmode')) {
		const id = url.substring(url.lastIndexOf('id=') + 3);
		fetch(
			`https://${window.location.hostname}/api/query/v1/functions/template/${id}`,
			{
				method: 'DELETE'
			}
		)
			.then((response) => {
				if (response.ok) {
					alert(`Beast Mode ${id} deleted successfully.`);
				}
			})
			.catch((error) =>
				alert(`Error deleting Beast Mode ${id}: ` + error.message)
			);
	} else {
		alert('This bookmarklet can only be used on Beast Mode URLs.');
	}
})();
