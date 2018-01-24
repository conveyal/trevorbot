'use strict'

const each = require('async-each')
const fetch = require('isomorphic-fetch')
const moment = require('moment-timezone')
const qs = require('qs')
const tz = require('tz-lookup')

const calendar = require('./google-calendar')
const util = require('./util')

let credentials

/**
 * Try to find an all-day event with the person in question happening today
 *
 * @param  {Array} events
 * @param  {Object} person
 * @param  {Object} cb
 * @return {string}        String of event if found, otherwise null
 */
function findOutOfTownEvent (events, person, cb) {
  if (!credentials) {
    credentials = require(credentialsFilename)
  }

  const now = moment()
  for (var i = 0; i < events.items.length; i++) {
    var event = events.items[i]
    if (event.start && event.start.date) {
      // all day event
      if (
        moment(event.start.date).isBefore(now) &&
        moment(event.end.date).isAfter(now)
      ) {
        // all day event is within range
        // check if summary says person is out of town
        const outOfOfficePatterns = [
          new RegExp(`${person.name.toLowerCase()}.*in (.*)`),
          new RegExp(`${person.name.toLowerCase()} out ((.*))`)
        ]
        for (var j = 0; j < outOfOfficePatterns.length; j++) {
          const match = event.summary.toLowerCase().match(outOfOfficePatterns[j])
          if (match) {
            // person is out of town, do geocode to get exact location
            const url = 'https://search.mapzen.com/v1/search'
            const query = {
              api_key: credentials.mapzenApiKey,
              text: match[1]
            }
            fetch(`${url}?${qs.stringify(query)}`)
              .then((res) => res.json())
              .then((geojson) => {
                if (geojson.features.length === 0) {
                  cb(null, `${person.name}'s calendar says they are in ${match[1]}, but I have no idea where that is.  :confused:`)
                } else {
                  const firstFeature = geojson.features[0]
                  cb(null, getTextForLocation(
                    person.name,
                    firstFeature.properties.label,
                    firstFeature.geometry.coordinates[1],
                    firstFeature.geometry.coordinates[0]
                  ))
                }
              }).catch((err) => {
                console.error(err)
                cb(err)
              })
            return
          }
        }
      }
    }
  }
  cb(null, null)
}

/**
 * Try to find user's location from home data
 * and if no location, just give up
 *
 * @param  {string}   [warningText] possible warning text to append
 * @param  {Object}   person
 * @param  {Function} cb
 */
function getPersonLocationFromHomeData (warningText, person, cb) {
  // return home location
  if (!person.home) {
    return cb(null, `I have no idea where ${person.name} is. :confused:`)
  }

  cb(
    null,
    (warningText || '') + getTextForLocation(
      person.name,
      `${person.home.city}, ${person.home.country}`,
      person.home.lat,
      person.home.lon
    )
  )
}

/**
 * Try to find person's location based on their personal calendar.
 * If not found, continue to home location queries.
 *
 * @param  {Object}   person
 * @param  {Function} cb
 */
function getGoogleCalendarDataForPerson (person, cb) {
  if (person.calendarId) {
    // person has a google calendar, see if they're away
    calendar.getEvents(person.calendarId, (err, events) => {
      if (err) {
        console.error(err)
        return getPersonLocationFromHomeData(
          `I couldn't load ${person.name}'s calendar, but I'm guessing `,
          person,
          cb)
      }

      // got events, see if they're out of town
      findOutOfTownEvent(events, person, (err, outOfOfficeEvent) => {
        if (err) {
          console.error(err)
        }
        if (outOfOfficeEvent) {
          return cb(null, outOfOfficeEvent)
        }

        // not out of town, send data about home location
        getPersonLocationFromHomeData(
          null,
          person,
          cb)
      })
    })
  } else {
    console.log(`no calendar configured for ${person.name}`)
    getPersonLocationFromHomeData(
      `I can't view ${person.name}'s calendar, but I'm guessing `,
      person,
      cb)
  }
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
    util.makeRequest({
      host: 'nomadlist.com',
      path: person.nomandlistAccountName,
      protocol: 'https'
    }, (err, data) => {
      if (err) {
        return cb(
          null,
          `I couldn't figure out where ${person.name} is! :astonished:`
        )
      }

      var curLocation = data.location.now

      let text = getTextForLocation(
        person.name,
        `${util.sanitizeChars(curLocation.city)}, ${util.sanitizeChars(curLocation.country)}`,
        curLocation.latitude,
        curLocation.longitude
      )
      text += ` (https://nomadlist.com/${person.nomandlistAccountName})`
      cb(null, text)
    })
  } else {
    // send of through chain of Google Calendar, etc
    getOutOfOfficeEventsForPerson(person, cb)
  }
}

