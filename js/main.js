var AuthenticationContext = require('adal-node').AuthenticationContext;
var crypto = require('crypto');
var express = require('express');
var request = require('request');

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var authorityHostUrl = 'https://login.windows.net';
var azureAdTenant = 'grdegr.onmicrosoft.com';
var authorityUrl = authorityHostUrl + '/' + azureAdTenant;
var redirectUri = 'http://localhost:3000/getAToken';

var resource = 'https://orgebe09fbc.api.crm.dynamics.com';
var resourceApiEndpoint = 'api/data/v9.0/';
var apiUrl = resource + '/' + resourceApiEndpoint;
var templateAuthzUrl = 'https://login.windows.net/' +
                        azureAdTenant +
                        '/oauth2/authorize?response_type=code&client_id=' +
                        clientId +
                        '&redirect_uri=' +
                        redirectUri +
                        '&state=<state>&resource=' +
                        resource;

function createAuthorizationUrl(state) {
  return templateAuthzUrl.replace('<state>', state);
}

var app = express();
var port = 1337;

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

// Clients redirected to create an OAuth authorize url and is redirected to AAD.
// Then they will authenticate and give consent to allow this code to access their Dynamics 365 API
app.get('/auth', function(req, res) {
  crypto.randomBytes(48, function(ex, buf) {
    var token = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');
    res.cookie('authstate', token);
    var authorizationUrl = createAuthorizationUrl(token);
    console.log('redirecting to auth url: ' + authorizationUrl);
    res.redirect(authorizationUrl);
  });
});

// After consent is granted AAD redirects here.  The ADAL library and retrieves an access token that is used to make calls to Dynamics 365.
app.get('/getAToken', function(req, res) {

  var authenticationContext = new AuthenticationContext(authorityUrl);

  console.log('getting auth context');

  authenticationContext.acquireTokenWithAuthorizationCode(
    req.query.code,
    redirectUri,
    resource,
    clientId,
    clientSecret,
    function(err, response) {
      var message = '';
      if (err) {
        message = 'error: ' + err.message + '\n';
        return res.send(message)
      }

      accessToken = response.accessToken;

      res.send('access token updated');
    }
  );
});

app.get('/getaccount', (req, res) => {
  console.log('in get account');

  var body = '';
  request({
    url: apiUrl + '/accounts?$top=1',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + accessToken
    },
    json: JSON.stringify(body)
  }, (err, response, body) => {
    res.send(response || err);

    if (response) {
      var account = response.value[0];
      var accountId = '';
      var accountName = '';

      var etn = 'account';
      var pagetype = 'entityrecord';
      var id = '';
      var accountLink = '';

      if (account.accountid && account.name) {
        accountId = account.accountid.toString();
        accountName = account.name;
        id = accountId;
        accountLink = `http://smartsheetdev.crm.dynamics.com/main.aspx?etn=${etn}&pagetype=${pagetype}&id=%7B${id}%7D`;
      }
      console.log('GET account with id ' + accountId + ' and Name is ' + accountName);
      console.log("Here's a link to the account in Dynamics " + accountLink);
    }
    else {
      console.log('response is null');
    }
  });
});

var webhookEndpoint = '' + '/api/data/v9.0/serviceendpoints';
var proxy = 'http://msbcdemo.proxy.beeceptor.com';
var payload =
{
  'messageformat': 2, // json
  'namespaceformat': 1, // Namespace Address
  'path': ' ',
  'userclaim': 1, //None
  'authtype': 4, // Webhook Key
  'contract': 8, // Webhook
  'url': proxy,
  'name': 'Webhook Using Code',
  'authvalue': 'test'
}

