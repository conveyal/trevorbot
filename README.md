## Trevorbot

A bot that figures out where a bunch of people are... especially Trevor.  Intended for use with AWS Lambda + Slack.

### Configuration

Create a `people.json` file based off of the `people-example.json` file.  If a person has a [Nomad List](https://nomadlist.com/) account, be sure to note that.  Otherwise, add home locations.

### Deployment

Have an AWS account setup and credentials stored on your computer.  Setup a Slack webhook for the bot.

Install [serverless](https://github.com/serverless/serverless) via `npm i -g serverless`

Then run `serverless deploy`
