#! /usr/bin/env node
// console.log('ok'); // npm link --force 测试一下，再执行 hs 看看有没有打印
// --help 要拿到参数要用到commander  npm install commander
const program = require('commander')
// --port 3000  --directory d:  --cache  配置文件去管理
const config = require('./serverConfig.js')
const { forEachObj } = require('../util.js')
// function forEachObj(obj,cb){
//     Object.entries(obj).forEach(([key, value]) => {
//         cb(value,key);
//     });
// }
program.name('hs')
forEachObj(config, val => {
  program.option(val.option, val.descriptor)
})
// 发布订阅 用户调用--help时会触发此函数
program.on('--help', function () {
  console.log('\r\nExamples:');
  forEachObj(config, val => {
      console.log('  ' + val.usage)
  });
})

program.parse(process.argv) // 解析参数
// console.log(program);

const finalConfig = {}
forEachObj(config, (value, key) => {
  finalConfig[key] = program[key] || value.default
})
// console.log(finalConfig);

// 1.解析用户参数
// 2.开启服务

const Server = require('../src/index')
let server = new Server(finalConfig); // 传入开启服务的必备参数
server.start()
