// todo have @'s link to users
CB.create_HTML = function(tree){
    return `
    <div class="icb_comment_group">
        <div class="icb_comment" id="icb_blip_${tree.blip_id}">
            <div class="icb_info_bar">
                <a class="icb_toggler" href="javascript:void(0);" class="icb_toggle_comment">[-]</a>
                <a class="icb_username" href="/user/show/${tree.user_id}">${tree.username}</a>
                <a class="icb_blip_link" href="/blip/show/${tree.blip_id}" title="${tree.date}">Blip #${tree.blip_id}</a>
                ${tree.footer_text_arr.join('')}
            </div>
			<div class="icb_body_text">${tree.body_text}</div>
		</div>
		${Object.values(tree.children).map(CB.create_HTML).join('')}
	</div>`;
};

(function(){
	(async () => {
		document.getElementById('content').innerHTML = `<div id="icb_notification" class="section">yeah boi</div>` + document.getElementById('content').innerHTML;
		CB.start_each = (id) => {
			const notifier = document.getElementById('icb_notification');
			notifier.innerHTML = 'Downloading Blip #'+id;
			notifier.classList.add('status-orange');
		};
		// todo add support for the second page of blips
		// https://e621.net/blip?limit=50&page=2
		if(window.location.href.match(/blip\/index.*/)){
			document.getElementById('blip-list').id = 'blip'
			return CB.create_trees_on_listing();
		} else {
			const page_id = parseInt(window.location.href.match(/\/([0-9]+).*/)[1]);
			document.head.appendChild(string_to_node(`<style id="icb_highlight">#icb_blip_${page_id}{ background-color: #26586e !important; }</style>`).firstElementChild);
			return CB.build_complete_post(page_id, document.documentElement.outerHTML);
		}
	})().then(() => {
		document.getElementById('icb_notification').remove();
		document.getElementById('blip').innerHTML = CB.blip_trees.map(CB.create_HTML).join('');
		Array.from(document.getElementsByClassName('icb_toggler')).forEach(n => n.addEventListener('click', toggle_hiddenness));

		const script = document.createElement('script');
		script.textContent = 'Post.apply_blacklists()';
		document.head.appendChild(script);
		script.remove();
		
		function toggle_hiddenness(e){
			this.parentNode.parentNode.querySelector('.icb_body_text').classList.toggle('hidden')
			Array.from(this.parentNode.parentNode.parentNode.children)
				.splice(1)
				.forEach(node => node.classList.toggle('hidden'));
		}
	});
})();

// todo move to utilities
function string_to_node(string, id){
	const temp = document.createElement('div');
	temp.innerHTML = string;
	if(id){ temp.id = id; }
	return temp;
}