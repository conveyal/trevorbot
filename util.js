var http = require('http')
var https = require('https')

module.exports.makeRequest = ({data, host, method, path, protocol}, callback) => {
  const reqProtocol = (protocol === 'https' ? https : http)
  var req = reqProtocol.request({host, method, path}, res => {
    let body = ''

    res.on('data', d => {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
      }
      body += d
    })
    res.on('end', () => {
      let json = null
      try {
        json = JSON.parse(body)
      } catch (e) {
        return callback(e)
      }
      callback(null, json)
    })
  })

  req.on('socket', socket => {
    socket.setTimeout(5000)
    socket.on('timeout', () => {
      // console.log('socket timeout');
      req.abort()
    })
  })

  const connectTimeout = setTimeout(() => {
    req.abort()
  }, 5000)

  req.on('error', callback)

  if (data) {
    req.write(JSON.stringify(data))
  }
  req.end()
}

module.exports.sanitizeChars = s => {
  return s.replace(/[^\s\w.:'"]/g, '?')
}
