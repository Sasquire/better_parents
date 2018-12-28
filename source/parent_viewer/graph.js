
//document.getElementById('right-col').insertBefore(string_to_node('<svg id='the_graph' width='700' height='700'></svg>'), document.getElementById('right-col').firstChild);
let svg = d3.select('svg');
let node;
let link;
BP.simulation = d3.forceSimulation()
	.force('link', d3.forceLink().id(function (d) {return d.id;}).distance(230).strength(2))
	.force('charge', d3.forceManyBody())
	.force('center', d3.forceCenter(svg.attr('width') / 2, svg.attr('height') / 2))
	.on('tick', ticked);
	
svg.append('defs').append('marker')
	.attrs({'id':'arrowhead',
		'viewBox':'-0 -5 10 10',
		'refX':13,
		'refY':0,
		'orient':'auto',
		'markerWidth':13,
		'markerHeight':13,
		'xoverflow':'visible'})
	.append('svg:path')
	.attr('d', 'M 0,-5 L 10 ,0 L 0,5')
	.attr('fill', '#999')
	.style('stroke','none');

function update(links, nodes) {
	svg.html(document.getElementById('the_graph').firstElementChild.outerHTML);
	link = svg.selectAll('.link')
		.data(links)
		.enter()
		.append('line')
		.attr('class', 'link')
		.attr('marker-end','url(#arrowhead)')

	node = svg.selectAll('.node')
		.data(nodes)
		.enter()
		.append('image')
		.attr('xlink:href', d => d.img)
		.attr('width', '100px')
		.attr('height', '100px')
		.call(this_d3.drag()
				.on('start', dragstarted)
				.on('drag', dragged)
		)

	node.append('svg:title')
		.text(d => d.id)

	node.on('mouseover', (e) => highlight(e.id))
	node.on('mouseout', (e) => highlight())

	simulation.nodes(nodes)
	simulation.force('link').links(links);
}

function ticked() {
	if(!link || !node){ return; }
	// move the lines
	link
		.attr('x1', d => d.source.x)
		.attr('y1', d => d.source.y)
		.attr('x2', d => d.target.x)
		.attr('y2', d => d.target.y);

	// move the nodes
	node.attr('transform', d => 'translate(' + d.x + ', ' + d.y + ')');
}

function dragstarted(d) {
	if (!this_d3.event.active) simulation.alphaTarget(0.3).restart()
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = this_d3.event.x;
	d.fy = this_d3.event.y;
}