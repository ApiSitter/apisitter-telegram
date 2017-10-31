[![Apisitter Logo](https://apisitter.io/img/site/logo_apisitter_npm.png) ](https://apisitter.io/)
  Telegram messaging api wrapper. For more info [apisitter.io](http://apisitter.io).
  
## Installation

This is a [Node.js](https://nodejs.org/) module available through the [npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/).

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install apisitter-telegram --save
```

Follow [our installing guide](https://apisitter.io/documentation/started/start_guide.html) for more information.

## Features
You can create a custom chat in your project, using Telegram services made simple by apisitter.
  * Phonebook management
  * User-to-user messaging and group chat
  * Send/receive text and media messages
  * Push notifications
  * Unlimited historical messages
  * And much more...
 
For more info [apisitter.io](http://apisitter.io).

## Docs & Community

  * [Website](http://apisitter.io/)
  * [[website documentation](https://apisitter.io/documentation/started/start_guide.html)]

## Examples
You can find a list of complete sample and Starter Guide on our site [our Starter Guide](https://apisitter.io/documentation/started/start_guide.html).

A simple guide to how easy it is to integrate Telegram into your app is the following example:
```js
var apiSitter = require("apisitter-telegram");

var idClientTelegram = "YOUR_ID_CLIENT_TELEGRAM";
var tokenClientTelegram = "YOUR_TOKEN_CLIENT_TELEGRAM";

apiSitter.setClientTelegramAuthParameters(idClientTelegram, tokenClientTelegram);

// Example of get your phonebook
var data = {hash: ""};
apiSitter.callApi("POST", "contacts.getContacts", data, function(err, res, body){
  if(res == 200){
    // Your phonebook is in body result
    console.log(JSON.stringify(body));
  }
});

// Example of received messages listener
apiSitter.initUpdatesListener(function (err, res, body) {
  if(res == 200){
    // Your receive message is in body result
    console.log(JSON.stringify(body));
  }
});
apiSitter.startUpdatesListener();
```

