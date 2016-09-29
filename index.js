const trevorbot = require('./handler.js').trevorbot

trevorbot({
  body: {
    text: '@trevorbot ' + process.argv,
    user_name: 'someone'
  }
}, null, console.log)
