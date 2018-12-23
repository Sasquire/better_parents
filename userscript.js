// ==UserScript==
// @name         parent viewewr
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  graphical parent viewing
// @author       idem
// @match        http://e621.net/post/show/*
// @match        https://e621.net/post/show/*
// @require      http://d3js.org/d3.v4.min.js
// @require      http://d3js.org/d3-selection-multi.v1.js
// @grant        GM_addStyle
// ==/UserScript==

const name = 'name';
const api_key = 'api-key'

/*--- Start d3 stuff ---*/
const this_d3 = d3;
document.getElementById('right-col').insertBefore(string_to_node('<svg id="the_graph" class="hidden" width="700" height="700"></svg>'), document.getElementById('right-col').firstChild);
let svg = this_d3.select("svg");
let node; // set in update()
let link; // set in update()
const simulation = this_d3.forceSimulation()
    .force("link", this_d3.forceLink().id(function (d) {return d.id;}).distance(230).strength(2))
    .force("charge", this_d3.forceManyBody())
    .force("center", this_d3.forceCenter(svg.attr("width") / 2, svg.attr("height") / 2))
    .on("tick", ticked);;
/*--- End d3 stuff ---*/
GM_addStyle(`
.link { stroke: #999;  stroke-width: 3px; }
.idem_parent_thumbs {box-sizing: border-box; max-width:100px; max-height:100px}
.hidden {display:none;}
svg {background-color:#00759f;}
.parent-rule { width:245px; margin:2px; z-index:10; }
`);

const all_posts = [];
function all_post_obj(){
    const post_obj = {};
    for(let post of all_posts){
        post_obj[post.post_id] = post;
    }
    return post_obj;
}
function all_post_nodes(){
    return all_posts.map(e => ({
        id: e.post_id,
        img: e.source
    }));
}
function all_post_links(){
    const links = [];
    for(let post of all_posts){
        for(let child of post.children){
            links.push({
                source: child,
                target: post.post_id
            });
        }
        if(post.parent_id){
            links.push({
                source: post.post_id,
                target: post.parent_id
            });
        }
    }
    return links.filter((e, index) =>
        index == links.findIndex(t => t.source == e.source && t.target === e.target)
    )
}

const page_id = parseInt(window.location.href.match(/\/(\d+).*/)[1]);
download_post_tree(page_id).then(k => {
    const nodes = all_post_nodes();
    const links = all_post_links();
    const post_obj = all_post_obj();
    const viewer_html = `
    <div onclick="document.getElementById('parent_relations').classList.toggle('hidden');this.classList.toggle('status-red');" class="status-notice">
        Toggle Better Parents
    </div>
    <div id="parent_relations" style="width:245px;">
        <div>
            <span class="status-notice" style="width:93px;padding:3px;" id="update_graph_btn">Update Graph</span>
            <span class="status-notice" style="width:60px;padding:3px;" id="add_rule_btn">Add Rule</span>
            <span class="status-notice" style="width:30px;padding:3px;" id="submit_btn">Submit</span>
        </div>
        ${all_posts.map(post => add_rule(post, post_obj)).join('')}
    </div>`;

    const side_bar = document.getElementsByClassName('sidebar').item(0);
    if(side_bar.firstElementChild.className == 'status-notice'){
        side_bar.replaceChild(string_to_node(viewer_html), side_bar.firstElementChild);
    } else if(side_bar.firstElementChild.id == 'child-posts-spacer'){
        side_bar.replaceChild(string_to_node(viewer_html), side_bar.childElements()[1]);
    } else {
        document.getElementsByTagName('svg')[0].parentNode.removeChild(document.getElementsByTagName('svg')[0]);
        return;
    }

    const children = document.getElementById('child-posts');
    if(children){
        children.parentNode.removeChild(children);
    }

    document.getElementById('update_graph_btn').addEventListener('click', do_update);
    document.getElementById('add_rule_btn').addEventListener('click', () => add_rule());
    document.getElementById('submit_btn').addEventListener('dblclick', async function(){
        document.getElementById('submit_btn').innerHTML = '...';
        const rules = get_final_rules();
        for(let rule of rules){
            await set_parent(rule.source, rule.target)
        }
        document.getElementById('submit_btn').parentNode.replaceChild(document.getElementById('submit_btn').cloneNode(true), document.getElementById('submit_btn'));
        document.getElementById('submit_btn').innerHTML = 'Done';
    });
    
    do_update();
});

