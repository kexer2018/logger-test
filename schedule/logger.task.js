const { parentPort } = require('worker_threads')
const path = require('path')
const fs = require('fs')
const moment = require('moment')

const dateFormat = 'yyyy-MM-DD HH:mm:ss'
const MAX_SIZE = 10 * 1024 * 1024
const logFolder = 'logs'
let lastLabel
let lastTime

// 如果是 worker 线程，执行写入文件的任务
if (parentPort) {
  parentPort.on('message', message => {
    const log = joinMsg(message)
    const logMsg = formatLog(log)
    // print
    console.log(logMsg)
    // write
    const logFilePath = findLogFilePath(logMsg)
    writeLogs(logFilePath, logMsg)
  })
}

function writeLogs(filePath, msg) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, msg + '\n')
  } else {
    fs.appendFileSync(filePath, msg + '\n')
  }
}

function findLogFilePath(str) {
  // 根据日志前的时间戳，找到对应的文件，如果没有则创建，有的话直接在后面接着写
  const datePart = str.slice(1, 11)
  const hourPart = str.slice(12, 14)
  const filePrifix = `${datePart}T${hourPart}`

  let serialNumber = getLogFileMaxNum(filePrifix)
  let logFilePath = transformNameToPath(datePart, hourPart, serialNumber)

  // 判断文件是否存在
  if (!fs.existsSync(logFilePath)) {
    return logFilePath
  }

  // 获取文件状态信息
  const stat = fs.statSync(logFilePath)

  if (stat.size + str.length > MAX_SIZE) {
    // 如果文件大小超过限制，递增序列号并重新生成文件路径
    serialNumber += 1
    logFilePath = transformNameToPath(datePart, hourPart, serialNumber)
  }
  return logFilePath
}

function transformNameToPath(date, hour, num) {
  const filename = `${date}T${hour}-${num}.log`
  return path.join(logFolder, filename)
}

/**
 * 获取一个小时之内所有产生日志文件的最大编号
 * @param {string} timePrifix // '2023-12-18T18'
 * @return {number}
 */
function getLogFileMaxNum(timePrefix) {
  let maxNum = 0
  const logFilesInHour = fs
    .readdirSync(logFolder)
    .filter(f => f.startsWith(timePrefix) && f.endsWith('.log'))
    .map(f => {
      const fileName = f.slice(0, -4) // 去掉文件后缀名
      const lastChar = fileName.slice(-1) // 提取字符串末尾的字符
      return parseInt(lastChar) // 将提取的字符转换为数字
    })

  if (logFilesInHour.length > 0) {
    maxNum = Math.max(...logFilesInHour) // 获取最大值
  }
  return maxNum
}

function formatLog(str) {
  const current = getCurrentTime()
  return `[${current}] ${str}`
}

function getCurrentTime() {
  return moment().format(dateFormat)
}

function joinMsg(msgObj) {
  const { type, str } = msgObj
  if (type === 'TIME') {
    lastTime = Date.now()
    lastLabel = str
    return `[${str}] Start!`
  } else if (type === 'TIMEEND') {
    if (str === lastLabel) {
      const duration = Date.now() - lastTime
      return `[${str}] ${duration} ms`
    }
  } else {
    return `[${type}] ${str}`
  }
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