let fetchingOutOfOfficeEvents = false
let fetchedOutOfOfficeEvents = false
let outOfOfficeEvents
const queuedOutOfOfficeRequests = []

/**
 * Make a request to the Google Calendar API to get the out of office calendar
 * Enqueue all requests and resolve all of them after receiving response.
 *
 * @param  {Object}   person
 * @param  {Function} cb
 */
function getOutOfOfficeEventsForPerson (person, cb) {
  function checkIfOutOfOffice (person, cb) {
    if (outOfOfficeEvents === -1) {
      // error getting out-of-office calendar, try next best option
      return getGoogleCalendarDataForPerson(person, cb)
    }

    // Look for event
    findOutOfTownEvent(outOfOfficeEvents, person, (err, outOfOfficeEvent) => {
      if (err) {
        console.error(err)
      }
      if (outOfOfficeEvent) {
        return cb(null, outOfOfficeEvent)
      }

      // No out of office event, look at person's Google Calendar
      getGoogleCalendarDataForPerson(person, cb)
    })
  }

  if (!config.outOfOfficeCalendarId) {
    return getGoogleCalendarDataForPerson(person, cb)
  }

  if (!fetchedOutOfOfficeEvents) {
    if (!fetchingOutOfOfficeEvents) {
      calendar.getEvents(config.outOfOfficeCalendarId, (err, events) => {
        fetchedOutOfOfficeEvents = true
        if (err) {
          console.error(err)
          outOfOfficeEvents = -1
        } else {
          outOfOfficeEvents = events
        }
        checkIfOutOfOffice(person, cb)
        if (queuedOutOfOfficeRequests.length > 0) {
          queuedOutOfOfficeRequests.forEach((fn) => {
            fn()
          })
        }
      })
      fetchingOutOfOfficeEvents = true
    } else {
      queuedOutOfOfficeRequests.push(() => checkIfOutOfOffice(person, cb))
    }
  } else {
    checkIfOutOfOffice(person, cb)
  }
}

/**
 * Helper to get create text of person's name and time at their location
 *
 * @param  {string} personName
 * @param  {string} label
 * @param  {number} lat
 * @param  {number} lon
 * @return {string}
 */
function getTextForLocation (personName, label, lat, lon) {
  // console.log(personName, city, country, lat, lon)
  const curTime = moment().tz(tz(lat, lon)).format('HH:mm')
  return `${personName} is in ${label}.  The current time there is *${curTime}*.`
}

/**
 * Randomly choose a value from an array
 * @param  {Array} arr
 * @return {Mixed}
 */
function choice (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

let config
let configFilename = './config.json'
let credentialsFilename = './credentials.json'

module.exports.setConfig = (filename) => {
  configFilename = filename
}

module.exports.setCredentials = function (filename) {
  credentialsFilename = filename
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
      console.error(err)
      return respond(`I couldn't figure that out right now! :astonished:`)
    }
    let response = outOfOfficeEvents === -1
      ? 'There was an error getting the out-of-office calendar, but here\'s my best guess:\n'
      : ''
    response += contents.join('\n')
    respond(response)
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

  config = require(configFilename)
  const people = config.people

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
    } else if (text.match(/\bi\b/i)) {
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
        return respond(`I don't know your whereabouts, ${query.user_name}`)
      }

      getLocationInfo(matchedPerson, (err, text) => {
        parseContentsResponse(err, [text])
      })
    } else {
      unknownPerson()
    }
  } else if (text.indexOf('chuck norris') > -1) {
    util.makeRequest({
      host: 'api.icndb.com',
      path: '/jokes/random',
      protocol: 'http'
    }, (err, data) => {
      if (err) {
        return respond("I don't feel like doing that right now :pensive:")
      }
      respond(util.sanitizeChars(data.value.joke))
    })
  } else if (text.indexOf('why') > -1) {
    const antagonists = ['I', 'the President of the United States of America',
      'Tom Cruise', 'a herd of gerbils', 'an angry swarm of bees',
      'a unicorn', 'an unkown force of nature']

    const actions = ['broke', 'successfully negotiated a treaty with',
      'destroyed', 'wrote a book about', 'was the first to discover',
      'overhearing a suspicious conversation about']

    const things = ['it', 'the Statue of Liberty', 'radioactive sludge',
      'a helicopter full of spaghetti', 'the office']

    respond(`because ${choice(antagonists)} ${choice(actions)} ${choice(things)}.`)
  } else if (text.indexOf('do') > -1 || text.indexOf('are') > -1) {
    respond(Math.random() > 0.5 ? 'yes :thumbsup:' : 'no :thumbsdown:')
  } else {
    respond("I don't understand, I'm afraid :thinking_face:")
  }
}
