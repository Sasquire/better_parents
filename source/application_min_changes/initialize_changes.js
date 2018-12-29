const IC = {}; // namespace

IC.files = [
	'better_blacklist.js'
].map(e => chrome.extension.getURL('./source/application_min_changes/'+e));

IC.inject_page_script = function(mutationsList, observer) {
	const maybe_app_min = mutationsList
		.filter(mutation => 
			mutation.addedNodes[0] &&
			mutation.addedNodes[0].tagName === 'SCRIPT' &&
			mutation.addedNodes[0].src.match(/application-min/));
	if(maybe_app_min.length == 0){ return; }
	const app_min = maybe_app_min[0].addedNodes[0];
	observer.disconnect();
	IC.files.forEach(url => {
		const node = document.createElement('script');
		node.src = url;
		app_min.parentNode.appendChild(node);
	});	
};

new MutationObserver(IC.inject_page_script).observe(document, {childList:true,subtree:true});