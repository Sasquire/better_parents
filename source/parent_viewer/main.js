

const username = 'name';
const api_key = 'api-key';
const on_by_default = true;

function all_post_obj(){
	return all_posts.reduce((all_obj, post) => {
		all_obj[post.post_id] = post;
		return all_obj;
	}, {});
}

function all_post_nodes(){
	return all_posts.map(e => ({
		id: e.post_id,
		img: e.source
	}));
}

function all_post_links(){
	return all_posts.map(post =>
		post.children.map(child => ({
			source: child,
			target: post.post_id
		})).concat({
			source: post.post_id,
			target: post.parent_id
		})
	)
	.reduce((acc, link) => acc.concat(...link), [])
	.filter((e, index, arr) =>
		index == arr.findIndex(t => t.source == e.source && t.target === e.target) &&
		e.target != null
	);
}

BP.setup_toolbar = function(){
	const menu_node = string_to_node(`
	<div id="ibp_toggler" class="status-notice">
		Toggle Better Parents
	</div>
	<div id="ibp_tools">
		<div class="status-notice" id="ibp_update_graph_btn">Update Graph</div>
		<div class="status-notice" id="ibp_add_rule_btn">Add Rule</div>
		<div class="status-notice" id="ibp_submit_btn">Submit</div>
	</div>
	<div id="ibp_relations">
	</div>`, 'ibp_container');
	const sidebar = document.querySelector('#post-view > .sidebar');
	sidebar.insertBefore(menu_node, sidebar.firstChild);
	
	document.getElementById('ibp_toggler').addEventListener('click', toggle_visibility);
	document.getElementById('ibp_update_graph_btn').addEventListener('click', BP.update_both)
	document.getElementById('ibp_add_rule_btn').addEventListener('click', BP.add_rule)
	document.getElementById('ibp_submit_btn').addEventListener('dblclick', BP.submit_changes);

	function toggle_visibility(){
		document.getElementById('ibp_relations').classList.toggle('hidden');
		document.getElementById('ibp_toggler').classList.toggle('status-red');
		document.getElementById('ibp_graph').classList.toggle('hidden');
	}
};



BP.submit_changes = function(){};

/*BP.download_post_graph(BP.page_id).then(k => {
	console.log(BP.posts)
	const viewer_html = `
	<div id="better_parents_toggler" class="status-notice">
		Toggle Better Parents
	</div>
	<div id="parent_relations">
		<div id="parent_viewer_button_div" >
			<div class="status-notice" id="update_graph_btn">Update Graph</div>
			<div class="status-notice" id="add_rule_btn">Add Rule</div>
			<div class="status-notice" id="submit_btn">Submit</div>
		</div>
	</div>`;

	const parent_notification = document.querySelector('#post-view > .sidebar > .status-notice > h6');
	const child_notification = document.querySelector('#child-posts');
	if(parent_notification == null && child_notification == null){ return document.querySelector('#the_graph').remove(); }
	if(parent_notification) { parent_notification.parentNode.remove(); }
	if(child_notification){ child_notification.remove(); }

	const sidebar = document.querySelector('#post-view > .sidebar');
	sidebar.insertBefore(string_to_node(viewer_html), sidebar.firstChild);
	all_posts.forEach(add_rule);
	if(on_by_default == false){ toggle_visibility(); }

	document.getElementById('parent_viewer_button_div').innerHTML += sets.map(set => `<div title="Set #${set.id}" class="status-notice" title id="set_adder_${set.id}">${set.name}</div>`).join(' ');
	sets.forEach(set => document.getElementById('set_adder_'+set.id).addEventListener('dblclick', () => add_this_to_set(set.id)));

	document.getElementById('better_parents_toggler').addEventListener('click', toggle_visibility);
	document.getElementById('update_graph_btn').addEventListener('click', do_update);
	document.getElementById('add_rule_btn').addEventListener('click', () => add_rule());
	document.getElementById('submit_btn').addEventListener('dblclick', async function(){
		const submit_button = document.getElementById('submit_btn');
		submit_button.classList.add('status-orange');
		submit_button.innerHTML = '...';
		const rules = get_changed_rules();
		for(let rule of rules){
			await set_parent(rule.source, rule.target)
		}
		submit_button.classList.remove('status-orange');
		submit_button.classList.add('status-green');
		submit_button.innerHTML = 'Done';
		submit_button.parentNode.replaceChild(submit_button.cloneNode(true), submit_button);
		do_update();
	});
});*/

