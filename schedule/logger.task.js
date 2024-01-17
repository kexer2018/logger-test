const { parentPort } = require('worker_threads')
const fs = require('fs')

const moment = require('moment')

const dateFormat = 'yyyy-MM-DD HH:mm:ss'
const MAX_SIZE = 16 * 1024 * 1024

// 如果是 worker 线程，执行写入文件的任务
if (parentPort) {
  parentPort.on('message', message => {
    const { print, write } = getRights(message.opts)
    if (message.msg && message.msg.type === 'TIME') {
      const logmsg = message.msg.logmsg
      if (print) {
        console.log(logmsg, '---------->')
      }
    }
    const log = joinMsg(message.msg)
    if (print) {
      console.log(log)
    }
    if (write) {
      // const filename =
    }
  })
}

function setFileName(msgStr) {
  const size = msgStr.length
  // 如果时间
}

function getCurrentTime() {
  return moment().format(dateFormat)
}

function getRights(opts) {
  return {
    print: opts.print,
    write: opts.write
  }
}

function joinMsg(msgObj) {
  const current = getCurrentTime()
  const { type, args } = msgObj
  return `[${current}] [${type}] ${args}`
}

/**
 * 将文件名改变成过期文件
 */
function changeFileName() {}

/**
 * 将文件移动到另一个trash文件夹
 */
function moveFileToTrash() {}

/**
 *  从logs文件夹中筛选过期文件，将要移动的文件(不包含当前的日志文件)
 */

function selectFiles() {}
