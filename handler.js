'use strict'

var each = require('async-each')
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

/**
 * Get Location data for a person
 *
 * @param  {Object}   person
 * @param  {Function} cb     callback
 */
function getLocationInfo (person, cb) {
  if (person.nomandlistAccountName) {
    // person is a nomad or has a nomadlist account, look there
    makeRequest(
      https,
      'nomadlist.com',
      person.nomandlistAccountName,
      (err, data) => {
        if (err) {
          return cb(
            null,
            `I couldn't figure out where ${person.name} is! :astonished:`
          )
        }

        // console.log(data)
        var curLocation = data.location.people

        let text = getTextForLocation(
          person.name,
          sanitizeChars(curLocation.city),
          sanitizeChars(curLocation.country),
          curLocation.latitude,
          curLocation.longitude
        )
        text += ` (https://nomadlist.com/${person.nomandlistAccountName})`
        cb(null, text)
      }
    )
  } else {
    // TODO look at Google Calendar

    // return home location
    cb(
      null,
      getTextForLocation(
        person.name,
        person.home.city,
        person.home.country,
        person.home.lat,
        person.home.lon
      )
    )
  }
}

/**
 * Helper to get create text of person's name and time at their location
 *
 * @param  {string} personName
 * @param  {string} city
 * @param  {string} country
 * @param  {number} lat
 * @param  {number} lon
 * @return {string}
 */
function getTextForLocation (personName, city, country, lat, lon) {
  // console.log(personName, city, country, lat, lon)
  const curTime = moment().tz(tz(lat, lon)).format('HH:mm')
  return `${personName} is in ${city}, ${country}.  The current time there is *${curTime}*.`
}

let peopleJsonFilename = './people.json'

module.exports.setPeopleJson = (filename) => {
  peopleJsonFilename = filename
}

// AWS Lambda function handler
module.exports.trevorbot = (event, context, cb) => {
  /**
   * Helper to parse response from getting location texts for each person.
   *
   * @param  {Error} err
   * @param  {string[]} contents
   */
  function parseContentsResponse (err, contents) {
    if (err) {
      return respond(`I couldn't figure that out right now! :astonished:`)
    }
    respond(contents.join('\n'))
  }

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

  /**
   * Helper to respond that person requested is not known (not found in people.json).
   */
  function unknownPerson () {
    let allPeople = ''
    people.forEach((person, idx) => {
      if (idx === people.length - 1) {
        allPeople += ' and '
      } else if (allPeople.length > 0) {
        allPeople += ', '
      }
      allPeople += person.name
    })
    respond(`I only know where ${allPeople} are.`)
  }

  var people = require(peopleJsonFilename)

  var query = qs.parse(event.body)
  var text = query.text.toLowerCase()
  if (text.indexOf('where') > -1) {
    // trying to find where 1 or more people are

    text = text.replace('trevorbot', '')
    const matchedPeople = []
    people.forEach(person => {
      if (text.indexOf(person.name.toLowerCase()) > -1) {
        matchedPeople.push(person)
      }
    })

    if (text.indexOf('everyone') > -1) {
      // find everyone's locations
      each(people, getLocationInfo, parseContentsResponse)
    } else if (matchedPeople.length > 0) {
      // 1 or more people's locations requested
      each(matchedPeople, getLocationInfo, parseContentsResponse)
    } else if (text.indexOf(' i') > -1) {
      // someone is asking where they are
      // figure out who it is
      const userName = query.user_name.toLowerCase()
      let matchedPerson = null
      for (var i = 0; i < people.length; i++) {
        if (people[i].userName === userName) {
          matchedPerson = people[i]
          break
        }
      }

      if (!matchedPerson) {
        return unknownPerson()
      }

      getLocationInfo(matchedPerson, (err, text) => {
        parseContentsResponse(err, [text])
      })
    } else {
      unknownPerson()
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
