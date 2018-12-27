//console.log(Post.apply_blacklists);
/*console.log('hey')
Post.apply_blacklists = function(){
	console.log('poo');
}
console.log(Post) */


function inject_my_script() {
   Post.apply_blacklists = function(){console.log('bepis)')}
}

Object.defineProperty(window, 'Takedown', {
    get() { return _Takedown; },
    set(newValue) {
        _Takedown = newValue;
        inject_my_script()
    },
});