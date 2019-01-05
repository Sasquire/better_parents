const BP = {};
BP.posts = {};
BP.each_start = function(){/* executed on each post added */};
BP.each_ended = function(){/* executed on each post added */};
BP.all_over = function(){/* executed on completion of downloading */}
BP._saved_page_text = document.documentElement.outerHTML;

BP.start = async function(){
	const page_id = parseInt(window.location.href.match(/\/(\d+).*/)[1]);
	return BP.download_complete_post(page_id, BP._saved_page_text).then(BP.all_over);
}

BP.fix_unknown_relations = async function(){
	const relations = BP.read_relations();
	if(relations.length == 0){ return  BP.start(); }
	for(const relation of relations){
		await BP.download_complete_post(relation.s_num);
		await BP.download_complete_post(relation.t_num);
	}
	BP.all_over();
	BP.update_both();
	return;
}

BP.download_complete_post = async function(start_id, page_text){
	if(BP.posts[start_id] && !page_text){ return; }
	BP.each_start(start_id);
	await BP.add_post(start_id, page_text);
	await BP.add_post_parents(start_id);
	BP.each_ended(start_id);
	return;
};

BP.add_post_parents = async function(post_id){
	const cur_post = BP.posts[post_id];
	for(let child of cur_post.children){
		await BP.download_complete_post(child);
	}
	if(cur_post.parent_id){
		await BP.download_complete_post(cur_post.parent_id);
	}
	return;
};

BP.add_post = async function(post_id, input_text){
	if(!input_text && BP.posts[post_id]){ return; }
	const page_text = input_text || await BP.download_post(post_id);
	const parser = new DOMParser();
	const doc = parser.parseFromString(page_text, "text/html");
	const post = BP.doc_to_post(doc, post_id);
	BP.posts[post.post_id] = post;
	return;
}

BP.doc_to_post = function(doc, post_id){
	const parent_ = doc.querySelector('#post-view > .sidebar > .status-notice > p > a');
	const flag_message_ = doc.querySelector('#post-view > .status-notice.status-red');

	return {
		post_id: post_id,
		children: [...doc.querySelectorAll('#child-posts-expanded-thumbs > .thumb')].map(e=>parseInt(e.id.substring(1))),
		parent_id: parent_ ? parseInt(parent_.innerText.substring(1)) : null,
		source: BP.get_source_image(doc, flag_message_),
		deleted: flag_message_ != null,
		destroyed: flag_message_ && flag_message_.innerText == 'This post does not exist',
		flag_message: flag_message_ ? flag_message_.innerText : ''
	};
}

BP.get_source_image = function(doc, deleted){
	const source_ = doc.querySelector('#image');
	const flash_source_ = doc.querySelector('#post-view object');
	const webm_source_ = doc.querySelector('#webm-container');
	if(deleted && deleted.innerText == 'This post does not exist'){
		return chrome.extension.getURL('images/destroyed.png');
	} else if(source_){
		return source_.dataset.sample_url.replace(/(\/data\/sample\/)|(\/data\/)/, '/data/preview/').split('.').slice(0, -1).join('.')+'.jpg';
	} else if(webm_source_){
		return webm_source_.poster.replace(/(\/data\/sample\/)|(\/data\/)/, '/data/preview/').split('.').slice(0, -1).join('.')+'.jpg';
	} else if(flash_source_){
		return chrome.extension.getURL('images/flash.png');
	} else {
		return 'https://e621.net/images/deleted-preview.png';
	}
}

BP.download_post = async function(id){
	const url_obj = new URL('https://e621.net/post/show');
	url_obj.searchParams.set('id', id);

	let fetch_req = new Request(url_obj.href);
	return fetch(fetch_req, {'method': 'GET'}).then(res => res.text());
}