BP.add_rule = function(input_rule){
	if(input_rule.parent_id === null){ return; }
	input_rule.post_id = input_rule.post_id || '';
	input_rule.parent_id = input_rule.parent_id || '';
	const rule_node = string_to_node(`
	<div class="ibp_rule status-notice">
		<button class="ibp_remove_btn">Remove Rule</button>
		<button class="ibp_collapse_btn">Collapse</button>
		<br/>
		<input class="ibp_child_text" type="number" value="${input_rule.post_id}"></input>
		<span>⇨</span>
		<input class="ibp_parent_text" type="number" value="${input_rule.parent_id}"></input>
		<br/>
		<a class="ibp_child_link"><img class="ibp_child_img"></a>
		<span>⇨</span>	
		<a class="ibp_parent_link"><img class="ibp_parent_img"></a>
	</div>`).firstElementChild;
	document.getElementById('ibp_relations').appendChild(rule_node);
	BP.update_both();
};

BP.read_relations = function(options){
	options = options || {};
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
				s_obj: Number.isNaN(source_num) ? undefined : BP.posts[source_num],
				tn_text: target_text,
				tn_link: node.querySelector('.ibp_parent_link'),
				tn_img: node.querySelector('.ibp_parent_img'),
				t_num: target_num,
				t_obj: Number.isNaN(target_num) ? undefined : BP.posts[target_num]
			};
		})
		.filter(rule => {
			let ret = true;
			if(options.source_number){ ret = ret && Number.isNaN(rule.s_num) == false; }
			if(options.target_number){ ret = ret && Number.isNaN(rule.t_num) == false; }
			if(options.source_exists){ ret = ret && rule.s_obj; }
			if(options.target_exists){ ret = ret && rule.t_obj; }
			if(options.source_ndeleted){ ret = ret && rule.s_obj && rule.s_obj.deleted == false; }
			if(options.target_ndeleted){ ret = ret && rule.t_obj && rule.t_obj.deleted == false; }
			if(options.duplicate_remove){ }
			return ret;
		});
};

function get_changed_rules(){
	const user_rules = get_custom_rules({
		source_number:true,
		target_number:true,
		source_exists:true,
		target_exists:true,
		source_ndeleted:true,
		duplicate_remove:true
	});

	const parent_rules = get_custom_rules({
		source_number:true,
		target_number:true,
		source_exists:true,
		target_exists:true,
	});

	const post_obj = all_post_obj();
	const deleted_base_rules = all_post_links()
		.filter(e =>
			post_obj[e.source].deleted == false && // isnt coming from a deleted post
			parent_rules.some(k => e.source == k.source) == false // theres not a post using its source
		)
		.map(e => ({
			source: e.source,
			target: ''
		}));

	return user_rules.concat(deleted_base_rules);
};

