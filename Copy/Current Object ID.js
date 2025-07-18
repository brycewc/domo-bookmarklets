javascript: (() => {
	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	let objectType;
	let text;
	const url = window.location.href;
	let parts;
	switch (true) {
		case url.includes('alerts'):
			objectType = 'ALERT';
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('kpis'):
			objectType = 'CARD';
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('pages'):
			objectType = 'PAGE';
			parts = url.split('/');
			text = parts[parts.indexOf('pages') + 1];
			break;
		case url.includes('page'):
			objectType = 'PAGE';
			parts = url.split('/');
			text = parts[parts.indexOf('page') + 1];
			break;
		case url.includes('beastmode'):
			objectType = 'BEAST_MODE';
			text = url.substring(url.lastIndexOf('id=') + 3);
			break;
		case url.includes('datasources'):
			objectType = 'DATA_SOURCE';
			parts = url.split('/');
			text = parts[parts.indexOf('datasources') + 1];
			break;
		case url.includes('dataflows'):
			objectType = 'DATAFLOW_TYPE';
			parts = url.split('/');
			text = parts[parts.indexOf('dataflows') + 1];
			break;
		case url.includes('people/'):
			objectType = 'USER';
			parts = url.split(/[/?]/);
			text = parts[parts.indexOf('people') + 1];
			break;
		case url.includes('/up/'):
			objectType = 'USER';
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('groups/'):
			objectType = 'GROUP';
			parts = url.split(/[/?]/);
			text = parts[parts.indexOf('groups') + 1];
			break;
		case url.includes('workflows'):
			objectType = 'WORKFLOW_MODEL';
			parts = url.split('/');
			text = parts[parts.indexOf('models') + 1];
			break;
		case url.includes('codeengine'):
			objectType = 'CODEENGINE_PACKAGE';
			parts = url.split('/');
			text = parts[parts.indexOf('codeengine') + 1];
			break;
		case url.includes('appDb'):
			objectType = 'COLLECTION';
			parts = url.split('/');
			text = parts[parts.indexOf('appDb') + 1];
			break;
		case url.includes('assetlibrary'):
			objectType = 'APP';
			parts = url.split('/');
			text = parts[parts.indexOf('assetlibrary') + 1];
			break;
		case url.includes('datacenter/filesets'):
			objectType = 'FILESET';
			parts = url.split('/');
			text = parts[parts.indexOf('filesets') + 1];
			break;
		case url.includes('ai-services/projects'):
			objectType = 'AI_PROJECT';
			parts = url.split('/');
			text = parts[parts.indexOf('projects') + 1];
			break;
		case url.includes('ai-services/models'):
			objectType = 'AI_MODEL';
			parts = url.split(/[/?=&]/);
			text = parts[parts.lastIndexOf('model') + 1];
			break;
		case url.includes('taskId'):
			objectType = 'PROJECT_TASK';
			parts = url.split(/[/?=&]/);
			text = parts[parts.indexOf('taskId') + 1];
			break;
		case url.includes('project'):
			objectType = 'PROJECT';
			parts = url.split('/');
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('goals/profile'):
			objectType = 'GOAL';
			parts = url.split('/');
			text = parts[parts.lastIndexOf('goal') + 1];
			break;
		case url.includes('goals'):
			objectType = 'GOAL';
			parts = url.split('/');
			text = parts[parts.indexOf('goals') + 1];
			break;
		case url.includes('queues'):
			objectType = 'QUEUE';
			parts = url.split(/[/?=&]/);
			text = parts[parts.indexOf('queueId') + 1];
			break;
		case url.includes('approval/request-details'):
			objectType = 'APPROVAL';
			parts = url.split('/');
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('jupyter-workspaces'):
			objectType = 'DATA_SCIENCE_NOTEBOOK';
			parts = url.split('/');
			text = parts[parts.indexOf('jupyter-workspaces') + 1];
			break;
		case url.includes('domo-everywhere/publications'):
			objectType = 'PUBLICATION';
			parts = url.split(/[/?=&]/);
			text = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('sandbox/repositories'):
			objectType = 'REPOSITORY';
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		default:
			alert(
				"This bookmarklet doesn't support this page. You can copy the ID manually from the URL or add support for this page by editing the bookmarklet code."
			);
			throw new Error('Object type not recognized.');
	}

	navigator.clipboard.writeText(text);

	let element = document.createElement('div');
	element.setAttribute(
		'style',
		// Centered horizontally at the top of the screen
		'position:fixed;top:0px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:1000;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
	);
	element.innerHTML = `Copied ${objectType} ID: ${text}<div id="countdown" style="position:absolute;bottom:0;left:0;height:5px;background-color:#155724;width:100%;"></div>`;

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
