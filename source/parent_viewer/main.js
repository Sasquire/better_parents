BP.init_toolbar = function(){
	const menu_node = string_to_node(`
	<div id="ibp_toggle_holder">
		<button id="ibp_all_toggler" class="status-notice">Toggle</button>
		<button id="ibp_graph_toggler" class="status-notice">G</button>
		<button id="ibp_relation_toggler" class="status-notice">R</button>
		<button id="ibp_reduce_toggler" class="status-notice">M</button>
	</div>
	<div id="ibp_tools">
		<button class="status-notice" id="ibp_fix_relations_btn">Fix</button>
		<button class="status-notice" id="ibp_draw_graph_btn">Draw</button>
		<button class="status-notice" id="ibp_add_rule_btn">Add</button>
		<button class="status-notice" id="ibp_submit_btn">Submit</button>
	</div>
	<div id="ibp_relations">
	</div>`
	,'ibp_container');
	const sidebar = document.querySelector('#post-view > .sidebar');
	sidebar.insertBefore(menu_node, sidebar.firstChild);
	
	document.getElementById('ibp_all_toggler').addEventListener('click', BP.toggle_both);
	document.getElementById('ibp_graph_toggler').addEventListener('click', BP.toggle_graph);
	document.getElementById('ibp_relation_toggler').addEventListener('click', BP.toggle_relations);
	document.getElementById('ibp_reduce_toggler').addEventListener('click', BP.toggle_reduce_relations);
	
	document.getElementById('ibp_fix_relations_btn').addEventListener('click', async () => {await BP.fix_unknown_relations(); BP.update_both();})
	document.getElementById('ibp_draw_graph_btn').addEventListener('click', BP.update_both)
	document.getElementById('ibp_add_rule_btn').addEventListener('click', BP.add_rule);
	document.getElementById('ibp_submit_btn').addEventListener('dblclick', BP.submit_changes);
};

// todo clean these up and have one function/object ?
BP.toggle_both = function(){
	/* relations off && graph off turn both on
	   relations off && graph on  turn graph off
	   relations on  && graph off turn graph on
	   relations on  && graph on  turn both off   */
	const relations_status = document.getElementById('ibp_relations').classList.contains('hidden');
	const graph_status = document.getElementById('ibp_graph').classList.contains('hidden');
	if(relations_status == graph_status){
		BP.toggle_relations();
	}
	BP.toggle_graph();
	BP.style_toggle_both();
};

BP.toggle_graph = function(){
	document.getElementById('ibp_graph_toggler').classList.toggle('status-red');
	document.getElementById('ibp_graph').classList.toggle('hidden');
	BP.style_toggle_both();
};

BP.toggle_relations = function(){
	document.getElementById('ibp_relations').classList.toggle('hidden');
	document.getElementById('ibp_tools').classList.toggle('hidden');
	document.getElementById('ibp_relation_toggler').classList.toggle('status-red');
	BP.style_toggle_both();
};

BP.style_toggle_both = function(){
	const graph_off = document.getElementById('ibp_graph').classList.contains('hidden');
	if(graph_off == true){
		document.getElementById('ibp_all_toggler').classList.add('status-red');
	} else {
		document.getElementById('ibp_all_toggler').classList.remove('status-red');
	}
};

BP.toggle_reduce_relations = function(){
	const old_node = document.getElementById('ibp_hider');
	if(old_node){ return old_node.remove(); }
	const new_node = string_to_node(`
		<style id="ibp_hider">
			.ibp_rule_data > a { display:none !important }
			.ibp_rule_data > input { width: 55px !important; }
			.ibp_rule { width: 115px; padding: 3px !important;}
			.ibp_rule_tools > button { width:30px; overflow:hidden; flex-grow:1; }
			#ibp_reduce_toggler { background-color: #822828; border: 1px solid #ac2d2d; }
		</style>`).firstElementChild;
	document.head.appendChild(new_node);
};

