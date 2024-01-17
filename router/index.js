const Router = require('koa-router')
const logger = require('../middleware/logger')

const router = new Router()

router.get('/', ctx => {
  logger.time('start')
  ctx.body = 'hello'
  logger.timeEnd('start')
})

module.exports = router
