javascript: (() => {
	let text;
	const url = window.location.href;
	var parts;
	switch (true) {
		case url.includes('alerts'):
			objectType = 'ALERT';
			text = url.substring(url.lastIndexOf('/') + 1);
			break;
		case url.includes('kpis'):
			objectType = 'CARD';
			text = url.substring(url.lastIndexOf('/') + 1);
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
			return;
	}
	// console.log(`Copying ${objectType} ID: ${text}`);
	var element = document.createElement('div');
	element.setAttribute(
		'style',
		'position:absolute;top:0;left:0;background-color:white;z-index:1000;padding:10px;border:1px solid black;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);'
	);
	element.innerHTML = `Copied ${objectType} ID: ${text}`;
	setTimeout(() => {
		element.parentNode.removeChild(element);
	}, 2000);
	document.body.appendChild(element);
	navigator.clipboard.writeText(text);
})();
