CB = {};
CB.blip_trees = [];
CB.saved_page_text = document.documentElement.outerHTML;
CB.start_each = function(){};
CB.end_each = function(){};
CB.all_over = function(){};

CB.all_blip_ids = function(){
	return CB.blip_trees.map(children_of).reduce((acc, e) => [...acc, ...e], []);

	function children_of(current_node){
		return [current_node.blip_id].concat(...current_node.children.map(children_of));
	}
};

CB.create_trees_on_listing = async function() {
	const all_blips = Array.from(document.getElementsByClassName('comment')).map(CB.comment_node_to_json);
	all_blips.filter(e => e.has_children == false && e.parent_id == null)
		.forEach(e => CB.blip_trees.push(e));
	const others = all_blips.filter(e => e.has_children == true || e.parent_id != null);

	// doesnt handle when the parent/child blip is in the same page as itself
	for(const b of others){
		if(CB.all_blip_ids().some(e => e == b.blip_id)){ continue; }
		await CB.build_complete_post(b.blip_id);
	}
	return;
};

// returns a complete blip tree. both upwards and downwards
CB.build_complete_post = async function(any_blip_id, input_text, child_tree){
	const possible_child_id = child_tree ? child_tree.blip_id : undefined;
	const start_blip = await CB.build_post_with_child(any_blip_id, input_text, possible_child_id);
	if(start_blip == undefined){
		// https://e621.net/blip/show/86010
		// there is a blip that returns 403 forbidden, if a blip does
		// this then its child should be considered the parent
		CB.blip_trees.push(child_tree);
		return child_tree;
	}
	if(child_tree){ start_blip.children.push(child_tree); }

	if(start_blip.parent_id){
		return CB.build_complete_post(start_blip.parent_id, undefined, start_blip);
	} else {
		CB.blip_trees.push(start_blip);
		return start_blip;
	}
};

// returns the blip downwards, does not look at parents.
CB.build_post_with_child = async function(start_id, input_text, child_blip_to_ignore){
	const page_text = input_text || await CB.download_blip(start_id);
	const doc = new DOMParser().parseFromString(page_text, "text/html");
	
	const comments = Array.from(doc.getElementsByClassName('comment')).map(CB.comment_node_to_json);
	const this_post = comments[0];
	const replies = comments.splice(1);
	for(const r of replies){
		if(r.blip_id == child_blip_to_ignore){
			continue;
		} else if(r.has_children){
			this_post.children.push(await CB.build_post_with_child(r.blip_id));
		} else {
			this_post.children.push(r);
		}
	}
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