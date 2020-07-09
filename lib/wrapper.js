// Handle input parameters
var yargs = require('yargs'),
    fs = require('fs'),
    max = 60,
    p = require('path'),
    argv = yargs
      .demand('file')
      .alias('f','file')
      .describe('file','The absolute path of the script to be run as a process.')
      .check(function(argv){
        return require('fs').existsSync(p.resolve(argv.f));
      })
      .demand('log')
      .alias('l','log')
      .describe('log','The absolute path of the log file.')
      .demand('errorlog')
      .alias('e','errorlog')
      .describe('errorlog','The absolute path of the error log file.')
      .demand('title')
      .alias('t','title')
      .describe('title','The name/title of the process.')
      .default('maxretries',-1)
      .alias('m','maxretries')
      .describe('maxretries','The maximim number of times the process will be auto-restarted.')
      .default('maxrestarts',5)
      .alias('r','maxrestarts')
      .describe('maxrestarts','The maximim number of times the process should be restarted within a '+max+' second period shutting down.')
      .default('wait',1)
      .alias('w','wait')
      .describe('wait','The number of seconds between each restart attempt.')
      .check(function(argv){
        return argv.w >= 0;
      })
      .default('grow',.25)
      .alias('g','grow')
      .describe('grow','A percentage growth rate at which the wait time is increased.')
      .check(function(argv){
        return (argv.g >= 0 && argv.g <= 1);
      })
      .default('abortonerror','no')
      .alias('a','abortonerror')
      .describe('abortonerror','Do not attempt to restart the process if it fails with an error,')
      .check(function(argv){
        return ['y','n','yes','no'].indexOf(argv.a.trim().toLowerCase()) >= 0;
      })
      .argv,
    //log = new Logger(argv.e == undefined ? argv.l : {source:argv.l,eventlog:argv.e}),
    fork = require('child_process').fork,
    script = p.resolve(argv.f),
    wait = argv.w*1000,
    grow = argv.g+1,
    attempts = 0,
    startTime = null,
    starts = 0,
    child = null;

process.title = argv.t || 'Node.JS Script';

// Log Formatting - Standard Output Hook
console.log = function (data) {
  fs.appendFileSync(argv.log,'\n'+new Date().toLocaleString()+' - '+data);
};

console.error = function (data) {
  fs.appendFileSync(argv.errorlog,'\n'+new Date().toLocaleString()+' - '+data);
};

console.warn = function (data) {
  fs.appendFileSync(argv.log,'\n'+new Date().toLocaleString()+' - WARNING: '+data);
};

console.log('');

if (argv.env){
  if (Object.prototype.toString.call(argv.env) === '[object Array]'){
    for(var i=0;i<argv.env.length;i++){
      process.env[argv.env[i].split('=')[0]] = argv.env[i].split('=')[1];
    }
  } else {
    process.env[argv.env.split('=')[0]] = argv.env.split('=')[1];
  }
}

if (typeof argv.m === 'string'){
  argv.m = parseInt(argv.m);
}

// Set the absolute path of the file
argv.f = p.resolve(argv.f);

// Hack to force the wrapper process to stay open by launching a ghost socket server
var server = require('net').createServer().listen(0, '127.0.0.1');

/**
 * @method monitor
 * Monitor the process to make sure it is running
 */
var monitor = function(){
  if(!child.pid){

    // If the number of periodic starts exceeds the max, kill the process
    if (starts >= argv.r){
      if (new Date().getTime()-(max*1000) <= startTime.getTime()){
        console.error('Too many restarts within the last '+max+' seconds. Please check the script.');
        process.exit();
      }
    }

    setTimeout(function(){
      wait = wait * grow;
      attempts += 1;
      if (attempts > argv.m && argv.m >= 0){
        console.error('Too many restarts. '+argv.f+' will not be restarted because the maximum number of total restarts has been exceeded.');
        process.exit();
      } else {
        launch();
      }
    },wait);
  } else {
    attempts = 0;
    wait = argv.w * 1000;
  }
};


/**
 * @method launch
 * A method to start a process.
 */
var launch = function(){
  //log.info('Starting '+argv.f);

  // Set the start time if it's null
  if (startTime == null) {
    startTime = startTime || new Date();
    setTimeout(function(){
      startTime = null;
      starts = 0;
    },(max*1000)+1);
  }
  starts += 1;

  // Fork the child process
  child = fork(script,{env:process.env});

  // When the child dies, attempt to restart based on configuration
  child.on('exit',function(code){
    console.warn(argv.f+' stopped running.');

    // If an error is thrown and the process is configured to exit, then kill the parent.
    if (code !== 0 && argv.a == "yes"){
      console.error(argv.f+' exited with error code '+code);
      process.exit();
      server.unref();
    }

    delete child.pid;

    // Monitor the process
    monitor();
  });
};

process.on('exit',function(){
  if (child.pid){
    process.kill(child.pid)
  };
  process.exit();
});

// Launch the process
launch();
