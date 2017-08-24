## Trevorbot

A bot that figures out where a bunch of people are... especially Trevor.  Intended for use with AWS Lambda + Slack.

### Configuration

Create a `config.json` file based off of the `config-example.json` file.  If a person has a [Nomad List](https://nomadlist.com/) account, be sure to note that.  Otherwise, add home locations.

To use with Google Calendar, you'll need to authorize a user that has view access to others' calendars.  The way I did this was get a refresh_token by using the [Google Calendar API quickstart script](https://developers.google.com/google-apps/calendar/quickstart/nodejs).  Create a `credentials.json` file based off of the `credentials-example.json` file.  Also, add a [mapzen api key](https://mapzen.com/documentation/overview/api-keys/).

### Deployment

Have an AWS account setup and credentials stored on your computer.  Setup a Slack webhook for the bot.

Install [serverless](https://github.com/serverless/serverless) via `npm i -g serverless`

Then run `serverless deploy`
