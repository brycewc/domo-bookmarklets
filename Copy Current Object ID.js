javascript: (() => {
	if (!location.hostname.includes('domo.com')) {
		alert('This bookmarklet only works on *.domo.com domains.');
		throw new Error('This bookmarklet only works on *.domo.com domains.');
	}
	let objectType;
	let id;
	const url = location.href;
	const parts = url.split(/[/?=&]/);
	switch (true) {
		case url.includes('alerts/'):
			objectType = 'ALERT';
			id = parts[parts.indexOf('alerts') + 1];
			break;
		case url.includes('drillviewid='):
			objectType = 'DRILL_VIEW';
			id = parts[parts.indexOf('drillviewid') + 1];
			break;
		case url.includes('kpis/details/'): {
			// Prefer Drill Path ID from breadcrumb when on a drill path
			try {
				const bcSpan = document.querySelector(
					'ul.breadcrumb li:last-child span[id]'
				);
				const bcId = bcSpan && (bcSpan.id || bcSpan.getAttribute('id'));
				if (bcId && bcId.indexOf(':') > -1) {
					// Format: dr:<drill_path_id>:<card_id>
					const partsColon = bcId.split(':');
					const dpIdRaw = partsColon[1];
					const dpId = dpIdRaw && (dpIdRaw.match(/\d+/) || [])[0];
					if (dpId) {
						objectType = 'DRILL_VIEW';
						id = dpId;
						break;
					}
				}
			} catch (e) {
				// ignore and fall back
			}
			// Fallback: Card ID from URL
			objectType = 'CARD';
			id = parts[parts.indexOf('details') + 1];
			break;
		}
		// App Studio: Prefer Card ID from modal when open; otherwise use Page ID from URL
		case url.includes('page/'):
		case url.includes('pages/'): {
			const detailsEl = document.querySelector('cd-details-title');
			let kpiId;
			try {
				if (
					detailsEl &&
					window.angular &&
					typeof window.angular.element === 'function'
				) {
					const ngScope = window.angular.element(detailsEl).scope();
					kpiId = ngScope && ngScope.$ctrl && ngScope.$ctrl.kpiId;
				}
			} catch (e) {
				// Ignore and fallback to Page ID
			}

			if (kpiId) {
				objectType = 'CARD';
				id = kpiId;
			} else {
				objectType = url.includes('app-studio') ? 'DATA_APP_VIEW' : 'PAGE';
				id =
					objectType === 'DATA_APP_VIEW'
						? parts[parts.indexOf('pages') + 1]
						: parts[parts.indexOf('page') + 1];
			}
			break;
		}
		case url.includes('beastmode?'):
			objectType = 'BEAST_MODE_FORMULA';
			id = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('datasources/'):
			objectType = 'DATA_SOURCE';
			id = parts[parts.indexOf('datasources') + 1];
			break;
		case url.includes('dataflows/'):
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
		case url.includes('admin/roles/'):
			objectType = 'ROLE';
			id = parts[parts.indexOf('roles') + 1];
			break;
		case url.includes('instances/') && parts.length >= 8:
			objectType = 'WORKFLOW_INSTANCE';
			id = parts[parts.length - 1];
			break;
		case url.includes('workflows/'):
			objectType = 'WORKFLOW_MODEL';
			id = parts[parts.indexOf('workflows') + 2];
			break;
		case url.includes('codeengine/'):
			objectType = 'CODEENGINE_PACKAGE';
			id = parts[parts.indexOf('codeengine') + 1];
			break;
		case url.includes('appDb/'):
			objectType = 'MAGNUM_COLLECTION';
			id = parts[parts.indexOf('appDb') + 1];
			break;
		case url.includes('assetlibrary/'):
			objectType = 'APP';
			id = parts[parts.indexOf('assetlibrary') + 1];
			break;
		case url.includes('pro-code-editor/'):
			objectType = 'APP';
			id = parts[parts.indexOf('pro-code-editor') + 1];
			break;
		case url.includes('datacenter/filesets/'):
			objectType = 'FILESET';
			id = parts[parts.indexOf('filesets') + 1];
			break;
		case url.includes('ai-services/projects/'):
			objectType = 'AI_PROJECT';
			id = parts[parts.indexOf('projects') + 1];
			break;
		case url.includes('ai-services/models/'):
			objectType = 'AI_MODEL';
			id = parts[parts.lastIndexOf('model') + 1];
			break;
		case url.includes('taskId='):
			objectType = 'PROJECT_TASK';
			id = parts[parts.indexOf('taskId') + 1];
			break;
		case url.includes('project/'):
			objectType = 'PROJECT';
			id = parts[parts.indexOf('project') + 1];
			break;
		case url.includes('key-results/'):
			objectType = 'KEY_RESULT';
			id = parts[parts.indexOf('key-results') + 1];
			break;
		case url.includes('goals/profile/user/') && url.includes('/goal/'):
			objectType = 'OBJECTIVE';
			id = parts[parts.indexOf('goal') + 1];
			break;
		case url.includes('goals/profile/user/'):
			objectType = 'USER';
			id = parts[parts.indexOf('user') + 1];
			break;
		case url.includes('goals/tree/'):
			objectType = 'OBJECTIVE';
			id = parts[parts.indexOf('tree') + 1];
			break;
		case url.includes('goals/profile/'):
			objectType = 'OBJECTIVE';
			id = parts[parts.indexOf('goal') + 1];
			break;
		case url.includes('goals/'):
			objectType = 'OBJECTIVE';
			id = parts[parts.indexOf('goals') + 1];
			break;
		case url.includes('queues') && url.includes('id='):
			objectType = 'HOPPER_TASK';
			id = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('queueId='):
			objectType = 'HOPPER_QUEUE';
			id = parts[parts.indexOf('queueId') + 1];
			break;
		case url.includes('approval/request-details/'):
			objectType = 'APPROVAL';
			id = parts[parts.indexOf('request-details') + 1];
			break;
		case url.includes('approval/edit-request-form/'):
			objectType = 'TEMPLATE';
			id = parts[parts.indexOf('edit-request-form') + 1];
			break;
		case url.includes('jupyter-workspaces/'):
			objectType = 'DATA_SCIENCE_NOTEBOOK';
			id = parts[parts.indexOf('jupyter-workspaces') + 1];
			break;
		case url.includes('domo-everywhere/publications'):
			objectType = 'PUBLICATION';
			id = parts[parts.indexOf('id') + 1];
			break;
		case url.includes('sandbox/repositories/'):
			objectType = 'REPOSITORY';
			id = parts[parts.indexOf('repositories') + 1];
			break;
		case url.includes('filesets/'):
			objectType.push('FILESET');
			id = parts[parts.indexOf('filesets') + 1];
			break;
		default:
			alert(
				'Object type not supported. Make sure you are on a valid page and try again.'
			);
			throw new Error('Object type not recognized.');
	}

	navigator.clipboard.writeText(id);

	let element = document.createElement('div');
	element.setAttribute(
		'style',
		// Centered horizontally at the top of the screen
		'position:fixed;top:0px;left:50%;transform:translateX(-50%);background-color:#d4edda;color:#155724;z-index:2147483647;padding:10px;border:1px solid #c3e6cb;border-radius:5px;font-family:sans-serif;font-size:16px;box-shadow:0 0 10px rgba(0,0,0,0.1);pointer-events:none;'
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
	}, 20);
})();
