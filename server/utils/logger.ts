import { EventEmitter } from 'events'

export interface LogEntry {
  timestamp: string
  type: 'Gemini' | 'DB' | 'Auth' | 'Error'
  message: string
  data?: unknown
}

class AppLogger extends EventEmitter {
  log(type: LogEntry['type'], message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    }
    console.log(`[${entry.type}] ${entry.message}`)
    this.emit('log', entry)
  }
}

export const logger = new AppLogger()
