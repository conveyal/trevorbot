// this script is primarily used for running manually from the command line during development
const qs = require('qs')

const handler = require('./handler')

const event = {
  body: qs.stringify({
    user_name: 'Trevor',
    text: 'Where\'s Trevor?'
  })
}

handler.trevorbot(event, null, (err, text) => {
  if (err) {
    console.error(err)
    return
  }

  console.log(text)
})
