// storage.sync.set and storage.sync.get wouldnt work
// unless I have a callback

function saveOptions(e) {
	e.preventDefault();
	console.log(document.getElementById('custom_css'));
	chrome.storage.sync.set({
		color: document.getElementById('custom_css').value
	}, function(){});
}

function restoreOptions() {
	chrome.storage.sync.get('custom_css', function(result, error){
		if(error){ return console.log(error); }
		document.getElementById('custom_css').value = result.color || '';
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#save').addEventListener('submit', saveOptions);