const username = 'name';
const api_key = 'api-key';
const on_by_default = true;

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
	document.getElementById('ibp_update_graph_btn').addEventListener('click', async () => {
		const relations = BP.read_relations({});
		for(const relation of relations){
			await BP.check_post(relation.s_num);
			await BP.check_post(relation.t_num);
		}
		document.getElementById('ibp_toggler').innerHTML = 'Toggle Better Parents';
		BP.update_both();
	})
	document.getElementById('ibp_add_rule_btn').addEventListener('click', BP.add_rule)
	document.getElementById('ibp_submit_btn').addEventListener('dblclick', BP.submit_changes);

	function toggle_visibility(){
		document.getElementById('ibp_relations').classList.toggle('hidden');
		document.getElementById('ibp_toggler').classList.toggle('status-red');
		document.getElementById('ibp_graph').classList.toggle('hidden');
	}
};

BP.submit_changes = function(){};

BP.add_rule = function(input_rule){
	if(input_rule.parent_id === null){ return; }
	const post_id = input_rule.post_id || 0;
	const parent_id = input_rule.parent_id || 0;
	const rule_node = string_to_node(`
	<div class="ibp_rule status-notice">
		<button class="ibp_remove_btn">Remove Rule</button>
		<button class="ibp_collapse_btn">Collapse</button>
		<br/>
		<input class="ibp_child_text" value="${post_id}"></input>
		<span>⇨</span>
		<input class="ibp_parent_text" value="${parent_id}"></input>
		<br/>
		<a class="ibp_child_link"><img class="ibp_child_img"></a>
		<span>⇨</span>	
		<a class="ibp_parent_link"><img class="ibp_parent_img"></a>
	</div>`).firstElementChild;
	document.getElementById('ibp_relations').appendChild(rule_node);
	Array.from(rule_node.getElementsByTagName('input')).forEach(node => {
		node.addEventListener('input', (e) => {
			// only allow numbers
			const val = e.target.value;
			e.target.value = val.replace(/[^0-9]/g, '');
			if(val.length == 0){ e.target.value = 0; }
			// child can not be a deleted post
			const num_val = parseInt(e.target.value);
			if(e.target.classList.contains('ibp_child_text') && BP.posts[num_val] && BP.posts[num_val].deleted){
				e.target.value = 0;
			}
			BP.update_rules();
		});
	});
	
	if(BP.posts[post_id] && BP.posts[post_id].deleted == true){
		rule_node.classList.add('status-red');
		Array.from(rule_node.getElementsByTagName('input')).forEach(input => {
			input.readOnly = true;
			input.style.backgroundColor = 'grey';
		})
		rule_node.querySelector('.ibp_remove_btn').value = 'stuck';
		rule_node.querySelector('.ibp_remove_btn').style.backgroundColor = 'grey';
	}

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
				s_obj: BP.posts[source_num],

				tn_text: target_text,
				tn_link: node.querySelector('.ibp_parent_link'),
				tn_img: node.querySelector('.ibp_parent_img'),
				t_num: target_num,
				t_obj: BP.posts[target_num]
			};
		})
		.filter(rule => {
			let ret = true;
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
		source_exists:true,
		target_exists:true,
		source_ndeleted:true,
		duplicate_remove:true
	});

	const parent_rules = get_custom_rules({
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
		rule.sn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.tn_img.src = chrome.extension.getURL('images/unknown.png');
		rule.sn_img.title = 'Unkown Post';
		rule.tn_img.title = 'Unkown Post';
		rule.sn_link.href = '/post/show/'+rule.sn_text.value;
		rule.tn_link.href = '/post/show/'+rule.tn_text.value;
	});

	BP.read_relations({source_exists:true}).forEach(rule => {
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
	BP.init_graph();
	BP.each_start = e => document.getElementById('ibp_toggler').innerHTML = 'Downloading Post #'+e;
	BP.each_ended = e => BP.add_rule(BP.posts[e]);
	BP.download_all(page_text).then(() => {
		document.getElementById('ibp_toggler').innerHTML = 'Toggle Better Parents';
	});
})();