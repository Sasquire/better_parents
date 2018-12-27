function remove_post_score(mutationsList, observer) {
/*	mutationsList
		.filter(mutation => 
			mutation.target.tagName === 'SPAN' &&
			mutation.target.className === 'thumb' &&
			mutation.addedNodes[0].className === 'post-score')
		.forEach(e => e.addedNodes.forEach(p => p.remove()));
*/
};

const targetNode = document
const config = { childList: true, subtree: true };
const observer = new MutationObserver(remove_post_score);
observer.observe(targetNode, config);

// Later, you can stop observing
//observer.disconnect();