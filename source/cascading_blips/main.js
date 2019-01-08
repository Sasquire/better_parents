// todo have @'s link to users
CB.create_HTML = function(tree){
    return `
    <div class="icb_comment_group">
        <div class="icb_comment" id="icb_blip_${tree.blip_id}">
            <div class="icb_info_bar">
                <button class="icb_toggle_comment">[-]</button>
                <a href="/user/show/${tree.user_id}">${tree.username}</a>
                <a href="/blip/show/${tree.blip_id}" title="${tree.date}">Blip #${tree.blip_id}</a>
                ${tree.footer_text_arr.join('')}
            </div>
			<div class="body">${tree.body_text}</div>
		</div>
		${Object.values(tree.children).map(CB.create_HTML).join('')}
	</div>`;
};

(function(){
	(async () => {
		if(window.location.href.match(/blip\/index.*/)){
			document.getElementById('blip-list').id = 'blip'
			return CB.create_trees_on_listing();
		} else {
			const page_id = parseInt(window.location.href.match(/\/([0-9]+).*/)[1]);
			//document.head.appendChild(string_to_node(`<style id="icb_highlight">#icb_blip_${page_id}{ background-color: #26586e !important; }</style>`).firstElementChild);
			return CB.build_complete_post(page_id, document.documentElement.outerHTML);
		}
	})().then(() => {
		document.getElementById('blip').innerHTML = CB.blip_trees.map(CB.create_HTML).join('');
	});
})();

// todo move to utilities
function string_to_node(string, id){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(id){ temp.id = id; }
	return temp;
}

document.getElementById('content').innerHTML =`<div class="section better-blips-notifications" style="margin-bottom:4px;"></div>` + document.getElementById('content').innerHTML

async function single_blip_page(){
    const page_id = parseInt(window.location.href.match(/\/(\d+).*/)[1]);
    const blip_tree = await create_blip_tree_object(page_id);

    GM_addStyle('.blip-'+page_id+' { background-color: #26586e !important; }');
    GM_addStyle('.comment-group:first-of-type { margin: 0px; }');
    clear_comments();
    remove_notification();

    document.getElementById('blip').innerHTML = create_posts(blip_tree);
    add_toggle_listeners();
    apply_blacklist();
}

async function blip_listing_page(){
    const all_blip_trees = await get_all_blip_trees();
    remove_notification();
    GM_addStyle('#blip-list > .comment-group { margin: 0px; margin-bottom:15px; }');
    GM_addStyle('.hiding { margin-bottom: 3px !important; }');
    document.getElementById('blip-list').innerHTML = all_blip_trees.map(e => create_posts(e)).join('');
    add_toggle_listeners();
    apply_blacklist();
}

function add_toggle_listeners(){
    const toggle_buttons = document.getElementsByClassName('toggle-hidden');
    for(let i = 0; i < toggle_buttons.length; i++){
        const cur_button = toggle_buttons.item(i);
        make_event_listener(cur_button);
    }

    function make_event_listener(node){
        node.addEventListener('click', function(event) {
            const comment_node = this.parentNode.parentNode;
            const comment_body = comment_node.childElements()[1];
            const comment_groups = comment_node.parentNode.childElements().slice(1);

            comment_body.classList.toggle('hidden');
            comment_groups.forEach(e => e.classList.toggle('hidden'));
            comment_node.parentNode.classList.toggle('hiding')
            node.innerHTML = node.innerHTML == '[-]' ? '[+]' : '[-]';
        });
    }
}

function add_error_message(message){
    document.getElementById('content').innerHTML =
            `<div class="section" style="margin-bottom:4px;">${message}</div>` + document.getElementById('content').innerHTML;
    return message;
}

function get_static_data(blip_id){
    const ret_data = {};
    ret_data.message = all_pages[blip_id].match(/<div class="body">(.*?)<\/div>\s*<div class="footer">/s)[1];
    ret_data.author_name = all_pages[blip_id].match(/<a href="\/user\/show\/\d+">(.*?)<\/a>/)[1];
    ret_data.author_id = parseInt(all_pages[blip_id].match(/<a href="\/user\/show\/(\d+)">.*?<\/a>/)[1]);
    ret_data.date = new Date(all_pages[blip_id].match(/<span class="date" title="(.*?)">/)[1]+', GMT+00');
    const matches = all_pages[blip_id].match(/<div class="footer">.*?<\/div>/s)[0].match(/<a .*?<\/a>/gs);
    ret_data.util_bar = matches.filter(e=> !e.includes('View Responses') && !e.includes('Respond') && !e.includes('>@<'))
    ret_data.id = blip_id;
    return ret_data;
}

function remove_notification(){
    const myNode = document.getElementsByClassName('better-blips-notifications')[0];
    myNode.parentNode.removeChild(myNode);
}