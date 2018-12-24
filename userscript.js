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
/*--- Start config ---*/
const username = 'name';
const api_key = 'api-key';
const sets = [
    // {  id: 12213,
    //    name: '50-50\'s Socks!' },
    // {  id: 12187,
    //    name: '3, it's the magic number' }
];
const on_by_default = true;
/*--- End config ---*/
/*--- Start d3 stuff ---*/
const this_d3 = d3;
document.getElementById('right-col').insertBefore(string_to_node('<svg id="the_graph" width="700" height="700"></svg>'), document.getElementById('right-col').firstChild);
let svg = this_d3.select("svg");
let node;
let link;
const simulation = this_d3.forceSimulation()
    .force("link", this_d3.forceLink().id(function (d) {return d.id;}).distance(230).strength(2))
    .force("charge", this_d3.forceManyBody())
    .force("center", this_d3.forceCenter(svg.attr("width") / 2, svg.attr("height") / 2))
    .on("tick", ticked);;
/*--- End d3 stuff ---*/
/*--- Start globals ---*/
const page_id = parseInt(window.location.href.match(/\/(\d+).*/)[1]);
const all_posts = [];
/*--- End globals --- */

if (typeof GM_addStyle === 'function') {
    GM_addStyle(`
    .link { stroke: #999;  stroke-width: 3px; }
    .parent-rule > input {width:96px; box-shadow: none;}
    .parent-rule > a > img {height:auto; width:auto; max-width:100px; max-height:100px;}
    .parent-rule > a { width: 100px; display: inline-block; }
    .hidden {display:none;}
    svg {background-color:#00759f;}
    .parent-rule { z-index:10; }
    #parent_viewer_button_div > div { display:inline-block; margin-bottom:5px; padding:3px;}
    #parent_relations { width:236px;}
    #better_parents_toggler{margin-bottom:5px;}
    .status-notice {top:0px;}
    .status-orange {background-color: #bb8811; border: 1px solid #8c650c;}
    .ibp_button { padding: 0px; border: 1px solid;}
    .remove_btn {background-color:red; border-color:orangered; }
    .collapse_btn {background-color:orange; border-color:orangered; }
    `);
}

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

download_post_tree(page_id).then(k => {
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
});

function toggle_visibility(){
    document.getElementById('parent_relations').classList.toggle('hidden');
    document.getElementById('the_graph').classList.toggle('hidden');
    document.getElementById('better_parents_toggler').classList.toggle('status-red');
}

function add_rule(input_rule){
    input_rule = input_rule || {post_id:'', parent_id:''};
    const block =
    ` <div class="parent-rule status-notice">
            <button class="remove_btn ibp_button">Remove Rule</button>
            <button class="collapse_btn ibp_button">Collapse</button>
            <br/>

            <input class="child_text" value="${input_rule.post_id}"></input>
            ⇨
            <input class="parent_text" value="${input_rule.parent_id}"></input>

            <br/>

            <a class="child_link"><img class="child_img"></a>
            ⇨
            <a class="parent_link"><img class="parent_img"></a>
        </div>`;
    if(input_rule.parent_id != null){
        document.getElementById('parent_relations').appendChild(string_to_node(block).firstElementChild);
        do_update();
    }
}

function get_custom_rules(options){
    options = options || {};
    const post_obj = all_post_obj();
    return [...document.getElementsByClassName('parent-rule')]
        .map(node => ({
            node: node,
            source: parseInt(node.querySelector('.child_text').value),
            target: parseInt(node.querySelector('.parent_text').value)
        }))
        .map(obj => {obj.source_obj = post_obj[obj.source]; obj.target_obj = post_obj[obj.target]; return obj;})
        .filter(rule => {
            let ret = true;
            if(options.source_number){ ret = ret && Number.isNaN(rule.source) == false; }
            if(options.target_number){ ret = ret && Number.isNaN(rule.target) == false; }
            if(options.source_exists){ ret = ret && rule.source_obj; }
            if(options.target_exists){ ret = ret && rule.target_obj; }
            if(options.source_ndeleted){ ret = ret && rule.source_obj && rule.source_obj.deleted == false; }
            if(options.target_ndeleted){ ret = ret && rule.target_obj && rule.target_obj.deleted == false; }
            if(options.duplicate_remove){ ret = ret && all_posts.some(r => r.post_id == rule.source && r.parent_id == rule.target) == false; }
            return ret;
        });
}

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
}

