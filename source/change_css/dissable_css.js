// dissable all stylesheets from e621.net
// apparently `chrome` is the standard
chrome.webRequest.onBeforeRequest.addListener(
	() => ({cancel:true}),
	{urls:["*://e621.net/*"], types:["stylesheet"]},
	["blocking"]
);