var x = require('./lib/node-windows');

var pth = "C:\\Users\\Corey\\AppData\\Roaming\\npm\\node_modules\\ngn-mechanic\\lib\\mechanic\\app.js";
console.log(pth);
//x.service.start('NGN Mechanic',pth);
//x.service.remove('NGN Mechanic');
x.list(function(list){
  console.log(list);
},true);
