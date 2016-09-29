/* globals describe, it */

var expect = require('chai').expect
var nock = require('nock')
var trevorbot = require('./handler').trevorbot

const TIMBUKTU = JSON.stringify({
  location: {
    now: {
      city: 'Timbuktu',
      country: 'Mali'
    }
  }
})

function makeQueryText (text) {
  return {
    body: {
      text: '@trevorbot ' + text,
      user_name: 'someone'
    }
  }
}

describe('trevorbot', () => {
  describe('problems', function () {  // needs to have function so mocha will provide this.timeout?
    this.timeout(6000)
    this.slow(20000)

    it('should handle server connection timeout', (done) => {
      var scope = nock('https://nomadlist.com')
        .get('/trevorgerhardt.json')
        .delayConnection(60000)
        .reply(200, TIMBUKTU)

      trevorbot(makeQueryText('where is Trevor?'), null, (err, result) => {
        scope.done()
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'I couldn\'t figure that out right now :astonished:')
        done()
      })
    })

    it('should handle server response timeout', (done) => {
      var scope = nock('https://nomadlist.com')
        .get('/trevorgerhardt.json')
        .socketDelay(60000)
        .reply(200, TIMBUKTU)

      trevorbot(makeQueryText('where is Trevor?'), null, (err, result) => {
        scope.done()
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'I couldn\'t figure that out right now :astonished:')
        done()
      })
    })
  })

  describe('successes', () => {
    it('unrecognized command should return something', (done) => {
      trevorbot(makeQueryText('Arblegarbl'), null, (err, result) => {
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'I don\'t understand, I\'m afraid :thinking_face:')
        done()
      })
    })

    it('where query for non-trevor person should not work', (done) => {
      trevorbot(makeQueryText('where in the world is Carmen SanDiego?'), null, (err, result) => {
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'I only know where Trevor is.')
        done()
      })
    })

    it('where query for trevor should work', (done) => {
      var scope = nock('https://nomadlist.com')
        .get('/trevorgerhardt.json')
        .reply(200, TIMBUKTU)

      trevorbot(makeQueryText('where is Trevor?'), null, (err, result) => {
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'Trevor is in Timbuktu, Mali (https://nomadlist.com/trevorgerhardt)')
        scope.done()
        done()
      })
    })

    it('trevor should tell a Chuck Norris joke', (done) => {
      var scope = nock('http://api.icndb.com')
        .get('/jokes/random')
        .reply(200, JSON.stringify({
          type: 'success',
          value: {
            id: 554,
            joke: 'Chuck Norris can install a 64 bit OS on 32 bit machines.',
            categories: [
              'nerdy'
            ]
          }
        }))

      trevorbot(makeQueryText('tell me about Chuck Norris'), null, (err, result) => {
        expect(err).to.not.exist
        expect(result).to.have.property('text', 'Chuck Norris can install a 64 bit OS on 32 bit machines.')
        scope.done()
        done()
      })
    })
  })
})
