const hapi = require('hapi')
const StdOutInterceptor = require('fixture-stdout')
const laabr = require('../src')
const utils = require('../src/utils')

/**
 * @function
 * @public
 *
 * Disable stream interceptors
 *
 * @param {StdOutInterceptor} interceptOut The initiated interceptor for stdout
 * @param {StdOutInterceptor} interceptErr The initiated interceptor for stderr
 */
function disableInterceptor (interceptOut, interceptErr) {
  interceptOut.release()
  interceptErr.release()
}

/**
 * @function
 * @public
 *
 * Initiate and get `stdout` interceptor decorated with
 * further methods to help debugging and testing
 *
 * @returns {StdOutInterceptor} The initiated interceptor
 */
function getInterceptor (options = { stream: process.stdout }) {
  const interceptor = new StdOutInterceptor(options)
  const _writes = []

  interceptor.capture((string, encoding, fd) => {
    _writes.push({
      string,
      encoding,
      fd
    })
    return false
  })

  interceptor.get = () => _writes
  interceptor.find = (search) => (
    _writes.find((item) => item.string.includes(search))
  )

  return interceptor
}

/**
 * @function
 * @public
 *
 * Register the `laabr` plugin with passed options
 *
 * @param {Hapi.Server} server The server to be decorated
 * @param {Object} options The plugin related options
 * @param {Function} done The success callback handler
 */
function registerPlugin (server, options, done = () => {}) {
  server.register({
    register: laabr.plugin,
    options
  }, () => {
    done(server)
  })
}

/**
 * @function
 * @public
 *
 * Create server with routes, plugin and error handler
 *
 * @param {Object} options The plugin related options
 * @param {Function} done The success callback handler
 * @returns {Hapi.Server} The created server instance
 */
function getServer (options, done) {
  const server = new hapi.Server()

  server.connection({
    host: '127.0.0.1',
    port: 1337
  })

  server.route([
    {
      method: '*',
      path: '/response/{code}',
      handler (req, reply) {
        reply({ foo: 42 }).code(parseInt(req.params.code))
      }
    },
    {
      method: '*',
      path: '/requestError',
      handler (req, reply) {
        reply(new Error('foobar'))
      }
    }
  ])

  registerPlugin(server, options, done)
  process.on('SIGINT', () => {
    server.stop({ timeout: 10000 }).then((err) => {
      process.exit((err) ? 1 : 0)
    })
  })

  return server
}

module.exports = {
  disableInterceptor,
  noop: utils.noop,
  getInterceptor,
  getServer,
  registerPlugin
}
