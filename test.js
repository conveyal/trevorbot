/* globals describe, it */

var expect = require('chai').expect
var nock = require('nock')
var trevorbot = require('./handler').trevorbot

function makeQueryText (text) {
  return {
    body: {
      text: '@trevorbot ' + text,
      user_name: 'someone'
    }
  }
}

describe('trevorbot', function () {
  it('unrecognized command should return something', function (done) {
    trevorbot(makeQueryText('Arblegarbl'), null, function (err, result) {
      expect(err).to.not.exist
      expect(result).to.have.property('text', 'I don\'t understand, I\'m afraid :thinking_face:')
      done()
    })
  })

  it('where query for non-trevor person should not work', function (done) {
    trevorbot(makeQueryText('where in the world is Carmen SanDiego?'), null, function (err, result) {
      expect(err).to.not.exist
      expect(result).to.have.property('text', 'I only know where Trevor is.')
      done()
    })
  })

  it('where query for trevor should work', function (done) {
    var scope = nock('https://nomadlist.com')
      .get('/trevorgerhardt.json')
      .reply(200, JSON.stringify({
        location: {
          now: {
            city: 'Timbuktu',
            country: 'Mali'
          }
        }
      }))

    trevorbot(makeQueryText('where is Trevor?'), null, function (err, result) {
      expect(err).to.not.exist
      expect(result).to.have.property('text', 'Trevor is in Timbuktu, Mali (https://nomadlist.com/trevorgerhardt)')
      scope.done()
      done()
    })
  })
})