BP.apply_settings = function(){
	Opt.get('BP_reduce_relations').then(o => o ? BP.toggle_reduce_relations() : '');
	Opt.get('BP_hide_relations').then(o => o ? BP.toggle_relations() : '');
	Opt.get('BP_hide_graph').then(o => o ? BP.toggle_graph() : '');
	Opt.get('BP_auto_download').then(o => o ? BP.start() : '');
	Opt.get('BP_bright_highlights').then(o => {
		if(o){
			document.head.innerHTML += `
			<style id="ibp_bright_highlights">
				.ibp_rule.ipb_parent_highlight {background-color:#0f0;}
				.ibp_rule.ipb_child_highlight {background-color:#d9d;}
			</style>`
		}
	})
};

BP.submit_changes = async function(){
	const relations = BP.read_relations();
	const r = relations.map(e => e.s_num);
	if(r.length != new Set(r).size){ return error('Source set twice'); }
	if(relations.some(pair => !pair.s_obj || !pair.t_obj)){ return error('Unkown post'); }
	if(relations.some(pair => pair.s_obj.destroyed || pair.t_obj.destroyed)){ return error('Destroyed post'); }
	if(BP.locked){ return; } // dont submit while downloading

	const changed_relations = BP.get_changed_relations();
	
	BP.start_lock();
	document.getElementById('ibp_all_toggler').innerHTML = 'Submitting';
	for(const rule of changed_relations){
		await set_parent(rule.post_id, rule.parent_id);
	}
	BP.all_over();
	const submit_btn = document.getElementById('ibp_submit_btn');
	submit_btn.classList.add('status-green');
	submit_btn.innerHTML = 'Done';
	submit_btn.parentNode.replaceChild(submit_btn.cloneNode(true), submit_btn);

	// todo use form subit instead of api?
	async function set_parent(post_id, parent_id){
		const url_obj = new URL('https://e621.net/post/update.json');
		const api_key = await Opt.get('api_key');
		const username = await Opt.get('username');
		if(api_key == undefined || username == undefined){ return; }
		url_obj.searchParams.set('id', post_id);
		url_obj.searchParams.set('name', username);
		url_obj.searchParams.set('password_hash', api_key);
		url_obj.searchParams.set('post[parent_id]', parent_id);
	
		let fetch_req = new Request(url_obj.href);
		return fetch(fetch_req, {'method': 'POST'}).then(res => res.text());
	}

	function error(message){
		const toggler = document.getElementById('ibp_all_toggler');
		toggler.innerHTML = message;
		toggler.classList.add('status-plum');
		setTimeout(() => {
			toggler.classList.remove('status-plum');
			BP.all_over();
		}, 3000);
	}
};

