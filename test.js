/* globals describe, expect, jasmine, it */

var nock = require('nock')
var qs = require('qs')

var trevorbot = require('./handler').trevorbot

const TIMBUKTU = JSON.stringify({
  location: {
    now: {
      city: 'Timbuktu',
      country: 'Mali',
      latitude: 17,
      longitude: -3,
      epoch_start: 1500249600,
      epoch_end: 1500854400,
      date_start: '2017-07-17',
      date_end: '2017-07-24'
    }
  }
})

function makeQuery (text) {
  return {
    body: qs.stringify({
      channel_id: 'TEST',
      channel_name: 'test',
      service_id: '80586480853',
      team_domain: 'test',
      team_id: 'TEST',
      text: `@trevorbot ${text}`,
      timestamp: '1500397663.929595',
      token: 'TEST',
      trigger_word: '@trevorbot',
      user_id: 'TEST',
      user_name: 'test_user'
    })
  }
}

describe('trevorbot', () => {
  describe('problems', function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000

    // needs to have function so mocha will provide this.timeout?
    it('should handle server connection timeout', done => {
      var scope = nock('https://nomadlist.com')
        .get('/@trevorgerhardt.json')
        .delayConnection(60000)
        .reply(200, TIMBUKTU)

      trevorbot(makeQuery('where is Trevor?'), null, (err, result) => {
        scope.done()
        expect(err).not.toBeTruthy()
        expect(result).toMatchSnapshot()
        done()
      })
    })

    it('should handle server response timeout', done => {
      var scope = nock('https://nomadlist.com')
        .get('/@trevorgerhardt.json')
        .socketDelay(60000)
        .reply(200, TIMBUKTU)

      trevorbot(makeQuery('where is Trevor?'), null, (err, result) => {
        scope.done()
        expect(err).not.toBeTruthy()
        expect(result).toMatchSnapshot()
        done()
      })
    })
  })

  describe('successes', () => {
    it('unrecognized command should return something', done => {
      trevorbot(makeQuery('Arblegarbl'), null, (err, result) => {
        expect(err).not.toBeTruthy()
        expect(result).toMatchSnapshot()
        done()
      })
    })

    it('where query for non-trevor person should not work', done => {
      trevorbot(
        makeQuery('where in the world is Carmen SanDiego?'),
        null,
        (err, result) => {
          expect(err).not.toBeTruthy()
          expect(result).toMatchSnapshot()
          done()
        }
      )
    })

    it('where query for trevor should work', done => {
      var scope = nock('https://nomadlist.com')
        .get('/@trevorgerhardt.json')
        .reply(200, TIMBUKTU)

      trevorbot(makeQuery('where is Trevor?'), null, (err, result) => {
        expect(err).not.toBeTruthy()
        expect(result).toMatchSnapshot()
        scope.done()
        done()
      })
    })

    it('trevor should tell a Chuck Norris joke', done => {
      var scope = nock('http://api.icndb.com').get('/jokes/random').reply(
        200,
        JSON.stringify({
          type: 'success',
          value: {
            id: 554,
            joke: 'Chuck Norris can install a 64 bit OS on 32 bit machines.',
            categories: ['nerdy']
          }
        })
      )

      trevorbot(
        makeQuery('tell me about Chuck Norris'),
        null,
        (err, result) => {
          expect(err).not.toBeTruthy()
          expect(result).toMatchSnapshot()
          scope.done()
          done()
        }
      )
    })
  })
})
