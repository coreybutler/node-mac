/**
 * @author Corey Butler
 */

var plist = require('plist'),
	fs = require('fs'),
	p = require('path'),
	exec = require('child_process').exec,
	root = '/Library/LaunchDaemons/NGN',
	logroot = '/Library/Logs/NGN';

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
			
			var label = 'ngn-'+svcName.replace(/[^a-zA-Z]+/gi,'').toLowerCase(),
				plistFile = p.join(root,label+'.plist'),
				out = p.join(logroot,label+'.log'),
				err = p.join(logroot,label+'_error.log'),
				me = this;

			// Create the log file if it doesn't exist.
			fs.exists(out,function(exists){
				if (!exists){
					fs.writeFile(out,'# '+svcName);
				}
			});

			// Create the error file if it doesn't exist.
			fs.exists(err,function(exists){
				if (!exists){
					fs.writeFile(err,'# '+svcName+' Errors');
				}
			})

			// Create the plist file if it doesn't exist.
			fs.exists(plistFile,function(exists){
				if (!exists){
					
					// Make sure a node.js file is specified.
					if (!file){
						throw new Error('No file specified. Cannot start.');
					}

					// Build the plist file
					var data = plist.build({
						Label: label,
						ProgramArguments: [process.execPath,file],
						RunAtLoad: true,
						StartInterval: 3600,
						KeepAlive: true
					}).toString();

					// Write the plist file to disk.
					fs.writeFile(plistFile,data,function(){
						me.start(svcName,callback);
					});

				} else {
					if (typeof file == 'function'){
						callback = file;
					}
					// Load the deamon
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
	  * WARNING: This removes the log files!
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

daemon.start('test','/Users/Corey/Google\ Drive/Development/node-mac/test.js');