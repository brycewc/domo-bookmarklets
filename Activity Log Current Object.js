javascript: (() => {
	function setActivityLogConfig(cfg, storageKey, instanceLabel) {
		try {
			localStorage.setItem(storageKey, JSON.stringify(cfg));
			// Optional: let power users know how to reset
			console.info(
				`Saved activity log settings for instance "${instanceLabel}". To reset, run: localStorage.removeItem('${storageKey}')`
			);
		} catch (e) {
			console.warn('Failed to save activity log settings to localStorage:', e);
		}
	}

	// Persist simple configuration per subdomain (portion before `.domo.com`) so users only enter it once
	async function getActivityLogConfig() {
		const host = window.location.hostname.toLowerCase();
		const rootSuffix = '.domo.com';
		const subdomain = host.endsWith(rootSuffix)
			? host.slice(0, -rootSuffix.length) // everything before `.domo.com`
			: host;
		const storageKey = `domo-bookmarklet-activity-log:${subdomain}`;
		let cfg = null;
		try {
			cfg = JSON.parse(localStorage.getItem(storageKey) || 'null');
		} catch (_) {
			cfg = null;
		}

		if (!cfg || !cfg.cardId || !cfg.objectIdColumn || !cfg.objectTypeColumn) {
			// First-time (or incomplete) setup: prompt for values
			const cardIdInput = prompt(
				"This bookmarklet requires a card built on activity log data, since DataSets don't support pfilters. The card must contain an object ID column and an object type column but doesn't have to be the raw DomoStats DataSet. This information will be saved in your browser's local storage so you don't have to enter it again.\n\nFirst, enter your activity log card ID:",
				cfg && cfg.cardId ? String(cfg.cardId) : ''
			);
			if (!cardIdInput) {
				alert('Activity log card ID is required.');
				throw new Error('Missing activity log card ID');
			}
			const cardId = parseInt(cardIdInput);
			if (!Number.isFinite(cardId) || cardId <= 0) {
				alert('Activity log card ID must be a positive integer.');
				throw new Error('Invalid activity log card ID');
			}
			try {
				const response = await fetch(
					`https://${window.location.hostname}/api/content/v1/cards?urns=${cardId}&parts=datasources`,
					{ method: 'GET' }
				);
				if (response.ok) {
					const data = await response.json();
					if (data && data.length > 0) {
						const ds = data[0].datasources && data[0].datasources[0];
						if (ds && ds.providerType === 'domostats') {
							cfg = {
								cardId,
								objectIdColumn: 'Object_ID',
								objectTypeColumn: 'Object_Type'
							};
							setActivityLogConfig(cfg, storageKey, subdomain);
							return cfg;
						}
					}
				}
				// If non-OK, fall through to prompt path without throwing
			} catch (e) {
				// Network or fetch error: continue to prompt path
			}

			const objectIdColumn = prompt(
				'Next, enter the object ID column name, as it appears in the DataSet powering your activity log card:',
				(cfg && cfg.objectIdColumn) || 'Object_ID'
			);
			if (!objectIdColumn) {
				alert('Object ID column name is required.');
				throw new Error('Missing object ID column name');
			}

			const objectTypeColumn = prompt(
				'Last, enter the object type column name, as it appears in the DataSet powering your activity log card. Make sure it matches DomoStats formatting (e.g., DATA_SOURCE, DRILL_VIEW, etc.):',
				(cfg && cfg.objectTypeColumn) || 'Object_Type'
			);
			if (!objectTypeColumn) {
				alert('Object type column name is required.');
				throw new Error('Missing object type column name');
			}

			cfg = { cardId, objectIdColumn, objectTypeColumn };
			setActivityLogConfig(cfg, storageKey, subdomain);
		}

		return cfg;
	}

	if (!window.location.hostname.includes('domo.com')) {
		throw new Error('This bookmarklet only works on *.domo.com.');
	}

	getActivityLogConfig()
		.then(
			({
				cardId: activityLogCardId,
				objectIdColumn: activityLogObjectIdColumnName,
				objectTypeColumn: activityLogObjectTypeColumnName
			}) => {
				let objectType;
				let id;
				const url = window.location.href;
				const parts = url.split(/[/?=&]/);
				switch (true) {
					case url.includes('alerts'):
						objectType = 'ALERT';
						id = parts[parts.indexOf('alerts') + 1];
						break;
					case url.includes('drillviewid='):
						objectType = 'DRILL_VIEW';
						id = parts[parts.indexOf('drillviewid') + 1];
						break;
					case url.includes('kpis'): {
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
					case url.includes('page'): {
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
							objectType = url.includes('app-studio')
								? 'DATA_APP_VIEW'
								: 'PAGE';
							id =
								objectType === 'DATA_APP_VIEW'
									? parts[parts.indexOf('pages') + 1]
									: parts[parts.indexOf('page') + 1];
						}
						break;
					}
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
					case url.includes('admin/roles') && !url.includes('tab=roles'):
						objectType = 'ROLE';
						id = parts[parts.indexOf('roles') + 1];
						break;
					case url.includes('instances') && parts.length >= 8:
						objectType = 'WORKFLOW_INSTANCE';
						id = parts[parts.length - 1];
						break;
					case url.includes('workflows'):
						objectType = 'WORKFLOW_MODEL';
						id = parts[parts.indexOf('workflows') + 2];
						break;
					case url.includes('codeengine'):
						objectType = 'CODEENGINE_PACKAGE';
						id = parts[parts.indexOf('codeengine') + 1];
						break;
					case url.includes('appDb'):
						objectType = 'MAGNUM_COLLECTION';
						id = parts[parts.indexOf('appDb') + 1];
						break;
					case url.includes('assetlibrary'):
						objectType = 'APP';
						id = parts[parts.indexOf('assetlibrary') + 1];
						break;
					case url.includes('pro-code-editor'):
						objectType = 'APP';
						id = parts[parts.indexOf('pro-code-editor') + 1];
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
					case url.includes('key-results'):
						objectType = 'KEY_RESULT';
						id = parts[parts.indexOf('key-results') + 1];
						break;
					case url.includes('goals/profile/user') && url.includes('/goal/'):
						objectType = 'GOAL';
						id = parts[parts.indexOf('goal') + 1];
						break;
					case url.includes('goals/profile/user'):
						objectType = 'USER';
						id = parts[parts.indexOf('user') + 1];
						break;
					case url.includes('goals/tree'):
						objectType = 'GOAL';
						id = parts[parts.indexOf('tree') + 1];
						break;
					case url.includes('goals/profile'):
						objectType = 'GOAL';
						id = parts[parts.indexOf('goal') + 1];
						break;
					case url.includes('goals'):
						objectType = 'GOAL';
						id = parts[parts.indexOf('goals') + 1];
						break;
					case url.includes('queues') && url.includes('&id='):
						objectType = 'HOPPER_TASK';
						id = parts[parts.indexOf('id') + 1];
						break;
					case url.includes('queueId'):
						objectType = 'HOPPER_QUEUE';
						id = parts[parts.indexOf('queueId') + 1];
						break;
					case url.includes('approval/request-details'):
						objectType = 'APPROVAL';
						id = parts[parts.indexOf('request-details') + 1];
						break;
					case url.includes('approval/edit-request-form'):
						objectType = 'TEMPLATE';
						id = parts[parts.indexOf('edit-request-form') + 1];
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
						alert('Object type not supported.');
						throw new Error('Object type not recognized.');
				}

				const pfilters = [
					{
						column: activityLogObjectTypeColumnName,
						operand: 'IN',
						values: [objectType]
					},
					{ column: activityLogObjectIdColumnName, operand: 'IN', values: [id] }
				];

				navigator.clipboard.writeText(id);
				Object.assign(document.createElement('a'), {
					target: '_blank',
					rel: 'noopener noreferrer',
					href: `https://${
						window.location.hostname
					}/kpis/details/${activityLogCardId}?pfilters=${encodeURIComponent(
						JSON.stringify(pfilters)
					)}`
				}).click();
			}
		)
		.catch((err) => {
			// If a fetch inside getActivityLogConfig failed and was not handled, still fail safely
			console.error('Activity log config error:', err);
			alert('Could not load configuration for activity log. Please try again.');
		});
})();