function add_rule(input_rule, post_obj){
    const block =
    ` <div class="parent-rule status-notice ${input_rule && input_rule.deleted ? 'status-red' : ''}">
            <div onclick="this.parentNode.parentNode.removeChild(this.parentNode);" style="width:1em;background-color:red;">X</div>
            <input class="child_text idem_parent_thumbs" value="${input_rule ? input_rule.post_id : ''}"></input>
            ==>
            <input class="parent_text idem_parent_thumbs" value="${input_rule ? input_rule.parent_id : ''}"></input>
            <br/>
            <a class="child_link">
                <img class="child_img idem_parent_thumbs">
            </a>
            ==>
            <a class="parent_link">
                <img class="parent_img idem_parent_thumbs">
            </a>
        </div>`;
    if(input_rule == undefined){
        document.getElementById('parent_relations').appendChild(string_to_node(block).firstElementChild);
        do_update();
    } else if(input_rule.parent_id == undefined){
        // dont add it;
    } else {
        return block;
    }
}

function get_final_rules(){
    const post_obj = all_post_obj();
    const raw_user_rules = [...document.getElementsByClassName('parent-rule')]
        .map(node => ({
            source: parseInt(node.querySelector('.child_text').value),
            target: parseInt(node.querySelector('.parent_text').value)
        })).filter(rule =>
            !Number.isNaN(rule.source) && !Number.isNaN(rule.target)
         && post_obj[rule.source] && post_obj[rule.target]
         && !post_obj[rule.source].deleted
        );
    const user_rules = raw_user_rules.filter(rule =>
         !post_obj[rule.target].deleted
         && !all_posts.some(e => e.post_id == rule.source && e.parent_id == rule.target)
        );

    return user_rules.concat(
        all_post_links()
            .filter(e => post_obj[e.source].deleted == false && raw_user_rules.every(k=> e.source != k.source))
            .map(e => ({
                source: e.source,
                target: ''
            }))
        );
}

function do_update(){
    const post_obj = all_post_obj();
    const rules = [...document.getElementsByClassName('parent-rule')]
        .map(node => ({
            node: node,
            source: parseInt(node.querySelector('.child_text').value),
            target: parseInt(node.querySelector('.parent_text').value)
        })).filter(rule => !Number.isNaN(rule.source) && !Number.isNaN(rule.target));

    rules.forEach(rule => {
        rule.node.classList.remove('status-red');
        if(post_obj[rule.source].deleted){ rule.node.classList.add('status-red'); }

        rule.node.querySelector('.child_img').src = post_obj[rule.source] ? post_obj[rule.source].source : 'https://upload.wikimedia.org/wikipedia/commons/a/af/Question_mark.png';
        rule.node.querySelector('.parent_img').src = post_obj[rule.target] ? post_obj[rule.target].source : 'https://upload.wikimedia.org/wikipedia/commons/a/af/Question_mark.png';

        rule.node.querySelector('.child_img').title = post_obj[rule.source] ? post_obj[rule.source].flag_message : '';
        rule.node.querySelector('.parent_img').title = post_obj[rule.target] ? post_obj[rule.target].flag_message : '';

        rule.node.querySelector('.child_link').href = '/post/show/'+rule.source;
        rule.node.querySelector('.parent_link').href = '/post/show/'+rule.target;
    });


    const good_rules = rules.filter(rule => post_obj[rule.source] && post_obj[rule.target]);
    const nodes = all_posts.map(e => ({
        id: e.post_id,
        img: e.source
    }));
    update(good_rules, nodes);
}


function string_to_node(string){
    const temp = document.createElement('div');
    temp.innerHTML = string;
    return temp;
}

async function download_post_tree(start_id){
    if(all_posts.some(e => e.post_id == start_id)){ return; } // this post is already handeled
    const cur_post = await get_page(start_id);
    for(let child of cur_post.children){
        await download_post_tree(child);
    }
    if(cur_post.parent_id){
        await download_post_tree(cur_post.parent_id);
    }
    return;
}