function remove_rule(e){
    this.parentNode.remove()
    do_update();
}

function collapse_rule(e){
    const parent_rule = this.parentNode;
    const child_id = parseInt(parent_rule.querySelector('.child_text').value);
    const parent_id = parseInt(parent_rule.querySelector('.parent_text').value);
    get_custom_rules({})
        .filter(p => p.target == child_id && p.source_obj.deleted == false && p.source != parent_id)
        .forEach(p => {p.node.querySelector('.parent_text').value = parent_id});
    if(parent_rule.classList.contains('status-red') == false){
        parent_rule.remove();
    }
    do_update();
}

function do_update(){
    get_custom_rules({}).forEach(rule => {
        rule.node.classList.remove('status-red');
        rule.node.querySelector('.child_img').src = 'https://raw.githubusercontent.com/Sasquire/better_parents/master/unknown.png';
        rule.node.querySelector('.parent_img').src = 'https://raw.githubusercontent.com/Sasquire/better_parents/master/unknown.png';
        rule.node.querySelector('.child_img').title = 'Unkown Post';
        rule.node.querySelector('.parent_img').title = 'Unkown Post';
        rule.node.querySelector('.child_link').href = 'https://e621.net/';
        rule.node.querySelector('.parent_link').href = 'https://e621.net/';
    });

    get_custom_rules({source_exists:true}).forEach(rule => {
        if(rule.source_obj.deleted){ rule.node.classList.add('status-red'); }
        rule.node.querySelector('.child_img').src = rule.source_obj.source;
        rule.node.querySelector('.child_img').title = rule.source_obj.flag_message;
        rule.node.querySelector('.child_link').href = '/post/show/'+rule.source;
    });

    get_custom_rules({target_exists:true}).forEach(rule => {
        rule.node.querySelector('.parent_img').src = rule.target_obj.source;
        rule.node.querySelector('.parent_img').title = rule.target_obj.flag_message;
        rule.node.querySelector('.parent_link').href = '/post/show/'+rule.target;
    });

    [...document.getElementsByClassName('remove_btn')].forEach(btn => {
        btn.addEventListener('click', remove_rule);
    });

    [...document.getElementsByClassName('collapse_btn')].forEach(btn => {
        btn.addEventListener('click', collapse_rule);
    });

    const good_rules = get_custom_rules({source_exists:true, target_exists:true})
    const good_nodes = all_post_nodes()
    update(good_rules, good_nodes);
}

function string_to_node(string){
    const temp = document.createElement('div');
    temp.innerHTML = string;
    return temp;
}
// linear-gradient(to right, RGB(110, 175, 233), RGB(110, 175, 233));
function highlight(post_id){
    const all_fields = [...document.getElementsByClassName('child_text')].concat([...document.getElementsByClassName('parent_text')]);
    all_fields.forEach(n => {n.parentNode.style.backgroundImage = ''});
    all_fields
        .filter(n => parseInt(n.value) == post_id)
        .forEach(n => {n.parentNode.style.backgroundImage = 'linear-gradient(rgba(0, 255, 0, 0.3), rgba(0, 255, 0, 0.3))'})
}

async function download_post_tree(start_id){
    if(all_posts.some(e => e.post_id == start_id)){ return; } // this post is already handeled
    const cur_post = await get_post(start_id);
     for(let child of cur_post.children){
        await download_post_tree(child);
    }
    if(cur_post.parent_id){
        await download_post_tree(cur_post.parent_id);
    }
    return;
}

