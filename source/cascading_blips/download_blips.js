CB = {};
CB.blips = {};
CB.blip_trees = [];
CB.saved_page_text = document.documentElement.outerHTML;

CB.download_blip_trees = async function(start_id){
	await CB.add_all_children(start_id, CB.saved_page_text);
	CB.convert_all_to_tree();
};

// todo add_all_children is a bad name
CB.add_all_children = async function(start_id, input_text){
	if(CB.blips[start_id]){ return; }
	await CB.add_blip(start_id, input_text);
	
	const start_blip = CB.blips[start_id];
	for(const child of start_blip.children_ids){
		await CB.add_all_children(child);
	}
	if(start_blip.parent_id){
		await CB.add_all_children(start_blip.parent_id);
	}
	return;
};

// todo make this work in CB.parse_blip or something
// so there are not two steps for making the tree
CB.convert_all_to_tree = function() {
    Object.values(CB.blips).forEach(function(blip) {
		if(blip.parent_id) {
            CB.blips[blip.parent_id].children.push(blip);
        } else {
			CB.blip_trees.push(blip);
		}
	});
	//CB.blip_tree = Object.values(CB.blips).find(b => b.parent_id == null);
    return;
};

CB.add_blip = async function(blip_id, input_text){
	if(!input_text && CB.blips[blip_id]){ return; }
	const page_text = input_text || await CB.download_blip(blip_id);
	const doc = new DOMParser().parseFromString(page_text, "text/html");
	CB.blips[blip_id] = CB.parse_blip(doc);
	return;
};

CB.parse_blip = function(doc){
	const this_post = CB.comment_node_to_json(doc.getElementsByClassName('comment').item(0));
	const replies = Array.from(doc.getElementsByClassName('comment')).splice(1).map(CB.comment_node_to_json);
	this_post.children_ids = this_post.has_children ? replies.map(e => e.blip_id) : [];
	replies.filter(r => r.has_children == false)
		.forEach(r => CB.blips[r.blip_id] = r);
	return this_post;
};

CB.comment_node_to_json = (node) => ({
	username: node.querySelector('.author > .author > a').innerText,
	user_id: parseInt(node.querySelector('.author > .author > a').href.match(/\d+/g)[1]),
	user_level: node.querySelector('.author > .level').innerText,
	// timezone will be off on date. given date is always in GMT+00:00
	date: new Date(node.querySelector('.author > .date').title),
	quick_date: node.querySelector('.author > .date > a').innerText,
	blip_id: parseInt(node.querySelector('.author > .date > a').href.match(/\d+/g)[1]),
	// todo add support for profile pictures
	// node.querySelector('.author > div > span')
	parent_id: (()=> {
		const maybe_parent = node.querySelector('.content > h6');
		return maybe_parent ? parseInt(maybe_parent.innerText.match(/\d+/)) : null;
	})(),
	// .message.replace(/<\/p><p>/gs, '</p><p class="paragraph-seperator">');
	body_text: node.querySelector('.content > .body').innerHTML,
	has_children: Array.from(node.querySelector('.content > .footer').children).some(e => e.innerText == 'View Responses'),
	children_ids: [],
	children: [],
	footer_text_arr: Array.from(node.querySelector('.content > .footer').children)
			.filter(e => e.innerText != 'View Responses' && e.innerText != '@' && e.innerText != 'Respond')
			.map(e => e.outerHTML)
});

// todo should really be download_blip_page_text
CB.download_blip = async function(id){
	const url_obj = new URL('https://e621.net/blip/show/');
	url_obj.searchParams.set('id', id);

	let fetch_req = new Request(url_obj.href);
	return fetch(fetch_req, {'method': 'GET'}).then(res => res.text());
};