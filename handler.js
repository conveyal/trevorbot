'use strict';

var https = require('https')

// Your first function handler
module.exports.trevorbot = (event, context, cb) => {
  if (event.body.text.toLowerCase().indexOf('where') > -1) {
    if (event.body.text.toLowerCase().replace('trevorbot', '').indexOf('trevor') > -1 ||
      event.body.user_name.toLowerCase().indexOf('trevor') > -1 && event.body.text.toLowerCase().indexOf(' i') > -1) {
      https.get({ host: 'nomadlist.com', path: '/trevorgerhardt.json'}, (res) => {
        let body = ''

        res.on('data', (d) => body += d)
        res.on('end', () => {
          let data = JSON.parse(body)
          cb(null, { text: `Trevor is in ${data.location.now.city.replace(/[^ a-zA-Z]/g, '?')}, ${data.location.now.country.replace(/[^ a-zA-Z]/g, '?')} (https://nomadlist.com/trevorgerhardt)` })
        })
      })
    } else {
      cb(null, { text: 'I only know where Trevor is.' })
    }
  } else {
	  cb(null, { text: 'I don\'t understand, I\'m afraid :thinking_face:' })
  }
}

