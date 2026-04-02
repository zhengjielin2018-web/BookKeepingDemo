import { logger } from '../../utils/logger'
import type { LogEntry } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404 })
  }

  const eventStream = createEventStream(event)

  const onLog = (entry: LogEntry) => {
    eventStream.push(JSON.stringify(entry))
  }

  logger.on('log', onLog)

  eventStream.onClosed(async () => {
    logger.off('log', onLog)
    await eventStream.close()
  })

  return eventStream.send()
})