BP.update_rules = function(){
	BP.read_relations({}).forEach(rule => {
		rule.node.classList.remove('status-red');
		rule.sn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.tn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.sn_img.title = 'Unkown Post';
		rule.tn_img.title = 'Unkown Post';
		rule.sn_link.href = '/post/show/'+rule.sn_text.value;
		rule.tn_link.href = '/post/show/'+rule.tn_text.value;
		rule.sn_text.readOnly = false;
		rule.tn_text.readOnly = false;
		rule.remove_btn.value = '';
	});

	BP.read_relations({source_exists:true}).forEach(rule => {
		if(rule.s_obj.deleted){
			rule.node.classList.add('status-red');
			rule.sn_text.readOnly = true;
			rule.tn_text.readOnly = true;
			rule.remove_btn.value = 'stuck';
		}
		rule.sn_img.src = rule.s_obj.source;
		rule.sn_img.title = rule.s_obj.flag_message;
		rule.sn_link.href = '/post/show/'+rule.s_num;
	});

	BP.read_relations({target_exists:true}).forEach(rule => {
		rule.tn_img.src = rule.t_obj.source;
		rule.tn_img.title = rule.t_obj.flag_message;
		rule.tn_link.href = '/post/show/'+rule.t_num;
	});

	Array.from(document.getElementsByClassName('ibp_remove_btn')).forEach(btn => {
		btn.addEventListener('click', remove_rule);
	});

	Array.from(document.getElementsByClassName('ibp_collapse_btn')).forEach(btn => {
		btn.addEventListener('click', collapse_rule);
	});

	function remove_rule(e){
		if(this.value == 'stuck'){ return; }
		this.parentNode.remove();
	}

	function collapse_rule(e){
		const parent_rule = this.parentNode;
		const child_id = parseInt(parent_rule.querySelector('.ibp_child_text').value);
		const parent_id = parseInt(parent_rule.querySelector('.ibp_parent_text').value);
		BP.read_relations({})
			.filter(p => p.t_num == child_id && p.s_obj.deleted == false && p.s_num != parent_id)
			.forEach(p => {p.tn_text.value = parent_id});
	}
/*
	[...document.getElementsByClassName('remove_btn')].forEach(btn => {
		btn.addEventListener('click', remove_rule);
	});

	[...document.getElementsByClassName('collapse_btn')].forEach(btn => {
		btn.addEventListener('click', collapse_rule);
	});

	const good_rules = get_custom_rules({source_exists:true, target_exists:true})
	const good_nodes = all_post_nodes()
	update(good_rules, good_nodes);
	*/
};

BP.update_both = function(){
	BP.update_rules();
}

function string_to_node(string, id){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(id){ temp.id = id; }
	return temp;
}

function highlight(post_id){
	const all_fields = get_custom_rules({});
	all_fields.forEach(n => {n.node.style.backgroundImage = ''});

	all_fields.filter(n => n.source == post_id)
		.forEach(n => {n.node.style.backgroundImage = 'linear-gradient(#c970d366, #c970d366)'});
	all_fields.filter(n => n.target == post_id)
		.forEach(n => {n.node.style.backgroundImage = 'linear-gradient(#00ff0044, #00ff0044)'});
}

async function set_parent(post_id, parent_id){
	const url_obj = new URL('https://e621.net/post/update.json');
	url_obj.searchParams.set('id', post_id);
	url_obj.searchParams.set('name', username);
	url_obj.searchParams.set('password_hash', api_key);
	url_obj.searchParams.set('post[parent_id]', parent_id);

	let fetch_req = new Request(url_obj.href);
	return fetch(fetch_req, {'method': 'POST'}).then(res => res.text());
}

(function(){
	const page_text = document.documentElement.outerHTML;
	const parent_notification = document.querySelector('#post-view > .sidebar > .status-notice > h6');
	const child_notification = document.querySelector('#child-posts');
	if(parent_notification == null && child_notification == null){ return; }
	if(parent_notification) { parent_notification.parentNode.remove(); }
	if(child_notification){ child_notification.remove(); }
	
	BP.setup_toolbar();
	BP.each_start = e => document.getElementById('ibp_toggler').innerHTML = 'Downloading Post #'+e;
	BP.each_ended = e => BP.add_rule(BP.posts[e]);
	BP.download_all(page_text).then(() => {
		document.getElementById('ibp_toggler').innerHTML = 'Toggle Better Parents';
		
		console.log(BP.posts)
	});
	console.log(d3.select('svg'))
})();