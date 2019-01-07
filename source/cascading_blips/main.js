// todo have @'s link to users
CB.create_HTML = function(tree){
    return `
    <div class="icb_comment_group">
        <div class="icb_comment icb_blip_${tree.blip_id}">
            <div class="icb_info_bar">
                <button class="icb_toggle_comment">[-]</button>
                <a href="/user/show/${tree.user_id}">${tree.username}</a>
                <a href="/blip/show/${tree.blip_id}" title="${tree.date}">Blip #${tree.blip_id}</a>
                ${tree.footer_text_arr.join('')}
            </div>
			<div class="body" style="">${tree.body_text}</div>
		</div>
		${Object.values(tree.children).map(CB.create_HTML).join('')}
	</div>`;
};

(function(){
	const page_id = parseInt(window.location.href.match(/\/(\d+)./)[1]);
	if(!page_id){
		// on the listing for all the blips
	} else {
		// only the single blip page
	}
	CB.download_blip_trees(page_id)
		.then(() => {
			console.log(CB);
			document.getElementById('blip').innerHTML = CB.blip_trees.map(CB.create_HTML).join('');
		})
	
})();

const all_pages = {};
document.getElementById('content').innerHTML =`<div class="section better-blips-notifications" style="margin-bottom:4px;"></div>` + document.getElementById('content').innerHTML
if(window.location.href.match(/blip\/show.*/)){
    //single_blip_page();
} else {
    //blip_listing_page();
}

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

async function get_all_blip_trees(){
    let front_page_blips = document.getElementsByClassName('date');
    const all_blip_trees = [];
    const seen_blips = [];
    for(let i = 0; i < front_page_blips.length; i++){
        const blip_id = parseInt(front_page_blips.item(i).innerHTML.match(/\/(\d+)"/)[1]);
        const blip_tree = await create_blip_tree_object(blip_id);
        if(seen_blips.includes(blip_tree.id) == false){
            all_blip_trees.push(blip_tree);
            seen_blips.push(blip_tree.id);
        }
        /* not doing promise.all and the general async stuff to be kinda nice to e6's servers */
    }
    return all_blip_trees;
}

async function create_blip_tree_object(any_blip){
    const start_blip = await get_parent_most_blip(any_blip).catch(add_error_message);
    const blip_tree = get_static_data(start_blip);
    blip_tree.children = await build_blip_tree(start_blip).catch(add_error_message);
    return blip_tree;

    async function build_blip_tree(blip_id){
        try{
            let children = await get_blip_children(blip_id);
            if(children.length == 0) { return {'children': null}; }

            const blip_tree = {};
            for(let blip of children){
                await download_blip(blip);
                blip_tree[blip] = get_static_data(blip);
                blip_tree[blip].children = await build_blip_tree(blip);
            }
            return blip_tree;
        } catch(e){ throw e; }
    }
}

function create_posts(tree){
    if(tree == null){ return ''; }
    //const new_message = tree.message.replace(/<\/p><p>/gs, '</p><p class="paragraph-seperator">');
    let ret_str =
    `<div class="comment-group">
        <div class="comment blip-${tree.id}">
            <div class="info-bar">
                <a href="javascript:;" class="toggle-hidden">[-]</a>
                <a href="/user/show/${tree.author_id}">${tree.author_name}</a>
                <div> - </div>
                <a href="/blip/show/${tree.id}" title="${tree.date}" style="color:#3cf;">Blip #${tree.id}</a>
                <div> - </div>
                ${tree.util_bar.join('<div> - </div>')}
            </div>
			<div class="body" style="">${new_message}</div>
	    </div>`;
//      <other comments>
//  </div>

    for(let key of Object.keys(tree.children)){
        ret_str += create_posts(tree.children[key]);
    }
    ret_str += '</div>'
    return ret_str;
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

async function get_blip_children(id){
    const text = await download_blip(id).catch(e=>{throw e;});
    const all_children = text.match(/<span class="date".*?\/blip\/show\/(\d+)/g).map(e=>parseInt(e.match(/\d+$/)[0])).filter(e=>e!=id && e!=0);
    return [...new Set(all_children)];
}

async function get_parent_most_blip(start_id){
    const text = await download_blip(start_id).catch(e=>{throw e;});
    const first_parent_id = parseInt(text.match(/<a href="\/blip\/show\/(\d+)">/)[1]);
    if(first_parent_id == 0){
        return start_id;
    } else if(start_id != first_parent_id){
        return get_parent_most_blip(first_parent_id).catch(error=>{
            add_error_message(error.replace(/#(\d*)/, '<a href="/blip/show/$1">#$1</a>')+' so now blip '+start_id+' is being considered as the top blip');
            return start_id;
        });
    } else {
        return first_parent_id;
    }
}

async function download_blip(id){
	return 
	/*
    document.getElementsByClassName('better-blips-notifications')[0].innerText = 'Downloading Blip #'+id;
    return new Promise(function(resolve, reject){
        if(typeof all_pages[id] == 'string'){
            resolve(all_pages[id]);
        } else if(typeof all_pages[id] == 'object'){
            reject('Blip #'+all_pages[id][0]+' gave response '+all_pages[id][1]);
        } else {
            const xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    all_pages[id] = xhttp.responseText;
                    resolve(xhttp.responseText);
                } else if(this.status != 0 && this.status != 200){
                    all_pages[id] = [id, this.status];
                    reject('Blip #'+id+' gave response '+this.status);
                }
            };

            xhttp.open('GET', 'https://e621.net/blip/show/'+id, true);
            xhttp.send();
        }
    }); */
}

function clear_comments(){
    const blip_node = document.getElementById('blip');
    while (blip_node.firstChild) {
        blip_node.removeChild(blip_node.firstChild);
    }
}