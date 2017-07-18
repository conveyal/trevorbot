'use strict'

var moment = require('moment-timezone')
var qs = require('qs')
var tz = require('tz-lookup')

var http = require('http')
var https = require('https')

var makeRequest = (protocol, host, path, callback) => {
  var req = protocol.get({host, path}, res => {
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

  req.end()
}

var sanitizeChars = s => {
  return s.replace(/[^\s\w.:'"]/g, '?')
}

// Your first function handler
module.exports.trevorbot = (event, context, cb) => {
  // console.log(`received event ${JSON.stringify(event)}`)
  function respond (text) {
    var response = {
      statusCode: 200,
      body: JSON.stringify({
        text
      })
    }

    // console.log(`responding with ${JSON.stringify(response)}`)
    cb(null, response)
  }

  var query = qs.parse(event.body)
  var text = query.text.toLowerCase()
  if (text.indexOf('where') > -1) {
    if (
      text.replace('trevorbot', '').indexOf('trevor') > -1 ||
      (query.user_name.toLowerCase().indexOf('trevor') > -1 &&
        text.indexOf(' i') > -1)
    ) {
      makeRequest(
        https,
        'nomadlist.com',
        '/@trevorgerhardt.json',
        (err, data) => {
          if (err) {
            return respond("I couldn't figure that out right now :astonished:")
          }
          var curLocation = data.location.now
          var city = sanitizeChars(curLocation.city)
          var country = sanitizeChars(curLocation.country)
          var curTime = moment().tz(tz(curLocation.latitude, curLocation.longitude)).format('HH:mm')
          respond(`Trevor is in ${city}, ${country}.  The current time there is *${curTime}*. (https://nomadlist.com/@trevorgerhardt)`)
        }
      )
    } else {
      respond('I only know where Trevor is.')
    }
  } else if (text.indexOf('chuck norris') > -1) {
    makeRequest(http, 'api.icndb.com', '/jokes/random', (err, data) => {
      if (err) {
        return respond("I don't feel like doing that right now :pensive:")
      }
      respond(sanitizeChars(data.value.joke))
    })
  } else if (text.indexOf('do') > -1 || text.indexOf('are') > -1) {
    respond(Math.random() > 0.5 ? 'yes :thumbsup:' : 'no :thumbsdown:')
  } else {
    respond("I don't understand, I'm afraid :thinking_face:")
  }
}
