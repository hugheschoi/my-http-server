#  实现一个http-server的工具

## 命令
## 静态服务和ejs
## 缓存
重要性： 没有缓存，每次访问都会请求资源，性能浪费，应该设置资源缓存。
每次返回文件时：设置缓存， 默认强制缓存10s， 10s内不再向服务器发起请求。
但首页不会被强制缓存： 因为如果断网了，他将找到服务器电脑中的缓存，没网了应该不能访问服务器才对（引用的资源才可以被强制缓存）（协商缓存可以缓存首页）

方式：
```js
res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString());
// http1.1之后 新版本可以用 Cache-Control，一般两个都使用，用到谁就用谁
// no-cache 表示每次都像服务器发请求
// no-store 表示浏览器不进行缓存
// res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Cache-Control', 'max-age=10'); // 设置10秒缓存
// 过了10s 文件还没变， 可以不用返回文件，告诉浏览器找缓存 - 协商缓存
// 协商缓存 商量一下 是否需要给最新的，如果不需要返回内容，直接给304状态码，表示找缓存即可
```
默认先找强制缓存，10s内不会发送请求到服务器中，采用浏览器缓存，但是10s后在次发送请求。后端要进行对比：
1. 如果文件没有变化，直接返回304即可，浏览器回去缓存中查找文件，之后10s中还是会走缓存
2. 文件变化了，返回最新的文件， 之后10s还是会走缓存，不停循环

看文件是否变化：ctime 看这个changetime是否和之前记录的一致，不一致说明被更改了.
```js
// 把文件的修改时间，设置给客户端
// 以后每次请求都会在 If-Modified-Since 带上过来
let ctime = statObj.ctime.toGMTString(); // 就是文件修改时间，在你的电脑可以看到的
res.setHeader('Last-Modified', ctime)
let ifModifiedSince =  req.headers['if-modified-since']
// 所以我们要拿到 客户端传的 If-Modified-Since 和 ctime 去比较，如果不一样说明，服务端文件有最新的
if(ifModifiedSince != ctime){ // 如果前端传递过来的最后修改时间和我的 ctime时间一样 ，文件没有被更改过
    return false
}
```
但是 If-Modified-Since 也有缺陷
1. 精准度不够，毫秒级的改变不会被识别
2. 如果文件不变，修改时间改了，就不会被缓存了

为了解决上面的问题，采用指纹Etag-根据文件产生唯一的标识 md5
```js
// 读取文件，摘要加密md5
let etag = crypto.createHash('md5').update(readFileSync(filePath)).digest('base64')
// 设置给响应头先，客户端接受到了之后，下次该资源会把值携带上 If-None-Match
let ifNoneMatch = req.headers['if-none-match']
// 接着比对是否一致，不一致就返回新资源
if(ifNoneMatch !== etag){ // 可以用开头 加上总字节大小生产etag
    return false;
}
```
完整代码：
```js
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
```