async function get_page(page_id){
    if(all_posts.find(e => e.post_id == page_id)){ return all_posts.find(e => e.post_id == page_id); }
    const page_text = await download_post(page_id);

    const parser = new DOMParser();
    const doc = parser.parseFromString(page_text, "text/html");
    const parent_ = doc.querySelector('#post-view > .sidebar > .status-notice > p > a');
    const source_ = doc.querySelector('#post-view > .content > div:nth-child(2) > img');
    const flash_source_ = doc.querySelector('#post-view > .content > div:nth-child(2) > object');
    const webm_source_ = doc.querySelector('#post-view > .content > div:nth-child(2) > video');
    const flag_message_ = doc.querySelector('#post-view > .status-notice.status-red');

    const ret_obj = {
        post_id: page_id,
        children: [...doc.querySelectorAll('#child-posts-expanded-thumbs > .thumb')].map(e=>parseInt(e.id.substring(1))),
        parent_id: parent_ ? parseInt(parent_.innerText.substring(1)) : null,
        source: '',
        deleted: source_ == null && flash_source_ == null && webm_source_ == null,
        flag_message: flag_message_ ? flag_message_.innerText : ''
    };
    if(source_){
        ret_obj.source = source_.src.replace('net/data/', 'net/data/preview/').split('.').slice(0, -1).join('.')+'.jpg'
    } else if(webm_source_){
        ret_obj.source = webm_source_.poster.replace('/sample/', '/preview/').split('.').slice(0, -1).join('.')+'.jpg'
    } else if(flash_source_){
        ret_obj.source = 'https://upload.wikimedia.org/wikipedia/commons/thumb/archive/2/2c/20130102125302%21Adobe_Flash_Professional_icon.png/120px-Adobe_Flash_Professional_icon.png'
    } else {
        ret_obj.source = 'https://e621.net/images/deleted-preview.png'
    }
    all_posts.push(ret_obj);
    return ret_obj;
}

async function add_this_to_set(set_id){
    return new Promise(function(resolve, reject){
        const url = 'https://e621.net/set/add_post.xml?set_id='+set_id+'&name='+name+'&password_hash='+api_key+'&post_id='+page_id;
		const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
					resolve();
                } else if(this.status != 0 && this.status != 200){
					resolve();
                }
            };
		xhttp.open('POST', url, true);
        xhttp.send();
    });
}

async function set_parent(post_id, parent_id){
    return new Promise(function(resolve, reject){
        const xhttp = new XMLHttpRequest();
        const url = 'https://e621.net/post/update.json?name='+name+'&password_hash='+api_key+'&id='+post_id+'&post[parent_id]='+parent_id;

        xhttp.onreadystatechange = function() {
            if(xhttp.readyState == 4 && xhttp.status == 200) {
                resolve(xhttp);
            }
        }
        xhttp.open('POST', url, true);
        xhttp.send();
    });
}

async function download_post(id){
    return new Promise(function(resolve, reject){setTimeout(function(){
       const xhttp = new XMLHttpRequest();
       xhttp.onreadystatechange = function() {
           if (this.readyState == 4 && this.status == 200) {
               resolve(xhttp.responseText);
           } else if(this.status != 0 && this.status != 200){
               reject('Blip #'+id+' gave response '+this.status);
           }
       };

       xhttp.open('GET', 'https://e621.net/post/show/'+id, true);
       xhttp.send();
    })}, 1000);
}

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
    document.getElementById('the_graph').classList.remove('hidden');
    link = svg.selectAll(".link")
        .data(links)
        .enter()
        .append("line")
		.attr("class", "link")
        .attr('marker-end','url(#arrowhead)')

    node = svg.selectAll(".node")
        .data(nodes)
		.enter()
		.append("image")
  		.attr("xlink:href", d => d.img)
		.call(this_d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
        )


    simulation.nodes(nodes)
    simulation.force("link").links(links);
}

function ticked() {
	if(!link || !node){ return; }
    // move the lines
	link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

	// move the nodes
    node.attr("transform", d => "translate(" + d.x + ", " + d.y + ")");
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
