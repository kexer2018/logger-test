const EventEmitter = require('events')
const fs = require('fs')
const moment = require('moment')

const path = require('path')
const { Worker, isMainThread } = require('worker_threads')

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

  _send(type, args) {
    if (!fs.existsSync(this.outDir)) {
      fs.mkdirSync(this.outDir)
    }
    this.worker.postMessage({ opts: this.opts, msg: { type, args } })
  }

  log(args) {
    this._send('LOG', args)
  }

  info(args) {
    this._send('INFO', args)
  }

  warn(args) {
    this._send('WARN', args)
  }

  debug(args) {
    this._send('DEBUG', args)
  }

  error(args) {
    this._send('ERROR', args)
  }

  time(label) {
    this.timeStart = process.hrtime()
    this.label = label
  }

  timeEnd(label) {
    if (this.timeStart && this.label) {
      if (label && label !== this.label) {
        console.error(
          'Mismatched labels. Use the same label for time() and timeEnd().'
        )
        return
      }

      const labelToUse = this.label // 保存 label 的值
      const timeEnd = process.hrtime(this.timeStart)
      const durationInMs = (timeEnd[0] * 1e9 + timeEnd[1]) / 1e6 // 转换为毫秒

      if (!this.label) {
        console.error('Label not set. Call time(label) before timeEnd().')
        return
      }

      const logmsg = `[${moment().format(
        'YYYY-MM-DD HH:mm:ss'
      )}] [TIME] ${labelToUse}: ${durationInMs}ms`

      // 直接发送消息给子线程
      this.worker.postMessage({
        opts: this.opts,
        msg: { type: 'TIME', logmsg }
      })

      this.label = null // 重置 label
    } else {
      console.error('Call time(label) before timeEnd().')
    }
  }
}

const logger = new Logger({ print: true, write: true })

module.exports = logger
