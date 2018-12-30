BP.setup_toolbar = function(){
	const menu_node = string_to_node(`
	<div id="ibp_toggler" class="status-notice">
		Toggle Better Parents
	</div>
	<div id="ibp_tools">
		<div class="status-notice" id="ibp_fix_relations_btn">Fix</div>
		<div class="status-notice" id="ibp_update_graph_btn">Update</div>
		<div class="status-notice" id="ibp_add_rule_btn">Add</div>
		<div class="status-notice" id="ibp_minimize_btn">Min</div>
		<div class="status-notice" id="ibp_submit_btn">Submit</div>
	</div>
	<div id="ibp_relations">
	</div>`, 'ibp_container');
	const sidebar = document.querySelector('#post-view > .sidebar');
	sidebar.insertBefore(menu_node, sidebar.firstChild);
	
	document.getElementById('ibp_toggler').addEventListener('click', toggle_visibility);
	document.getElementById('ibp_fix_relations_btn').addEventListener('click', BP.check_all_rules)
	document.getElementById('ibp_update_graph_btn').addEventListener('click', BP.update_both)
	document.getElementById('ibp_add_rule_btn').addEventListener('click', BP.add_rule);
	document.getElementById('ibp_minimize_btn').addEventListener('click', minimize_posts);
	document.getElementById('ibp_submit_btn').addEventListener('dblclick', BP.submit_changes);

	function toggle_visibility(){
		document.getElementById('ibp_relations').classList.toggle('hidden');
		document.getElementById('ibp_tools').classList.toggle('hidden');
		document.getElementById('ibp_toggler').classList.toggle('status-red');
		document.getElementById('ibp_graph').classList.toggle('hidden');
	}

	function minimize_posts(){
		const old_node = document.getElementById('ibp_hider');
		if(old_node){ return old_node.remove(); }
		const new_node = string_to_node('<style id="ibp_hider">.ibp_arrow2, .ibp_rule > a { display:none !important }</style>').firstElementChild;
		document.head.appendChild(new_node);
	}
};

BP.submit_changes = async function(){
	const submit_btn = document.getElementById('ibp_submit_btn');
	submit_btn.classList.add('status-purple');
	setTimeout(() => submit_btn.classList.remove('status-plum'), 3000);
	const relations = BP.read_relations();
	const r = relations.map(e => e.s_num);
	if(relations.some(pair => !pair.s_obj || !pair.t_obj)){ return; }; // there is an unkown post
	if(r.length != new Set(r).size){ return; } // a source is set twice
	if(relations.some(pair => pair.s_obj.destroyed || pair.t_obj.destroyed)){ return; }
	
	const user_defined = relations.filter(pair => BP.posts[pair.s_num].parent_id != pair.t_num);
	const user_removed = Object.keys(BP.posts)
		.map(key => BP.posts[key])
		.filter(obj => obj.parent_id)
		.filter(obj => relations.some(pair => pair.s_num == obj.post_id) == false)
		.map(obj => ({post_id:obj.s_num, parent_id:''}));
	const changed_rules = user_defined.concat(user_removed);

	submit_btn.classList.remove('status-purple')
	submit_btn.classList.add('status-orange');
	submit_btn.innerHTML = '...';
	for(const rule of changed_rules){
//		await set_parent(rule.post_id, rule.parent_id);
	}
	submit_btn.classList.remove('status-orange');
	submit_btn.classList.add('status-green');
	submit_btn.innerHTML = 'Done';
	submit_btn.parentNode.replaceChild(submit_btn.cloneNode(true), submit_btn);

	// todo use form subit instead of api?
	async function set_parent(post_id, parent_id){
		const url_obj = new URL('https://e621.net/post/update.json');
		const { api_key, username } = await get_from_storage(['api_key', 'username']);
		if(api_key == undefined || username == undefined){ return; }
		url_obj.searchParams.set('id', post_id);
		url_obj.searchParams.set('name', username);
		url_obj.searchParams.set('password_hash', api_key);
		url_obj.searchParams.set('post[parent_id]', parent_id);
	
		let fetch_req = new Request(url_obj.href);
		return fetch(fetch_req, {'method': 'POST'}).then(res => res.text());
	}
};

BP.check_all_rules = async function(){
	const relations = BP.read_relations();
	for(const relation of relations){
		await BP.download_complete_post(relation.s_num);
		await BP.download_complete_post(relation.t_num);
	}
	document.getElementById('ibp_toggler').innerHTML = 'Toggle Better Parents';
	BP.update_both();
	return;
}

