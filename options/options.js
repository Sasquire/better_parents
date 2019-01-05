async function saveOptions(e) {
	// todo make this not bad either
	return Promise.all(Object.keys(Opt.items).map(key => 
		Opt.set(key, document.getElementById(key)[Opt.items[key].type=='text'?'value':'checked'])
	));
}

async function restoreOptions() {
	// todo make this not bad
	document.getElementById('added_options').innerHTML = (await Opt.get_all())
		.map(e => {
			const static = Opt.items[e.key];
			if(static.type == 'text'){
				return `<input placeholder="${static.info}" title="${static.info}" type="text" id="${e.key}" value="${e.val}"></input>`
			} else if(static.type == 'checkbox'){
				return `<input title="${static.info}" type="checkbox" id="${e.key}" ${e.val ? 'checked' : ''}>${static.info}</input>`
			}
		})
		.join('<br>');
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#save').addEventListener('click', saveOptions);
document.querySelector('#load').addEventListener('click', restoreOptions);
document.querySelector('#reset').addEventListener('click', Opt.clear);