var AuthenticationContext = require('adal-node').AuthenticationContext;
var crypto = require('crypto');
var express = require('express');
var request = require('request');

require('dotenv').config()
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var authorityHostUrl = 'https://login.windows.net';
var azureAdTenant = 'grdegr.onmicrosoft.com';
var authorityUrl = authorityHostUrl + '/' + azureAdTenant;
var redirectUri = 'http://localhost:1337/gettoken';

var dynamicsInstance = 'https://game.api.crm.dynamics.com'
var resource = dynamicsInstance;
var resourceApiEndpoint = '/api/data/v9.0/';
var apiUrl = resource + '/' + resourceApiEndpoint;

var key = process.env.BUSINESS_CENTRAL_WEB_SERVICE_ACCESS_KEY;
var bcClientId = process.env.BUSINESS_CENTRAL_CLIENT_ID;
var bcClientSecret = process.env.BUSINESS_CENTRAL_CLIENT_SECRET;
var bcEndpoint = 'https://api.businesscentral.dynamics.com/v1.0/api/beta';
var x = 'https://api.businesscentral.dynamics.com/v1.0/' + azureAdTenant + '/api/beta';

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
var accessToken = '';
app.get('/gettoken', function(req, res) {

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
      var account = response.body.value[0];
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
        accountLink = dynamicsInstance + `main.aspx?etn=${etn}&pagetype=${pagetype}&id=%7B${id}%7D`;
      }
      console.log('GET account with id ' + accountId + ' and Name is ' + accountName);
      console.log("Here's a link to the account in Dynamics " + accountLink);
    }
    else {
      console.log('response is null');
    }
  });
});

app.get('/createservicendpoint', (req, res) => {
  var webhookEndpoint = apiUrl + '/serviceendpoints';
  var proxy = 'https://msbcdemo.free.beeceptor.com';

  var webHookPayload =
  {
    'messageformat': 2, // json
    'namespaceformat': 1, // Namespace Address
    'path': '',
    'userclaim': 1, // None
    'authtype': 4, // Webhook Key
    'contract': 8, // Webhook
    'url': proxy,
    'name': 'Webhook Using Code',
    'authvalue': 'none'
  };

  request({
    url: apiUrl + webhookEndpoint,
    method: 'POST',
    json: true,
    body: webHookPayload,
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  }, (err, response, body) => {
    res.send(response || err);
  });
});

app.get('/createserviceendpointstep', (req, res) => {
  // createStep for WebHook
  var sdkmessageprocessingsteps = apiUrl + '/sdkmessages?$filter=name eq "create"&$select=sdkmessageid';
  var stepEndpoint = apiUrl + '/sdkmessageprocessingsteps';

  var webHookPayload =
  {
    'configuration':null,
    'asyncautodelete': true,
    'canusereadonlyconnection': false,
    'description': 'CRM to BC: Create of account',
    'eventhandler_serviceendpoint@odata.bind': '/serviceendpoints(09cdfe1c-d074-e811-a957-000d3a1d709f)',
    'mode': 1,
    'rank': 1,
    'filteringattributes': null,
    'name': 'CRM to BC: Create of account',
    'sdkmessagefilterid@odata.bind': '/sdkmessagefilters(c2c5bb1b-ea3e-db11-86a7-000a3a5473e8)',
    'sdkmessageid@odata.bind': '/sdkmessages(9ebdbb1b-ea3e-db11-86a7-000a3a5473e8)',
    'stage': 40, // 40 - post-operation
    'statecode': 0, // 0  enabled
    'statuscode': 1, // 1  enabled
    'supporteddeployment': 0 // 0 Server only
    };
  });