BP.add_rule = function(input_rule){
	if(input_rule.parent_id === null){ return; }
	const post_id = input_rule.post_id || 0;
	const parent_id = input_rule.parent_id || 0;
	const rule_node = string_to_node(`
	<div class="ibp_rule status-notice">
		<button class="ibp_remove_btn">Remove Rule</button>
		<button class="ibp_collapse_btn">Collapse</button>
		<button class="ibp_flip_btn">Flip</button>
		<br/>
		<input class="ibp_child_text" value="${post_id}"></input>
		<span class="ibp_arrow1">⇨</span>
		<input class="ibp_parent_text" value="${parent_id}"></input>
		<br/>
		<a class="ibp_child_link"><img class="ibp_child_img"></a>
		<span class="ibp_arrow2">⇨</span>	
		<a class="ibp_parent_link"><img class="ibp_parent_img"></a>
	</div>`).firstElementChild;
	document.getElementById('ibp_relations').appendChild(rule_node);

	rule_node.querySelector('.ibp_child_text').addEventListener('input', input_cleanser);
	rule_node.querySelector('.ibp_parent_text').addEventListener('input', input_cleanser);
	rule_node.querySelector('.ibp_remove_btn').addEventListener('click', remove_rule);
	rule_node.querySelector('.ibp_collapse_btn').addEventListener('click', collapse_rule);
	rule_node.querySelector('.ibp_flip_btn').addEventListener('click', flip_rule);
	BP.update_both();

	function input_cleanser(e){
		// only allow numbers
		const val = e.target.value;
		e.target.value = val.replace(/[^0-9]/g, '');
		if(val.length == 0){ e.target.value = 0; }
		BP.update_rules();
	}

	function remove_rule(e){
		this.parentNode.remove();
		BP.update_both();
	}

	function collapse_rule(e){
		const parent_rule = this.parentNode;
		const child_id = parseInt(parent_rule.querySelector('.ibp_child_text').value);
		const parent_id = parseInt(parent_rule.querySelector('.ibp_parent_text').value);
		BP.read_relations()
			.filter(p => p.t_num == child_id && p.s_obj.deleted == false && p.s_num != parent_id)
			.forEach(p => {p.tn_text.value = parent_id});
		BP.update_both();
	}

	function flip_rule(e){
		const parent_rule = this.parentNode;
		const child = parent_rule.querySelector('.ibp_child_text');
		const parent = parent_rule.querySelector('.ibp_parent_text');
		const s = child.value;
		child.value = parent.value
		parent.value = s;
		BP.update_both();
	}
};

// todo make this nicer
BP.read_relations = function(){
	return Array.from(document.getElementsByClassName('ibp_rule'))
		.map(node => {
			const source_text = node.querySelector('.ibp_child_text');
			const target_text = node.querySelector('.ibp_parent_text');
			const source_num = parseInt(source_text.value);
			const target_num = parseInt(target_text.value);
			
			return {
				node: node,
				remove_btn: node.querySelector('.ibp_remove_btn'),
				collapse_btn: node.querySelector('.ibp_collapse_btn'),

				sn_text: source_text,
				sn_link: node.querySelector('.ibp_child_link'),
				sn_img: node.querySelector('.ibp_child_img'),
				s_num: source_num,
				post_id: source_num,
				s_obj: BP.posts[source_num],

				tn_text: target_text,
				tn_link: node.querySelector('.ibp_parent_link'),
				tn_img: node.querySelector('.ibp_parent_img'),
				t_num: target_num,
				parent_id: target_num,
				t_obj: BP.posts[target_num]
			};
		});
};

BP.update_rules = function(){
	BP.read_relations().forEach(rule => {
		rule.sn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.tn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.sn_img.title = 'Unkown Post';
		rule.tn_img.title = 'Unkown Post';
		rule.sn_link.href = '/post/show/'+rule.sn_text.value;
		rule.tn_link.href = '/post/show/'+rule.tn_text.value;
	});

	BP.read_relations().filter(e => e.s_obj).forEach(rule => {
		rule.sn_img.src = rule.s_obj.source;
		rule.sn_img.title = rule.s_obj.flag_message;
		rule.sn_link.href = '/post/show/'+rule.s_num;
	});

	BP.read_relations().filter(e => e.t_obj).forEach(rule => {
		rule.tn_img.src = rule.t_obj.source;
		rule.tn_img.title = rule.t_obj.flag_message;
		rule.tn_link.href = '/post/show/'+rule.t_num;
	});
};

BP.update_both = function(){
	BP.update_rules();
	BP.update_graph();
}

function string_to_node(string, id){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(id){ temp.id = id; }
	return temp;
}

// todo make a utilities file with this sort of stuff
async function get_from_storage(key){
	return new Promise(function(resolve, reject){
		chrome.storage.sync.get(key, function(e){
			resolve(e);
		});
	});
}

function highlight(post_id){
	const all_fields = get_custom_rules({});
	all_fields.forEach(n => {n.node.style.backgroundImage = ''});

	all_fields.filter(n => n.source == post_id)
		.forEach(n => {n.node.style.backgroundImage = 'linear-gradient(#c970d366, #c970d366)'});
	all_fields.filter(n => n.target == post_id)
		.forEach(n => {n.node.style.backgroundImage = 'linear-gradient(#00ff0044, #00ff0044)'});
}

(function(){
	const page_text = document.documentElement.outerHTML;
	const parent_notification = document.querySelector('#post-view > .sidebar > .status-notice > h6');
	const child_notification = document.querySelector('#child-posts');
	if(parent_notification == null && child_notification == null){ return; }
	if(parent_notification) { parent_notification.parentNode.remove(); }
	if(child_notification){ child_notification.remove(); }
	BP.setup_toolbar();
	BP.init_graph();
	
	BP.each_start = function(e){
		document.getElementById('ibp_toggler').innerHTML = 'Downloading Post #'+e;
		document.getElementById('ibp_toggler').classList.add('status-orange');
		document.getElementById('ibp_fix_relations_btn').classList.add('status-orange');
	};
	BP.each_ended = function(e){
		BP.add_rule(BP.posts[e]);
		document.getElementById('ibp_toggler').classList.remove('status-orange');
		document.getElementById('ibp_fix_relations_btn').classList.remove('status-orange');
	}
	BP.download_all(page_text).then(() => {
		document.getElementById('ibp_toggler').innerHTML = 'Toggle Better Parents';
		BP.pause_graph_physics(false);
	});
})();