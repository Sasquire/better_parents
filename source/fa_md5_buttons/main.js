FA_MD5.post_info = function(){
	const [top_half,,] = document.querySelectorAll('#page-submission > table > tbody > tr > td > :first-child');
	const [, post_content, title_bar,,] = top_half.querySelectorAll('tbody > tr > :first-child');
	const actions_bar = post_content.querySelector('.alt1.actions.aligncenter');
	const actions = Array.from(actions_bar.children);

	const full_url = 'https:' + actions.find(e => e.textContent == 'Download').firstElementChild.href
	const [, timestamp, orig_filename, file_ext] = full_url.match(/.*\/\d+\/(\d+)\..*?_(.*)\.(.*)/);
	const post_id = parseInt(actions.find(e => e.textContent == 'Full View').firstElementChild.href.match(/\/full\/(\d+)\//)[1]);
	const author_name = title_bar.querySelector('a').textContent;

	return {
		full_url: generate_full_url(author_name, new Date(timestamp * 1000), orig_filename, file_ext),
		thumb_url: (res = 400) => generate_thumb_url(post_id, res, new Date(timestamp * 1000)),
	}

	function generate_thumb_url(post_id, res, created_at){
		// known good res values [100, 200, 300, 400, 600, 800]
		return `https://t.facdn.net/${post_id}@${res}-${created_at.getTime() / 1000}.jpg`
	}

	function generate_full_url(name, created_at, orig_filename, file_ext){
		const reduced_name = name.replace('_', '').toLowerCase();
		const timestamp = created_at.getTime() / 1000;
		return `https://d.facdn.net/art/${reduced_name}/${timestamp}/${timestamp}.${reduced_name}_${orig_filename}.${file_ext}`;
	}
};

FA_MD5.url_md5 = async function(url){
	return new Promise(async function(resolve, reject){
		const fetch_req = new Request(url);
		const blb = await fetch(fetch_req, {'method': 'GET'}).then(res => res.blob());
		const reader = new FileReader();
		reader.readAsArrayBuffer(blb);
		reader.onloadend = function () {
			resolve(SparkMD5.ArrayBuffer.hash(reader.result));
		}
	});
};

(async function(){
	if(await Opt.get('FA_MD5_disable')){ return; }
	
	const info = FA_MD5.post_info();
	const md5s = await Promise.all([
		FA_MD5.url_md5(info.thumb_url(400)),
		FA_MD5.url_md5(info.full_url)
	]);
	document.getElementsByClassName('stats-container')[0].innerHTML += 
	`<b>full image hash:</b>
	${md5s[1]}
	<b>thumbnail hash:</b>
	${md5s[0]}`
})();

