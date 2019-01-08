// todo make this whole thing cleaner
(async function(){
	// todo apply settings on parents from BP
	const apply_thumb = (await Opt.get('TH_thumb')) ? 'thumb' : undefined;
	const apply_dtex = (await Opt.get('TH_dtext')) ? 'thumb_dtext' : undefined;
	const apply_avatar = (await Opt.get('TH_avatar')) ? 'thumb_avatar' : undefined;
	const apply_string = [apply_thumb, apply_dtex, apply_avatar]
		.filter(e => e)
		.map(e => '.'+e+' img')
		.join(', ');

	if(apply_string == ''){ return; }
	document.body.innerHTML += '<div id="idt_image_bank"></div>';
	
	add_script(`
		Array.from(document.querySelectorAll('${apply_string}'))
			.forEach(n => n.addEventListener('mousemove', (e) => {
				const id = e.path[2].id.substring(1);
				const img = document.getElementById('ith_'+id);			
				if(img){ return; }
				document.getElementById('idt_image_bank').innerHTML += '<img id="ith_'+id+'" src="'+Post.posts.get(id).file_url+'" class="ith_img">';
			}));
	`);

	Array.from(document.querySelectorAll(apply_string))
		.forEach(n => {
			n.title = '';
			n.addEventListener('mousemove', display_image);
			n.addEventListener('mouseout', hide_image);
		});

	function display_image(e){
		// todo webm's do not play/ give invalid image errors
		const img_id = e.path[2].id.substring(1);
		const img = document.getElementById('ith_'+img_id);
		img.style.display = 'block';
		
		const viewport_top = e.pageY - e.clientY;
		const viewport_bot = viewport_top + window.innerHeight;
		const viewport_left = e.pageX - e.clientX;
		const viewport_right = viewport_left + window.innerWidth;

		const img_width = img.offsetWidth + 10;
		const img_height = img.offsetHeight + 10;

		// todo window.innerWidth doesnt count scrollbars
		if(viewport_right < img_width + e.pageX){
			img.style.left = (e.pageX - img_width)+'px';
		} else {
			img.style.left = e.pageX+10+'px';
		}

		if(viewport_bot < e.pageY + img_height){
			img.style.top = (viewport_bot - img_height)+'px'
		} else {
			img.style.top = (e.pageY+10)+'px';
		}
	}
	
	function hide_image(e){
		const img_id = e.path[2].id.substring(1);
		document.getElementById('ith_'+img_id).style.display = 'none';
	}

	function add_script(text){
		const script = document.createElement('script');
		script.textContent = text;
		document.head.appendChild(script);
		script.remove();
	}
})();