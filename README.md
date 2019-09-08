# Loxley
Loxley algotrader running on Alpaca Markets.

## Setting up your config.json

In order for Loxley to run, you need to setup the `config.json` file.  An example is shown below -- make sure to replace the `secretKey` and `keyId` with the ones configured for your Alpaca account, and the slackHook for updates on your slack server..

``` JSON
{
    "alpaca": {
        "keyId": "####################",
        "secretKey": "########################################",
        "paper": true
    },
    "slackHook": "https://hooks.slack.com/services/#############/##############################"
}
```
`paper` is whether or not to use the fake 'paper' money for testing
```

### Running Loxley

Now that you have Loxley successfully setup, we want to make sure all dependencies are installed.  Depending on what package manager you use, run either
`yarn`
or
`npm install`.

To run your Loxley instance, use `yarn run start` or `node app`.  If you use PM2, and want to use the deploy script I included, for your first-time setup run
`pm2 start -f ./server.sh --name loxley`.

Then, whenever you need to update, you just need to use `sudo yarn install && sudo yarn run deploy`
