#!/usr/bin/env node

process.name = 'NGN';

var args = process.argv;

var spawn = require('child_process').spawn,
	fs = require('fs'),
	path = require('path'),
	out = fs.openSync('/Library/Logs/NGN/'+path.basename(args[1],'.js')+'.log','a'),
	err = fs.openSync('/Library/Logs/NGN/'+path.basename(args[1],'.js')+'_error.log','a');

var child = spawn('node --harmony '+args[1],[],{
	detached: true,
	stdio: ['ignore', out, err]
});

child.unref();

console.log('Running?',child);