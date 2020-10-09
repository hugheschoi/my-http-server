const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { createReadStream, createWriteStream, readFileSync } = require('fs');
const url = require('url');
// const crypto = require('crypto')
// 模板引擎  ejs
const ejs = require('ejs'); // 模板引擎 nunjucks handlebar underscore 。。。。。
const mime = require('mime');
const chalk = require('chalk'); // 粉笔话颜色的

class Server {
  constructor(options) {
    this.port = options.port
    this.directory = options.directory
    this.template = readFileSync(path.resolve(__dirname, 'render.html'), 'utf8')
  }
  async handleRequest(req, res) {
    let { pathname } = url.parse(req.url); // 获取路径
    pathname = decodeURIComponent(pathname); // 可能路径含有中文
    let filePath = path.join(this.directory, pathname);
    try {
      let statObj = await fs.stat(filePath)
      if (statObj.isFile()) {
        this.sendFile(req, res, statObj, filePath)
      } else {
        // 文件夹
        // 需要列出文件夹中内容
        let dirs = await fs.readdir(filePath); // fs-extra
        console.log(dirs)
        let result = await ejs.render(this.template, { dirs }, { async: true })
        console.log(result)
        res.setHeader('Content-Type', 'text/html;charset=utf-8')
        res.end(result)
        // 文件访问的路径 采用绝对路径 尽量不要采用./ ../路径
        // dirs = dirs.map(item => ({ // 当前根据文件名产生目录和href
        //   dir: item,
        //   href: path.join(pathname, item)
        // }))
      }
    } catch (error) {
      this.sendError(req, res, error)
    }
    
  }
  sendError(req, res, error) {
    res.statusCode = 404
    res.end('Not Found')
  }
  sendFile(req, res, statObj, filePath) {
    res.setHeader('Content-Type', mime.getType(filePath) + ';charset=utf-8');
    createReadStream(filePath).pipe(res);
  }
  start() {
    console.log('start')
    const server = http.createServer(this.handleRequest.bind(this))
    server.listen(this.port, () => {
      console.log(`${chalk.yellow('Starting up hughes-server:')} ./${path.relative(process.cwd(), this.directory)}`)
      console.log(`http://localhost:${chalk.green(this.port)}`)
    })
  }
}
module.exports = Server
