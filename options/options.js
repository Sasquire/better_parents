async function saveOptions(e) {
	const api_key = document.getElementById('api_key').value;
	const username = document.getElementById('username').value;
	await set_in_storage('api_key', api_key);
	await set_in_storage('username', username);
}

async function restoreOptions() {
	const { api_key, username } = await get_from_storage(['api_key', 'username']);
	document.getElementById('api_key').value = api_key || '';
	document.getElementById('username').value = username || '';
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#save').addEventListener('click', saveOptions);

// storage.sync.set and storage.sync.get wouldnt work
// unless I have a callback
async function set_in_storage(key, obj){
	return new Promise(function(resolve, reject){
		const thing = {};
		thing[key] = obj;
		chrome.storage.sync.set(thing, function(e){
			resolve(e);
		});
	});
}

async function get_from_storage(key){
	return new Promise(function(resolve, reject){
		chrome.storage.sync.get(key, function(e){
			resolve(e);
		});
	});
}