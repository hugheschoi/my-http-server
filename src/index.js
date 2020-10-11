const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { createReadStream, createWriteStream, readFileSync } = require('fs');
const url = require('url');
const crypto = require('crypto')
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
    console.log(req.url)
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
        // 文件访问的路径 采用绝对路径 尽量不要采用./ ../路径
        dirs = dirs.map(item => ({ // 当前根据文件名产生目录和href
          dir: item,
          href: path.join(pathname, item)
        }))
        let result = await ejs.render(this.template, { dirs }, { async: true })
        res.setHeader('Content-Type', 'text/html;charset=utf-8')
        res.end(result)
      }
    } catch (error) {
      this.sendError(req, res, error)
    }

  }
  sendError(req, res, error) {
    res.statusCode = 404
    res.end('Not Found')
  }
  cache (req, res, statObj, filePath) {
    res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString());
    res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Cache-Control', 'max-age=10'); // 强制缓存
    // 1. 根据修改时间来判断文件是否修改了  **304**服务端设置
    let ifModifiedSince = req.headers['if-modified-since']
    let ifNoneMatch = req.headers['if-none-match']
    let ctime = statObj.ctime.toGMTString();
    let etag = crypto.createHash('md5').update( readFileSync(filePath)).digest('base64')
    console.log(etag)
    res.setHeader('Last-Modified',ctime);
    res.setHeader('Etag',etag)
    if(ifModifiedSince != ctime){ // 如果前端传递过来的最后修改时间和我的 ctime时间一样 ，文件没有被更改过
        return false  // Status Code: 304 Not Modified
    }
    if(ifNoneMatch !== etag){ // 可以用开头 加上总字节大小生产etag
        return false;
    }
    return true
  }
  sendFile(req, res, statObj, filePath) {
    if (this.cache(req, res, statObj, filePath)) {
      res.statusCode = 304
      return res.end()
    }
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
