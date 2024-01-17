const Koa = require('koa')
const router = require('./router')
const logger = require('./middleware/logger')

const app = new Koa()
const PORT = 4200

app.use(router.routes())

app.listen(PORT, () => {
  logger.log(`Server is Running on http://localhost:${PORT}`)
})
