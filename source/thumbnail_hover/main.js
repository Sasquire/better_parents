(function(){
	/*
	const links = Array.from(document.getElementsByClassName('thumb'))
		.map(n => n.querySelector('a'))
	const images = links.map(n => {
		const md5 = n.querySelector('img').src.match(/[0-9abcdef]{32}|download-preview\.png|deleted-preview.png/)[0]
		if(md5.length != 32){ return `https://static.e621.net/images${md5}`}
		return md5;
	})
	console.log(images) */

	const script = document.createElement('script');
	script.textContent = `
		const thumbs = Array.from(document.getElementsByClassName('thumb'));
		const posts = thumbs.map(e => parseInt(e.id.substring(1)))
			.forEach(n => {
				document.body.innerHTML += '<img id="ith_'+n+'" src="'+Post.posts.get(n).file_url+'" class="ith_img">'
			})
	`
	document.head.appendChild(script);
	script.remove();

	Array.from(document.querySelectorAll('.thumb img'))
		.forEach(n => n.addEventListener('mousemove', (e) => {
			//Array.from(document.getElementsByClassName('ith_img')).forEach(n => n.style.display = 'none');
			const img = document.getElementById('ith_'+(e.path[2].id.substring(1)));
			img.style.display = 'block';
			img.style.left = e.clientX+'px';
			img.style.top = e.clientY+'px';
		}));

		Array.from(document.querySelectorAll('.thumb img'))
		.forEach(n => n.addEventListener('mouseout', (e) => 
			document.getElementById('ith_'+(e.path[2].id.substring(1))).style.display = 'none'
		));
})();