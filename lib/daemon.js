/**
 * @class nodemac.Daemon
 * Manage node.js scripts as native Mac daemons.
 *     var Service = require('node-mac').Service;
 *
 *     // Create a new service object
 *     var svc = new Service({
 *       name:'Hello World',
 *       description: 'The nodejs.org example web server.',
 *       script: '/path/to/helloworld.js')
 *     });
 *
 *     // Listen for the "install" event, which indicates the
 *     // process is available as a service.
 *     svc.on('install',function(){
 *       svc.start();
 *     });
 *
 *     svc.install();
 * @author Corey Butler
 */
var plist = require('plist'),
	fs = require('fs'),
	p = require('path'),
	exec = require('child_process').exec,
	wrapper = p.resolve(p.join(__dirname,'./wrapper.js'));

var daemon = function(config) {

	config.runAsAgent = config.hasOwnProperty('runAsAgent') ? config.runAsAgent: false;
	config.logOnAsUser = config.hasOwnProperty('logOnAsUser') ? config.logOnAsUser: false;
	var homedir = config.logOnAsUser ? require('os').homedir() : '';

	Object.defineProperties(this,{

    /**
     * @cfg {String} name
     * The descriptive name of the process, i.e. `My Process`.
     */
    _name: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: config.name || null
    },

		/**
		 * @property {String} name
		 * The name of the process.
		 */
    name: {
      enumerable: true,
      get: function(){return this._name;},
      set: function(value){this._name = value;}
    },

    label: {
    	enumerable: false,
    	get: function(){
    		return this.name.replace(/[^a-zA-Z]+/gi,'').toLowerCase()
    	}
    },

    plist: {
    	enumerable: false,
    	get: function(){
    		return p.resolve(p.join(this.root,this.label+'.plist'));
    	}
    },

    outlog: {
    	enumerable: false,
    	get: function(){
    		return p.join(this.logpath,this.label+'.log');
    	}
    },

    errlog: {
    	enumerable: false,
    	get: function(){
				return p.join(this.logpath,this.label+'_error.log');
    	}
    },

    /**
     * @property {Boolean} exists
     * Indicates that the service exists.
     * @readonly
     */
    exists: {
     	enumerable: true,
     	get: function(){
     		return fs.existsSync(this.plist);
     	}
    },

    /**
     * @property {String} id
     * The ID for the process.
     * @readonly
     */
    id: {
      enumerable: true,
      get: function(){
        return this.name.replace(/[^\w]/gi,'').toLowerCase();
      }
    },

    /**
     * @cfg {String} [description='']
     * Description of the service.
     */
    description: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.description || ''
    },

    /**
     * @cfg {String} [cwd]
     * The absolute path of the current working directory. Defaults to the base directory of #script.
     */
    cwd: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: config.cwd || p.dirname( ( ( this.script === undefined ) || ( this.script === null ) ) ? '' : this.script.toString() )
    },

    /**
	   * @cfg {Array|Object} [env]
	   * An optional array or object used to pass environment variables to the node.js script.
	   * You can do this by setting environment variables in the service config, as shown below:
	   *
	   *     var svc = new Service({
	   *      name:'Hello World',
	   *      description: 'The nodejs.org example web server.',
	   *      script: '/path/to/helloworld.js',
	   *      env: {
	   *        name: "NODE_ENV",
	   *        value: "production"
	   *      }
	   *     });
	   *
	   * You can also supply an array to set multiple environment variables:
	   *
	   *     var svc = new Service({
	   *      name:'Hello World',
	   *      description: 'The nodejs.org example web server.',
	   *      script: '/path/to/helloworld.js',
	   *      env: [{
	   *        name: "HOME",
	   *        value: process.env["USERPROFILE"] // Access the user home directory
	   *      },{
	   *        name: "NODE_ENV",
	   *        value: "production"
	   *      }]
	   *     });
	   */
	  _ev: {
	  	enumerable: false,
	  	writable: true,
	  	configurable: false,
	  	value: config.env || []
	  },

    EnvironmentVariables: {
    	enumerable: false,
    	get: function(){
    		var ev = [], tmp = {};
    		if (Object.prototype.toString.call(this._ev) === '[object Array]'){
    			this._ev.forEach(function(item){
    				tmp = {};
    				tmp[item.name] = item.value;
    				ev.push(tmp);
    			});
    		} else {
    			tmp[this._ev.name] = this._ev.value;
    			ev.push(tmp);
    		}
    		return ev;
    	}
    },

    /**
     * @cfg {String} script
     * The absolute path of the script to launch as a service.
     * @required
     */
    script: {
      enumerable: true,
      writable: true,
      configurable: false,
      value: config.script !== undefined ? require('path').resolve(config.script) : null
    },

		root: {
			enumerable: false,
			writable: true,
			configurable: false,
			value: config.runAsAgent ? homedir + '/Library/LaunchAgents' : '/Library/LaunchDaemons'
		},

		/**
		 * @cfg {String} [logpath=/Library/Logs/node-scripts]
		 * The root directory where the log will be stored.
		 */
		logpath: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: config.logpath || homedir + '/Library/Logs/' + (this.name || config.name || 'node-scripts')
		},

		/**
     * @cfg {Number} [maxRetries=null]
     * The maximum number of restart attempts to make before the service is considered non-responsive/faulty.
     * Ignored by default.
     */
    maxRetries: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.maxRetries || null
    },

    /**
     * @cfg {Number} [maxRestarts=3]
     * The maximum number of restarts within a 60 second period before haulting the process.
     * This cannot be _disabled_, but it can be rendered ineffective by setting a value of `0`.
     */
    maxRestarts: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.maxRestarts || 3
    },

    /**
     * @cfg {Boolean} [abortOnError=false]
     * Setting this to `true` will force the process to exit if it encounters an error that stops the node.js script from running.
     * This does not mean the process will stop if the script throws an error. It will only abort if the
     * script throws an error causing the process to exit (i.e. `process.exit(1)`).
     */
    abortOnError: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.abortOnError instanceof Boolean ? config.abortOnError : false
    },

    /**
     * @cfg {Number} [wait=1]
     * The initial number of seconds to wait before attempting a restart (after the script stops).
     */
    wait: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.wait || 1
    },

    /**
     * @cfg {Number} [grow=.25]
     * A number between 0-1 representing the percentage growth rate for the #wait interval.
     * Setting this to anything other than `0` allows the process to increase it's wait period
     * on every restart attempt. If a process dies fatally, this will prevent the server from
     * restarting the process too rapidly (and too strenuously).
     */
    grow: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: config.grow || .25
    },

		/**
		 * @method install
		 * Install the script as a background process/daemon.
		 * @param {Function} [callback]
		 */
		install: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: function(callback){

				var me = this;

				if (!fs.existsSync(this.logpath)){
					fs.mkdirSync(this.logpath, { recursive: true });
				}

				// Create the log file if it doesn't exist.
				fs.exists(this.outlog,function(exists){
					if (!exists){
						fs.appendFileSync(me.outlog,'# '+me.name);
					}
				});

				// Create the error file if it doesn't exist.
				fs.exists(this.errlog,function(exists){
					if (!exists){
						fs.appendFileSync(me.errlog,'# '+me.name+' Errors');
					}
				});

				// Create the plist file if it doesn't exist.
				fs.exists(this.plist,function(exists){
					if (!exists){

						// Make sure a node.js file is specified.
						if (!me.script){
							console.log(me.script);
							throw new Error('No file specified. Cannot start.');
						}
						// Build the plist file
						var args = [
							process.execPath,'--harmony',wrapper,
							'-f',me.script,
							'-l',me.outlog,
							'-e',me.errlog,
							'-t',me.name,
							'-g',me.grow.toString(),
							'-w',me.wait.toString(),
							'-r',me.maxRestarts.toString(),
							'-a',(me.abortOnError==true?'y':'n')
						];
						if (me.maxRetries!==null){
							args.push('-m');
							args.push(me.maxRetries.toString());
						}
						// Add environment variables
						for (var i=0;i<me.EnvironmentVariables.length;i++){
							args.push('--env');
							for (var el in me.EnvironmentVariables[i]){
								args.push(el+'='+me.EnvironmentVariables[i][el]);
							}
						}

						var tpl = {
              Title: me.label,
							Label: me.label,
							ProgramArguments: args,
							RunAtLoad: true,
							//StartInterval: 3600,
							KeepAlive: false,
							WorkingDirectory: me.cwd,
							StandardOutPath: me.outlog,
							StandardErrorPath: me.errlog
						};

						var data = plist.build(tpl).toString();

						if (!fs.existsSync(p.dirname(me.plist))){
							fs.mkdirSync(p.dirname(me.plist), {recursive: true});
						}

            // Write the plist file to disk.
						fs.writeFile(me.plist,data,function(err){
							if (err) throw err;
							// Load the deamon
							//exec('launchctl load '+me.plist,{},function(){
								me.emit('install');
								callback && callback();
							//});
						});

					} else {
						me.emit('alreadyinstalled');
					}
				});
			}
		},

		/**
		 * @method uninstall
		 * Uninstall an existing background process/daemon.
		 * @param {Function} [callback]
		 * Executed when the process is uninstalled.
		 */
		uninstall: {
			enumerable: true,
			writable: true,
			configurable: false,
			value: function(callback){

				var me = this;
				this.stop(function(){
					exec('rm '+me.plist,{},function(){
						var dne = !me.exists;
						if (fs.existsSync(me.outlog)){
							fs.unlinkSync(me.outlog);
						}
						if (fs.existsSync(me.errlog)){
							fs.unlinkSync(me.errlog);
						}

						if (fs.existsSync(me.logpath)){
							if (me.logpath !== '/Library/Logs'){
								var dir = fs.readdirSync(me.logpath);
								if (dir.length == 0){
									try {
										fs.unlinkSync(me.logpath);
									} catch (e) {
										exec('rm -r '+me.logpath.replace(/\s/gi,'\\ '),function(err){
											if (err){
												console.log(err);
											}
										});
									}
								}
							}
						}
						if (dne) {
							/**
							 * @event doesnotexist
							 * Fired when an attempt to uninstall the service fails because it does not exist.
							 */
							me.emit('doesnotexist');
						}
						me.emit('uninstall');
						callback && callback();
					});
				});
			}
		},

		/**
		 * @method start
		 * Start and/or create a daemon.
		 * @param {Function} [callback]
		 */
		start:{
			enumerable: true,
			writable: false,
			configurable: false,
			value: function(callback){
				var me = this;
				exec('launchctl load '+this.plist,{},function(){
					fs.appendFileSync(me.outlog,'\n'+new Date().toLocaleString()+' - '+me.name+' Started');
					me.emit('start');
					callback && callback();
				});
			}
		},

		/**
		 * @method stop
		 * Stop the process if it is currently running.
	 	 * @param {Function} [callback]
		 */
		stop: {
			enumerable: true,
			writable: false,
			configurable: false,
			value: function(callback){
				var me = this;
				exec('launchctl unload '+this.plist,{},function(){
					fs.appendFileSync(me.outlog,'\n'+new Date().toLocaleString()+' - '+me.name+' Stopped');
					me.emit('stop');
					callback && callback();
				});
			}
		},

		/**
	 	 * @method restart
	 	 * @param {Function} [callback]
	 	 */
	 	restart: {
		 	enumerable: true,
		 	writable: true,
		 	configurable: false,
		 	value: function(callback){
		 		var me = this;
		 		this.stop(function(){
		 			me.start(callback);
		 		});
		 	}
	 	}
	});
};

var util = require('util'),
  EventEmitter = require('events').EventEmitter;

// Inherit Events
util.inherits(daemon,EventEmitter);

module.exports = daemon;
