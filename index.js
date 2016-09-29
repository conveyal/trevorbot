const trevorbot = require('./handler.js').trevorbot

trevorbot({
  body: {
    text: '@trevorbot ' + process.argv.slice(2).join(' '),
    user_name: 'someone'
  }
}, null, console.log)
