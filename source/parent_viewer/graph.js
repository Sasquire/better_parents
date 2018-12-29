

 BP.init_graph = function() {
	if (!document.getElementById('parent-network-graph')) {
		document.getElementById('right-col').insertBefore(string_to_node('<div id="parent-network-graph"></div>'), document.getElementById('right-col').firstChild);
	}

    const graphContainer = document.getElementById('parent-network-graph');
    network = new vis.Network(graphContainer, {nodes: [], edges: []}, {
        height: '400px',
        nodes:{shape:'image', size:25},
        edges:{arrows:'to'},
    });
};

BP.update_graph = function () {
    if (!network) return;

    let vis_nodes = BP.posts.get_nodes().map(node => ({'id': node.id, 'image': node.img}));
    let vis_links = BP.posts.get_links().map(link => ({'from': link.source, 'to': link.target}));
    
    network.setData({nodes: vis_nodes, edges: vis_links})
}
