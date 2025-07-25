javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	let objectType;
	let id;
	const url = window.location.href;
	const parts = url.split(/[/?=&]/);
	switch (true) {
		case url.includes('alerts'):
			objectType = 'ALERT';
			id = parts[parts.indexOf('alerts') + 1];
			break;
		case url.includes('kpis'):
			objectType = 'CARD';
			id = parts[parts.indexOf('details') + 1];
			break;
		case url.includes('pages'):
			objectType = 'DATA_APP_VIEW';
			id = parts[parts.indexOf('pages') + 1];
			break;
		case url.includes('page'):
			objectType = 'PAGE';
			id = parts[parts.indexOf('page') + 1];
			break;
		case url.includes('beastmode'):
			objectType = 'BEAST_MODE';
			id = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('datasources'):
			objectType = 'DATA_SOURCE';
			id = parts[parts.indexOf('datasources') + 1];
			break;
		case url.includes('dataflows'):
			objectType = 'DATAFLOW_TYPE';
			id = parts[parts.indexOf('dataflows') + 1];
			break;
		case url.includes('people/'):
			objectType = 'USER';
			id = parts[parts.indexOf('people') + 1];
			break;
		case url.includes('/up/'):
			objectType = 'USER';
			id = parts[parts.indexOf('up') + 1];
			break;
		case url.includes('groups/'):
			objectType = 'GROUP';
			id = parts[parts.indexOf('groups') + 1];
			break;
		case url.includes('workflows'):
			objectType = 'WORKFLOW_MODEL';
			id = parts[parts.indexOf('models') + 1];
			break;
		case url.includes('codeengine'):
			objectType = 'CODEENGINE_PACKAGE';
			id = parts[parts.indexOf('codeengine') + 1];
			break;
		case url.includes('appDb'):
			objectType = 'COLLECTION';
			id = parts[parts.indexOf('appDb') + 1];
			break;
		case url.includes('assetlibrary'):
			objectType = 'APP';
			id = parts[parts.indexOf('assetlibrary') + 1];
			break;
		case url.includes('datacenter/filesets'):
			objectType = 'FILESET';
			id = parts[parts.indexOf('filesets') + 1];
			break;
		case url.includes('ai-services/projects'):
			objectType = 'AI_PROJECT';
			id = parts[parts.indexOf('projects') + 1];
			break;
		case url.includes('ai-services/models'):
			objectType = 'AI_MODEL';
			id = parts[parts.lastIndexOf('model') + 1];
			break;
		case url.includes('taskId'):
			objectType = 'PROJECT_TASK';
			id = parts[parts.indexOf('taskId') + 1];
			break;
		case url.includes('project'):
			objectType = 'PROJECT';
			id = parts[parts.indexOf('project') + 1];
			break;
		case url.includes('goals/profile'):
			objectType = 'GOAL';
			id = parts[parts.indexOf('goal') + 1];
			break;
		case url.includes('goals'):
			objectType = 'GOAL';
			id = parts[parts.indexOf('goals') + 1];
			break;
		case url.includes('queues'):
			objectType = 'QUEUE';
			id = parts[parts.indexOf('queueId') + 1];
			break;
		case url.includes('approval/request-details'):
			objectType = 'APPROVAL';
			id = parts[parts.indexOf('request-details') + 1];
			break;
		case url.includes('jupyter-workspaces'):
			objectType = 'DATA_SCIENCE_NOTEBOOK';
			id = parts[parts.indexOf('jupyter-workspaces') + 1];
			break;
		case url.includes('domo-everywhere/publications'):
			objectType = 'PUBLICATION';
			id = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('sandbox/repositories'):
			objectType = 'REPOSITORY';
			id = parts[parts.indexOf('repositories') + 1];
			break;
		default:
			alert(
				"This bookmarklet doesn't support this page. You can copy the ID manually from the URL or add support for this page by editing the bookmarklet code."
			);
			throw new Error('Object type not recognized.');
	}

	navigator.clipboard.writeText(id);

	let element = document.createElement('div');
	element.setAttribute(
		'style',
		// Centered horizontally at the top of the screen
		'position:fixed;top:0px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:1000;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
	);
	element.innerHTML = `Copied ${objectType} ID: ${id}<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
})();
