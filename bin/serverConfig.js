module.exports = {
  port: {
    option: '-p,--port <v>', // program.option('-p, --port <val>')
    descriptor: 'set server port',
    usage: 'hs --port 3000',
    default: 8080
  },
  directory: {
    option: '-d,--dir <v>',
    descriptor: 'set start directory',
    usage: 'hs --dir D:',
    default: process.cwd()
  }
}
