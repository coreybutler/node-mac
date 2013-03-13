<<<<<<< HEAD
/**
 * @author Corey Butler
 */

var plist = require('plist'),
	fs = require('fs'),
	p = require('path'),
	exec = require('child_process').exec,
	root = '/Library/LaunchDaemons';

var daemon = {};

Object.defineProperties(daemon,{

	/**
	 * @method start
	 * Start and/or create a daemon.
	 */
	start: {
		enumerable: true,
		writable: true,
		configurable: false,
		value: function(svcName,file,pidfile,callback){
			
			var label = svcName.replace(/[^a-zA-Z]+/gi,'').toLowerCase(),
				plistFile = p.join(root,label+'.plist'),
				me = this;

			fs.exists(plistFile,function(exists){
				if (!exists){
					
					// Make sure a node.js file is specified.
					if (!file){
						throw new Error('No file specified. Cannot start.');
					}

					var data = plist.build({
						Label: label,
						ProgramArguments: [process.execPath,file],
						RunAtLoad: true,
						StartInterval: 3600
					}).toString();

					fs.writeFile(plistFile,data,function(){
						me.start(svcName,callback);
					});

				} else {
					if (typeof file == 'function'){
						callback = file;
					}
					exec('launchctl load '+plistFile,{},function(){
						callback && callback();
					});
				}
			});
		}
	},

	/**
	 * @method stop
	 */
	stop: {
		enumerable: true,
		writable: true,
		configurable: false,
		value: function(svcName, callback){
			var label = svcName.replace(/[^a-zA-Z]+/gi,'').toLowerCase(),
				plistFile = p.join(root,label+'.plist');

			exec('launchctl unload '+plistFile,{},function(){
				callback && callback();
			});
		}
	},

	/**
	 * @method restart
	 */
	 restart: {
	 	enumerable: true,
	 	writable: true,
	 	configurable: false,
	 	value: function(svcName, callback){
	 		var me = this;
	 		this.stop(svcName,function(){
	 			me.start(svcName,callback);
	 		});
	 	}
	 },

	 /**
	  * @method remove
	  */
	 remove: {
	 	enumerable: true,
	 	writable: true,
	 	configurable: false,
	 	value: function(svcName,callback){
	 		var label = svcName.replace(/[^a-zA-Z]+/gi,'').toLowerCase(),
				plistFile = p.join(root,label+'.plist');
			this.stop(svcName,function(){
				exec('rm '+plistFile,{},function(){
					callback && callback();
				});
			});
	 	}
	 }
});

module.exports = daemon;

daemon.start('test','/Users/Corey/Google Drive/Development/node-mac/test.js');
=======
/**
 * @author Corey Butler
 */
>>>>>>> cde7d998da6d0e206a89bdd815528b1cc7c8d45c
