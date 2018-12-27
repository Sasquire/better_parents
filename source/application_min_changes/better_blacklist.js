const BB = {};
Object.defineProperty(window, 'Takedown', {
    get() { return _Takedown; },
    set(newValue) {
        _Takedown = newValue;
        inject_my_script()
    },
});

function inject_my_script() {
   Post.register = BB.register;
   Post.attempt_to_blacklist = BB.attempt_to_blacklist;
   Post.apply_blacklists = BB.apply_blacklists;
   Post.init_blacklisted = BB.init_blacklisted;
   console.log('huh')
}
BB.fix_iterators = function(){
	// Array.reduce
	Object.defineProperty(Array.prototype,'reduce',{value:function(callback ){if(this===null){throw new TypeError('Array.prototype.reduce called on null or undefined')}if(typeof callback!=='function'){throw new TypeError(callback+' is not a function')}var o=Object(this);var len=o.length>>>0;var k=0;var value;if(arguments.length>=2){value=arguments[1]}else{while(k<len&&!(k in o)){k+=1}if(k>=len){throw new TypeError('Reduce of empty array with no initial value')}value=o[k++]}while(k<len){if(k in o){value=callback(value,o[k],k,o)}k+=1}return value}})
	// Array.filter
	Array.prototype.filter=function(func,thisArg){'use strict';if(!((typeof func==='Function'||typeof func==='function')&&this)){throw new TypeError()}var len=this.length>>>0,res=[len],t=this,c=0,i=-1;if(thisArg===undefined){while(++i!==len){if(i in this){if(func(t[i],i,t)){res[c++]=t[i]}}}}else{while(++i!==len){if(i in this){if(func.call(thisArg,t[i],i,t)){res[c++]=t[i]}}}}res.length=c;return res}
}

BB.register = function(post){
	post.tags = post.tags.split(/\s+/g);
	post.bl_compare = new Set(post.tags);
	post.bl_compare.add(`rating:${post.rating.charAt(0)}`);
	post.bl_compare.add(`status:${post.status}`);
	post.bl_compare.add(`user:${post.author.toLowerCase()}`);
	post.bl_compare.add(`id:${post.id}`);
	post.bl_compare.add(`type:${post.file_ext}`);
	post.bl_compare.add(`width:${post.width}`);
	post.bl_compare.add(`height:${post.height}`);
	Post.posts.set(post.id, post)
}

BB.attempt_to_blacklist = function(post_kv) {
	const post_value = Post.posts.get(post_kv.key);
	post_value.should_be_blacklisted = Post.enabled_blacklists.some(blacklist => {
			const exclude = blacklist.exclude.some(tag => post_value.bl_compare.has(tag));
			if(exclude){ return false; } // display the image regardless
			const require = blacklist.require.every(tag => post_value.bl_compare.has(tag));
			if(!require){ return false; } // there is nothing worth blacklisting
		
			blacklist.hits++;
			if(blacklist.disabled){ return false; } else { return true; }
	});
},

BB.apply_blacklists = function() {
	Post.all_blacklists.each(bl_rule => bl_rule.hits = 0);
	Post.enabled_blacklists = Post.all_blacklists.filter(bl => bl.disabled == false);
	Post.posts.each(Post.attempt_to_blacklist);

	const thumb_nodes = Array.from(document.getElementsByClassName('thumb'));
	if(Cookie.get("blacklist_avatars") == "true"){
		thumb_nodes.concat(Array.from(document.getElementsByClassName('thumb_avatar')));
	}

	const update_node = function(preview, url, width, height, class_mod){
		if(Post.blacklist_options.replace){
			preview.img.src = url;
			preview.img.setAttribute('data-original', url);
			preview.img.width = width;
			preview.img.height = height;
		} else {
			class_mod('blacklisted');
		}
	}

	thumb_nodes.map(node => { return {
		span: node,
		img: node.firstChild.firstChild,
		post: Post.posts.get(parseInt(node.id.slice(1)))
	}}).each(preview => {
		if(preview.post.should_be_blacklisted){
			update_node(preview, "/images/blacklisted-preview.png", 150, 150, preview.span.addClassName.bind(preview.span));
		} else {
			update_node(preview, preview.post.preview_url, preview.post.preview_width, preview.post.preview_height, preview.span.removeClassName.bind(preview.span));
		}
	});

	const count = Post.all_blacklists.reduce((acc, e) => acc + e.hits, 0);
	const q = document.getElementById('blacklist-count');
	if(q){
		console.log(q)
		q.innerHTML = count;
	}
	return count;
}

BB.init_blacklisted = function(options) {
	Post.blacklisted = [];
	Post.blacklist_options = Object.extend(Post.blacklist_options, options);

	const tag_row_arr_to_obj = function(tag_row_arr){
		return tag_row_arr.reduce((acc, tag) => {
			if(tag.charAt(0) == "-"){
				acc.exclude.push(tag.slice(1));
			} else {
				acc.require.push(tag);
			}
			return acc;
		}, { // inital config
			tags: tag_row_arr,
			require: [],
			exclude: [],
			disabled: false,
			hits: 0
		});
	}	
	
	// previously raw_get wasn't used meaning `dungeons_&_dragons`
	// could not have been blacklisted.
	Post.all_blacklists = Cookie.raw_get("blacklisted_tags")
		.split('&')
		.map(Cookie.unescape)
		.map(tag_row => tag_row.replace(/(rating:[qes])\w+/g, '$1'))
		.map(tag_row => tag_row.split(/\s+/)) // old code checked something
		.map(tag_row_arr_to_obj);
	
	const sidebar = document.getElementById("blacklisted-sidebar");
	if (sidebar == null) { return Post.apply_blacklists(); }
	if (Post.apply_blacklists() == 0) { return sidebar.hide(); }
	sidebar.show();

	const first_button = Element._getContentFromAnonymousElement('',
	`	<li>
			<a class="blacklisted-tags" href="#">\xBB Toggle Blacklist</a>
		</li>	`)[1];
	first_button.observe('click', () => {
		Post.blacklist_on = !Post.blacklist_on;
		Post.all_blacklists.each(b => b.disabled = !Post.blacklist_on);
		Post.apply_blacklists();
		Array.from(document.getElementsByClassName('blacklisted-tags'))
			.slice(1)
			.concat(Array.from(document.getElementsByClassName('blacklisted-tags-disabled')))
			.each(node => {
				node.className = Post.blacklist_on ? "blacklisted-tags" : "blacklisted-tags-disabled";
			});
	});
	
	const rest_buttons = Post.all_blacklists
		.filter(blacklist => blacklist.hits > 0) // if this blacklist rule has not been used
		.map(blacklist => {
			const row = Element._getContentFromAnonymousElement('',
			`	<li>
					<a class="blacklisted-tags" href="#">\xBB ${blacklist.tags.join(' ')}</a>
					<span class="post-count"> ${blacklist.hits} </span>
				</li>	`)[1];
			row.firstElementChild.observe("click", (event) => {
				blacklist.disabled = !blacklist.disabled;
				event.target.className = blacklist.disabled ? "blacklisted-tags-disabled" : "blacklisted-tags";
				Post.apply_blacklists();
			});
			return row;
		});
	const list = document.getElementById("blacklisted-list");
	[first_button, ...rest_buttons].each(list.appendChild);
}