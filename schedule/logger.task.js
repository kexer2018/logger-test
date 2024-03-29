const { parentPort } = require('worker_threads')
const path = require('path')
const fs = require('fs')
const {
  readdir,
  mkdir,
  rename,
  writeFile,
  appendFile,
  access,
  unlink
} = require('fs/promises')
const moment = require('moment')
const schedule = require('node-schedule')

const dateFormat = 'yyyy-MM-DD HH:mm:ss'
const MAX_SIZE = 10 * 1024 * 1024
const logFolder = 'logs'
const trashFolder = 'trash'
let lastLabel
let lastTime

// 如果是 worker 线程，执行写入文件的任务
if (parentPort) {
  parentPort.on('message', async message => {
    const log = joinMsg(message)
    const logMsg = formatLog(log)
    // print
    console.log(logMsg)
    // write
    const logFilePath = findLogFilePath(logMsg)
    await writeLogs(logFilePath, logMsg)
  })
}

/**
 *
 * @param {string} filePath
 * @param {string} msg
 * @returns {Promise<void>}
 */
async function writeLogs(filePath, msg) {
  // 根据日志前的时间戳，找到对应的文件，如果没有则创建，有的话直接在后面接着写
  try {
    // 检查文件是否存在
    try {
      await access(filePath)
    } catch (error) {
      // 文件不存在，创建并写入
      await writeFile(filePath, msg + '\n')
      const { expiredFiles } = await selectFiles()
      const expiredFilesPath = expiredFiles.map(item =>
        path.join(logFolder, item)
      )
      await Promise.all(expiredFilesPath.map(item => changeFileName(item)))
      return
    }

    // 文件存在，追加写入
    await appendFile(filePath, msg + '\n')
  } catch (error) {
    console.error('Error writing logs:', error)
    throw error // 抛出错误以便上层捕获
  }
}

/**
 * 根据str获取写入的文件夹
 * @param {string} str
 * @returns
 */
function findLogFilePath(str) {
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
async function changeFileName(filePath) {
  const fileNameWithExtension = path.basename(filePath)
  let newFileName = ''
  if (!filePath.includes('_invalid_')) {
    newFileName = fileNameWithExtension.replace(
      '.log',
      `_invalid_${Date.now()}.log`
    )
  }
  rename(filePath, path.join(logFolder, newFileName))
}

/**
 * 将文件移动到另一个trash文件夹
 */
async function moveFileToTrash(filename) {
  const originPath = path.join(logFolder, filename)
  const trashDir = path.join(trashFolder, filename)
  // 确保 trash 文件夹存在
  await mkdir(trashFolder, { recursive: true })

  await rename(originPath, trashDir)
  console.log(`File moved to trash: ${filename}`)
}

/**
 *  从logs文件夹中筛选过期文件，将要移动的文件(不包含当前的日志文件)
 */
async function selectFiles() {
  const currentHourPrefix = moment().format('YYYY-MM-DDTHH')
  const files = await readdir(logFolder)

  const expiredFiles = files.filter(file => {
    return !file.includes(currentHourPrefix) && !file.includes('_invalid_')
  })

  const needMoveFile = files.filter(file => file.includes('_invalid_'))

  return { expiredFiles, needMoveFile }
}

/**
 * 异步方式清空 trash 文件夹
 * @returns {Promise<void>}
 */
async function clearlogFiles() {
  try {
    const files = await readdir(trashFolder);

    // 使用 Promise.all 异步并行删除文件
    await Promise.all(files.map(async (file) => {
      await unlink(path.join(trashFolder, file));
      console.log('Delete log Success!, filename:', file);
    }));
  } catch (error) {
    console.error('Error clearing log files:', error);
  }
}

// 定时把日志文件移动到trash
schedule.scheduleJob('0 * * * *', async () => {
  try {
    const files = await readdir(logFolder)
    const { needMoveFile } = await selectFiles(files)
    // 使用 Promise.all 异步并行处理文件
    await Promise.all(
      needMoveFile.map(async item => {
        await moveFileToTrash(item)
      })
    )
  } catch (error) {
    console.error('Error in scheduled job:', error)
  }
})

// 定时把日志文件删除
schedule.scheduleJob('0 0 * * *', async () => {
  try {
    // 使用 Promise.all 异步并行处理文件
    await clearlogFiles()
  } catch (error) {
    console.error('Error in scheduled job:', error)
  }
})
