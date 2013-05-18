/**
 * @class nodemac
 * This is a standalone module, originally designed for internal use in [NGN](http://github.com/thinkfirst/NGN).
 * However; it is capable of providing the same features for Node.JS scripts
 * independently of NGN.
 *
 * ### Getting node-mac
 *
 * `npm install -g node-mac`
 *
 * ### Using node-mac
 *
 * `var nm = require('node-mac');`
 *
 * @singleton
 * @author Corey Butler
 */
if (require('os').platform().indexOf('darwin') < 0){
  throw 'ngn-mac is only supported on Mac OSX.';
}

// Add daemon management capabilities
module.exports.Service = require('./daemon');
//module.exports.EventLogger = require('./eventlog');