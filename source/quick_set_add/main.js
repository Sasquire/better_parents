(async function(){
	if(await Opt.get('QSA_disable')){ return; }

	const page_id = parseInt(window.location.href.match(/\/(\d+).*/)[1]);
	const ignore_sets = (await Opt.get('QSA_ignore')).split(',').map(e => parseInt(e));
	const sets = (await download_sets()).filter(e => ignore_sets.includes(e.id) == false);

	document.getElementById('subnav').innerHTML += `
		<ul id="iqsa_ul" class="flat-list">
			${sets.map(e => `<li><button value="${e.id}" class="iqsa_btn">${e.name}</button></li>`).join('')}
		</ul>`;

	const script = document.createElement('script');
	script.textContent = `Array.from(document.getElementsByClassName('iqsa_btn'))
		.forEach(n => n.onclick = function(){
			PostSet.add_post(${page_id}, this.value);
		})`;
	document.head.appendChild(script);
	script.remove();

	async function download_sets(){
		const url_obj = new URL('https://e621.net/set/select')
		url_obj.searchParams.set('id', page_id);
		const fetch_req = new Request(url_obj.href)
		const page_text = await fetch(fetch_req).then(res => res.text());
		const doc = new DOMParser().parseFromString(page_text, "text/html");
		return Array.from(doc.getElementsByTagName('option'))
			.map(n => ({
				id: parseInt(n.value),
				name:n.innerText
			}));
	};
}());