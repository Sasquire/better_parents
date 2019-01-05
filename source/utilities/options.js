Opt = {};
Opt.items = {
	'api_key': {type:'text', default: '', info:'api key'},
	'username': {type:'text', default: '', info:'username'},
	'BP_reduce_relations': {type:'checkbox', default: false, info:'Reduce Relations on Start'},
	'BP_hide_relations': {type:'checkbox', default: false, info:'Hide Relations on Start'},
	'BP_hide_graph': {type:'checkbox', default: true, info:'Hide Graph on Start'},
	'BP_auto_download': {type:'checkbox', default: true, info:'Download Relations on Start'},
	'BP_bright_highlights': {type:'checkbox', default: false, info:'Brighter colors for highlighting'}
};

// todo error handling on all of these?
Opt.get = async function(key){
	return new Promise(function(resolve, reject){
		chrome.storage.sync.get(key, function(val){
			if(val[key] == undefined){
				resolve(Opt.items[key].default)
			} else {
				resolve(val[key]);
			}
		});
	});
};

// todo fix my stupid code
Opt.get_all = async function(key){
	return Promise.all(Object.keys(Opt.items)
		.map(async e => ({'key':e, 'val': await Opt.get(e)})));
// alt version
//	return (await Promise.all(Object.keys(Opt.items)
//		.map(async e => ({'key':e, 'val': await Opt.get(e)}))
//	)).reduce((acc, e) => {acc[e.key] = e.val; return acc;}, {});
};

Opt.clear = async function(){
	return new Promise(function(resolve, reject){
		chrome.storage.sync.clear(resolve);
	});
};

Opt.set = async function(key, value){
	return new Promise(function(resolve, reject){
		const thing = {};
		thing[key] = value;
		chrome.storage.sync.set(thing, resolve);
	});
};