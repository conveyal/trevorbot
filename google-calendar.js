const google = require('googleapis')
const GoogleAuth = require('google-auth-library')
const moment = require('moment')

const auth = new GoogleAuth()

const api = google.calendar('v3')
let credentialsFilename = './credentials.json'

module.exports.setCredentials = function (filename) {
  credentialsFilename = filename
}

module.exports.getEvents = function (calendarId, cb) {
  const credentials = require(credentialsFilename)

  const oauth2Client = new auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_url
  )

  oauth2Client.setCredentials(credentials.token)

  api.events.list({
    auth: oauth2Client,
    calendarId,
    timeMin: moment().subtract(14, 'days').toISOString(),
    maxResults: 50
  }, cb)
}
