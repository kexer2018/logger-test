const EventEmitter = require('events')
const fs = require('fs')


const path = require('path')
const { Worker, isMainThread } = require('worker_threads')

const config = require('../config.json')

class Logger extends EventEmitter {
  constructor(opts = { print: false, write: false }) {
    super()
    this.prifix = 'ZX'
    this.opts = opts
    this.outDir = 'logs'

    if (this.opts.write && isMainThread) {
      // 如果已经存在共享的 worker，则使用它
      if (!Logger.sharedWorker) {
        Logger.sharedWorker = new Worker(
          path.join(__dirname, '../schedule/logger.task.js')
        )
      }
      this.worker = Logger.sharedWorker
    }
  }

  _send(type, ...args) {
    if (!fs.existsSync(this.outDir)) {
      fs.mkdirSync(this.outDir)
    }

    let str = ''
    // 如果是time和timeEnd类型则这个逻辑
    if (type === 'TIME' || type === 'TIMEEND') {
      str = args[0]
      this.worker.postMessage({ type, str })
    } else {
      str = args.map(arg => String(arg)).join('');
      this.worker.postMessage({ type, str })
    }
  }

  log(args) {
    this._send('LOG', ...args)
  }

  info(args) {
    this._send('INFO', ...args)
  }

  warn(args) {
    this._send('WARN', ...args)
  }

  debug(args) {
    this._send('DEBUG', ...args)
  }

  error(args) {
    this._send('ERROR', ...args)
  }

  time(label) {
    this._send('TIME', label)
  }

  timeEnd(label) {
    this._send('TIMEEND', label)
  }
}

const logger = new Logger({
  print: config.isAllowPrint,
  write: config.isAllowWrite
})

module.exports = logger
