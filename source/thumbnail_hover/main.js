// todo make this whole thing cleaner
(function(){
	document.body.innerHTML += '<div id="idt_image_bank"></div>';
	add_script(`
		Array.from(document.querySelectorAll('.thumb img'))
			.forEach(n => n.addEventListener('mousemove', (e) => {
				const id = e.path[2].id.substring(1);
				const img = document.getElementById('ith_'+id);			
				if(img){ return; }
				document.getElementById('idt_image_bank').innerHTML += '<img id="ith_'+id+'" src="'+Post.posts.get(id).file_url+'" class="ith_img">';
			}));
	`);

	Array.from(document.querySelectorAll('.thumb img'))
		.forEach(n => {
			n.title = '';
			n.addEventListener('mousemove', display_image);
			n.addEventListener('mouseout', hide_image);
		});

	function display_image(e){
		// todo broken when scrolling
		// todo webm's do not play/ give invalid image errors
		const img = document.getElementById('ith_'+(e.path[2].id.substring(1)));
		img.style.display = 'block';
		
		// todo problems when looking at posts on the bottom of the page
		img.style.top = e.clientY+10+'px';
		
		// todo window.innerWidth doesnt count scrollbars
		if(e.clientX+10+img.offsetWidth > window.innerWidth){
			img.style.left = e.clientX - (img.width+10)+'px';
		} else {
			img.style.left = e.clientX+10+'px';
		}
	}
	
	function hide_image(e){
		document.getElementById('ith_'+(e.path[2].id.substring(1))).style.display = 'none';
	}

	function add_script(text){
		const script = document.createElement('script');
		script.textContent = text;
		document.head.appendChild(script);
		script.remove();
	}
})();