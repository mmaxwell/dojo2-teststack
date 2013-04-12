/**
 * Proxy topics to parent frame
 */
define([
	'dojo-ts/aspect',
	'dojo-ts/topic',
	'dojo-ts/on',
	'require'
], function (aspect, topic, on, require) {
	var parent, script, option, options;

	/**
	 * The thought process here is that this would still work with reporters like the HTML reporter, proxying the topics with aspect and allowing the arguments to persist
	 */
	 aspect.after(topic, 'publish', function () {
	 	parent.postMessage(arguments, '*');
	 }, true);

	on(window, 'message', function (event) {
		var data = event.data;
		
		if (data === 'parent') {
			parent = event.source;
			parent.postMessage('ready', '*');
		} else {
			require([data.path, 'teststack/client']);
		}
	});
});