async function get_post(post_id){
    if(all_posts.find(e => e.post_id == post_id)){ return all_posts.find(e => e.post_id == post_id); }
    const page_text = post_id != page_id ? await download_post(post_id) : document.documentElement.outerHTML;

    const parser = new DOMParser();
    const doc = parser.parseFromString(page_text, "text/html");
    const parent_ = doc.querySelector('#post-view > .sidebar > .status-notice > p > a');
    const flag_message_ = doc.querySelector('#post-view > .status-notice.status-red');

    const ret_obj = {
        post_id: post_id,
        children: [...doc.querySelectorAll('#child-posts-expanded-thumbs > .thumb')].map(e=>parseInt(e.id.substring(1))),
        parent_id: parent_ ? parseInt(parent_.innerText.substring(1)) : null,
        source: get_source_image(doc),
        deleted: flag_message_ != null,
        flag_message: flag_message_ ? flag_message_.innerText : ''
    };

    all_posts.push(ret_obj);
    return ret_obj;
}

function get_source_image(doc){
    const source_ = doc.querySelector('#image');
    const flash_source_ = doc.querySelector('#post-view object');
    const webm_source_ = doc.querySelector('#webm-container');
    if(source_){
        return source_.dataset.sample_url.replace(/(\/data\/sample\/)|(\/data\/)/, '/data/preview/').split('.').slice(0, -1).join('.')+'.jpg';
    } else if(webm_source_){
        return webm_source_.poster.replace(/(\/data\/sample\/)|(\/data\/)/, '/data/preview/').split('.').slice(0, -1).join('.')+'.jpg';
    } else if(flash_source_){
        return 'https://raw.githubusercontent.com/Sasquire/better_parents/master/flash.png';
    } else {
        return 'https://e621.net/images/deleted-preview.png';
    }
}

async function add_this_to_set(set_id){
    const url_obj = new URL('https://e621.net/set/add_post.json');
    url_obj.searchParams.set('set_id', set_id);
    url_obj.searchParams.set('name', username);
    url_obj.searchParams.set('password_hash', api_key);
    url_obj.searchParams.set('post_id', page_id);
    let fetch_req = new Request(url_obj.href);

    document.getElementById('set_adder_'+set_id).classList.add('status-orange');
    const response = await fetch(fetch_req, {'method': 'POST'}).then(res => res.text());
    document.getElementById('set_adder_'+set_id).classList.remove('status-orange');
    document.getElementById('set_adder_'+set_id).classList.add('status-green');
    return response;
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

async function download_post(id){
    const url_obj = new URL('https://e621.net/post/show');
    url_obj.searchParams.set('id', id);

    let fetch_req = new Request(url_obj.href);
    return fetch(fetch_req, {'method': 'GET'}).then(res => res.text());
}
/*--- End of all the fun code ---*/

/*--- Start d3 stuff I'm not sure about ---*/
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
        .attr("width", "100px")
        .attr("height", "100px")
		.call(this_d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
        )

    node.append("svg:title")
        .text(d => d.id)

    node.on('mouseover', (e) => highlight(e.id))
    node.on('mouseout', (e) => highlight())

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
/*--- End d3 stuff I'm not sure about ---*/

// reimplements the proper Array.reduce that application-min.js has removed
Object.defineProperty(Array.prototype,'reduce',{value:function(callback ){if(this===null){throw new TypeError('Array.prototype.reduce called on null or undefined')}if(typeof callback!=='function'){throw new TypeError(callback+' is not a function')}var o=Object(this);var len=o.length>>>0;var k=0;var value;if(arguments.length>=2){value=arguments[1]}else{while(k<len&&!(k in o)){k+=1}if(k>=len){throw new TypeError('Reduce of empty array with no initial value')}value=o[k++]}while(k<len){if(k in o){value=callback(value,o[k],k,o)}k+=1}return value}})
// whyy. this one is array.filter
Array.prototype.filter=function(func,thisArg){'use strict';if(!((typeof func==='Function'||typeof func==='function')&&this)){throw new TypeError()}var len=this.length>>>0,res=[len],t=this,c=0,i=-1;if(thisArg===undefined){while(++i!==len){if(i in this){if(func(t[i],i,t)){res[c++]=t[i]}}}}else{while(++i!==len){if(i in this){if(func.call(thisArg,t[i],i,t)){res[c++]=t[i]}}}}res.length=c;return res}
