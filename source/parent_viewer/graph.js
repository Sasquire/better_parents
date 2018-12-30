BP.network;

BP.init_graph = function() {
	const ad_banner = document.getElementById('ad-leaderboard');
	const graphContainer = string_to_node('', 'ibp_graph');
	ad_banner.parentNode.insertBefore(graphContainer, ad_banner.nextElementSibling);

	BP.network = new vis.Network(graphContainer, {nodes: [], edges: []}, {
		height: '400px',
		nodes:{shape:'image', size:25},
		edges:{arrows:'to'},
		physics: { enabled: false } // Disabled until loading is done
	});
};

BP.pause_graph_physics = function(val) {
	BP.network.setOptions({physics:{stabilization:!val}});
}

BP.update_graph = function () {
	if (!BP.network) return;

	const vis_nodes = Object.values(BP.posts).map(node => ({
		'id': node.post_id,
		'label': `#${node.post_id}`,
		'font': {color: 'white'},
		'image': node.source
	}));

	const vis_links = BP.read_relations().map(link => ({
		'from': link.s_num,
		'to': link.t_num
	}));
	
	BP.network.setData({nodes: vis_nodes, edges: vis_links})
}