BP.add_rule = function(input_rule){
	if(input_rule.parent_id === null){ return; }
	const post_id = input_rule.post_id || 0;
	const parent_id = input_rule.parent_id || 0;
	const rule_node = string_to_node(`
	<div class="ibp_rule status-notice">
		<div class="ibp_rule_tools">
			<button class="ibp_remove_btn">Remove</button>
			<button class="ibp_collapse_btn">Collapse</button>
			<button class="ibp_flip_btn">Flip</button>
		</div>
		<div class="ibp_rule_data">
			<input class="ibp_child_text" value="${post_id}"></input>
			<input class="ibp_parent_text" value="${parent_id}"></input>
			<a class="ibp_child_link"><img class="ibp_child_img"></a>
			<a class="ibp_parent_link"><img class="ibp_parent_img"></a>
		</div>
	</div>`).firstElementChild;
	document.getElementById('ibp_relations').appendChild(rule_node);

	rule_node.querySelector('.ibp_child_text').addEventListener('input', input_cleanser);
	rule_node.querySelector('.ibp_parent_text').addEventListener('input', input_cleanser);
	rule_node.querySelector('.ibp_remove_btn').addEventListener('click', remove_rule);
	rule_node.querySelector('.ibp_collapse_btn').addEventListener('click', collapse_rule);
	rule_node.querySelector('.ibp_flip_btn').addEventListener('click', flip_rule);
	BP.update_both();

	function input_cleanser(){
		this.value = this.value.replace(/[^0-9]/g, '');
		if(this.value.length == 0){ this.value = 0; }
		BP.update_rules();
	}

	function remove_rule(){
		this.parentNode.parentNode.remove();
		BP.update_both();
	}

	function collapse_rule(){
		const parent_rule = this.parentNode.parentNode;
		const child_id = parseInt(parent_rule.querySelector('.ibp_child_text').value);
		const parent_id = parseInt(parent_rule.querySelector('.ibp_parent_text').value);
		BP.read_relations()
			.filter(p => p.t_num == child_id && p.s_obj.deleted == false && p.s_num != parent_id)
			.forEach(p => {p.tn_text.value = parent_id});
		BP.update_both();
	}

	function flip_rule(){
		const parent_rule = this.parentNode.parentNode;
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

BP.get_changed_relations = function(){
	const user_defined = BP.read_relations().filter(pair => BP.posts[pair.s_num].parent_id != pair.t_num);
	
	const source_ids = new Set(BP.read_relations().map(e => e.s_num));
	const user_removed = Object.values(BP.posts)
		.filter(obj => obj.parent_id)
		.filter(obj => source_ids.has(obj.post_id) == false)
		.map(obj => ({post_id:obj.s_num, parent_id:''}));
	return changed_rules = user_defined.concat(user_removed);
};

BP.update_rules = function(){
	BP.read_relations().forEach(rule => {
		rule.sn_link.href = '/post/show/'+rule.s_num;
		rule.tn_link.href = '/post/show/'+rule.t_num;
		// todo something that looks nicer than these if-else
		// changed from multiple read and filter because it 
		// might have looked nicer
		if(rule.s_obj){
			rule.sn_img.src = rule.s_obj.source;
			rule.sn_img.title = rule.s_obj.flag_message;
		} else {
			rule.sn_img.src = chrome.extension.getURL('images/unknown.png');
			rule.sn_img.title = 'Unkown Post';
		}
		if(rule.t_obj){
			rule.tn_img.src = rule.t_obj.source;
			rule.tn_img.title = rule.t_obj.flag_message;
		} else {
			rule.tn_img.src = chrome.extension.getURL('images/unknown.png');
			rule.tn_img.title = 'Unkown Post';
		}
	});
};

BP.update_both = function(){
	BP.update_rules();
	BP.update_graph();
}

// todo move to utilities
function string_to_node(string, id){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(id){ temp.id = id; }
	return temp;
}

(function(){
	if(await Opt.get('BP_disable')){ return; }

	const parent_notification = document.querySelector('#post-view > .sidebar > .status-notice > h6');
	const child_notification = document.querySelector('#child-posts');
	if(parent_notification == null && child_notification == null){ return; }
	if(parent_notification) { parent_notification.parentNode.remove(); }
	if(child_notification){ child_notification.remove(); }
	
	// todo move these to somewhere else? didn't want to put
	// them in download_posts.js so there is some level of
	// seperation between the files.
	BP.each_start = e => document.getElementById('ibp_all_toggler').innerHTML = 'Downloading #'+e;
	BP.each_ended = e => BP.add_rule(BP.posts[e]);
	BP.start_lock = function(){
		BP.locked = true;
		document.getElementById('ibp_all_toggler').classList.add('status-orange');
		document.getElementById('ibp_fix_relations_btn').classList.add('status-orange');
		document.getElementById('ibp_submit_btn').classList.add('status-orange');
	};
	BP.all_over = function(){
		BP.locked = false;
		document.getElementById('ibp_all_toggler').innerHTML = 'Toggle Both';
		document.getElementById('ibp_all_toggler').classList.remove('status-orange');
		document.getElementById('ibp_fix_relations_btn').classList.remove('status-orange');
		document.getElementById('ibp_submit_btn').classList.remove('status-orange');
	};
	BP.init_toolbar();
	BP.init_graph();
	BP.apply_settings();
})();