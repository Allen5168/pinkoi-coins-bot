import fs from 'fs'
import path from 'path'
import log from 'loglevel'
import { program } from 'commander'
import Bot from './pinkoi-bot'

const EXIT_TASK_FAILED = 1
const EXIT_LOGIN_FAILED = 69
const EXIT_CODE_INVALID_ARGUMENT = 87
const EXIT_CODE_UNKNOWN_ERROR = 255

log.setDefaultLevel(process.env['DEBUG'] ? 'debug' : 'info')

program
  .name('docker run -v /path/to/cookie:/cookie -it hyperbola/pinkoi-coins-bot:1')
  .usage('--cookie /cookie [--checkin | --solve-weekly-usage]')
  .description('A bot to checkin to get Pinkoi coins.')
  .requiredOption('-c, --cookie <path>', 'path to cookie')
  .option('-s, --checkin', 'checkin Pinkoi')
  .option('-m, --solve-weekly-mission', 'solve Pinkoi weekly mission')
  .helpOption('-h, --help', 'show this message')
  .version('1.0.1', '-v, --version')
  .exitOverride((e) => process.exit(e.exitCode === 1 ? EXIT_CODE_INVALID_ARGUMENT : e.exitCode))

async function main() {
  // Argument validation.
  program.parse(process.argv)
  const args = program.opts()
  if (args.checkin === args.solveWeeklyMission) {
    log.error('You should run exactly one of --checkin or --solve-weekly-mission.')
    process.exit(EXIT_CODE_INVALID_ARGUMENT)
  }

  // Load cookie.
  log.debug('Load cookie from: ' + args.cookie)
  let cookie: string
  try {
    cookie = fs.readFileSync(path.resolve(args.cookie), 'utf-8').trim()
  } catch (e: unknown) {
    log.error('Failed to read cookie: ' + args.cookie)
    if (e instanceof Error) {
      log.error(e.message)
    }
    process.exit(EXIT_CODE_INVALID_ARGUMENT)
  }
  log.info('Cookie loaded.')
  log.debug('Use cookie: ' + cookie.slice(0, 128) + ' [truncated]')

  // Create a bot.
  const bot = new Bot(cookie)

  // Check user login.
  log.debug('Check user login.')
  const user = await bot.getUser()
  if (user === undefined) {
    log.error('Login failed. Please check your cookie.')
    process.exit(EXIT_LOGIN_FAILED)
  }
  log.info(`Login as ${user.nick} <${user.email}>.`)

  // Run bot.
  try {
    await (args.checkin ? bot.checkin() : bot.solveWeeklyMission())
  } catch (e: unknown) {
    if (e instanceof Error) {
      log.error(e.message)
      log.debug(e.stack)
      process.exit(EXIT_TASK_FAILED)
    }

    // Unknown error
    log.error('Task failed: unknown error')
    log.debug(e)
    process.exit(EXIT_CODE_UNKNOWN_ERROR)
  }

  log.info('Bye Bye!')
}

main()
