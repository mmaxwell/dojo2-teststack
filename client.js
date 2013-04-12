/*jshint node:true */
if (typeof process !== 'undefined' && typeof define === 'undefined') {
	(function () {
		var req = require('./dojo/dojo'),
			pathUtils = require('path');

		req({
			baseUrl: pathUtils.resolve(__dirname, '..'),
			packages: [
				{ name: 'dojo-ts', location: pathUtils.resolve(__dirname, 'dojo') },
				{ name: 'teststack', location: __dirname },
				{ name: 'chai', location: pathUtils.resolve(__dirname, 'chai'), main: 'chai' }
			]
		}, [ 'teststack/client' ]);
	})();
}
else {
	define([
		'./main',
		'./lib/args',
		'./lib/reporterManager',
		'./lib/Suite',
		'dojo-ts/topic',
		'require'
	], function (main, args, reporterManager, Suite, topic, require) {
		if (!args.config && !args.suite) {
			throw new Error('Missing "config" and "test" argument');
		}

		if (args.config) {
			require([ args.config ], function (config) {
				// TODO: Use of the global require is required for this to work because config mechanics are in global
				// require only in the Dojo loader; this should probably not be the case
				this.require(config.loader);

				if (!args.suites) {
					args.suites = config.suites;
				}

				// args.suites might be an array or it might be a scalar value but we always need deps to be a fresh array.
				var deps = args.sandbox ? [] : [].concat(args.suites);
				
				if (!args.reporters) {
					if (config.reporters) {
						args.reporters = config.reporters;
					}
					else {
						console.info('Defaulting to "console" reporter');
						args.reporters = 'console';
					}
				}

				// TODO: This is probably a fatal condition and so we need to let the runner know that no more information
				// will be forthcoming from this client
				if (typeof window !== 'undefined') {
					window.onerror = function (message, url, lineNumber) {
						var error = new Error(message + ' at ' + url + ':' + lineNumber);
						topic.publish('/error', error);
						topic.publish('/client/end', args.sessionId);
					};
				}
				else if (typeof process !== 'undefined') {
					process.on('uncaughtException', function (error) {
						topic.publish('/error', error);
					});
				}

				args.reporters = [].concat(args.reporters).map(function (reporterModuleId) {
					// Allow 3rd party reporters to be used simply by specifying a full mid, or built-in reporters by
					// specifying the reporter name only
					if (reporterModuleId.indexOf('/') === -1) {
						reporterModuleId = './lib/reporters/' + reporterModuleId;
					}
					return reporterModuleId;
				});

				deps = deps.concat(args.reporters);

				// A hash map, { reporter module ID: reporter definition }
				var reporters = [].slice.call(arguments, arguments.length - args.reporters.length).reduce(function (map, reporter, i) {
					map[args.reporters[i]] = reporter;
					return map;
				}, {});
				
				reporterManager.add(reporters);

				if (!args.sandbox) {
					// Client interface has only one environment, the current environment, and cannot run functional tests on
					// itself
					main.suites.push(new Suite({ name: 'main', sessionId: args.sessionId }));
					
					require(deps, function () {
						if (args.autoRun !== 'false') {
							main.run();
						}
					});
				} else {
					// We need to preserve the original suite paths that are found in the config file.
					// According to the comment above, this may mess up functional tests, but
					// we can cross that bridge when we come to it.
					require(deps, function () {
						main.runSandboxed(args.suites);
					});
				}
			});
		} else {
			main.suites.push(new Suite({ name: 'main', sessionId: args.sessionId }));
			require([args.suite], function () {
				main.run();
			});
		}
	});
}