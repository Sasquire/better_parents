BP.network;

BP.init_graph = function() {
	const ad_banner = document.getElementById('ad-leaderboard');
	const graphContainer = string_to_node('', 'ibp_graph');
	ad_banner.parentNode.insertBefore(graphContainer, ad_banner.nextElementSibling);

	BP.network = new vis.Network(graphContainer, {nodes: [], edges: []}, {
		height: '400px',
		nodes: { shape:'image', size:25 },
		edges: { arrows:'to' },
		interaction: { hover: true, hoverConnectedEdges:false },
		physics: { enabled: true }
	});

	BP.network.on('hoverNode', highlight);
	BP.network.on('blurNode', () => highlight());

	function highlight(e){
		const post_id = e ? e.node : '';
		const all_fields = BP.read_relations();
		all_fields.forEach(n => {
			if(n.s_num === post_id){
				n.node.classList.add('ipb_child_highlight');
			} else if(n.t_num === post_id){
				n.node.classList.add('ipb_parent_highlight');
			} else {
				n.node.classList.remove('ipb_parent_highlight');
				n.node.classList.remove('ipb_child_highlight');
			}
		});
	}
};

BP.update_graph = function () {
	const vis_nodes = Object.values(BP.posts).map(node => ({
		id: node.post_id,
		title: `#${node.post_id}`,
		image: node.source
	}));

	const vis_links = BP.read_relations().map(link => ({
		from: link.s_num,
		to: link.t_num
	}));
	
	BP.network.setData({nodes: vis_nodes, edges: vis_links})
}
