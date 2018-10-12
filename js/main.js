var AuthenticationContext = require('adal-node').AuthenticationContext;
var crypto = require('crypto');
var express = require('express');
var request = require('request');

require('dotenv').config()
var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;

var authorityHostUrl = 'https://login.windows.net';
var azureAdTenant = 'grdegr.onmicrosoft.com';

var dynCrmInstance = 'https://game.api.crm.dynamics.com';
var dynBusinessCentralCommonEndpoint = 'https://api.businesscentral.dynamics.com/v1.0/api/beta';

var dynCrmApiUrl = dynCrmInstance + '/api/data/v9.0/';

var crmRedirectUri = 'http://localhost:1337/getcrmtoken';
var bcRedirectUri = 'http://localhost:1337/getbctoken';

var dynCrmAuthUrl = authorityHostUrl +
                        azureAdTenant +
                        '/oauth2/authorize?response_type=code&client_id=' +
                        clientId +
                        '&redirect_uri=' +
                        crmRedirectUri +
                        '&state=<state>&resource=' +
                        dynCrmInstance;

var dynBusinessCentralAuthUrl = authorityHostUrl + '/' +
                        azureAdTenant +
                        '/oauth2/authorize?response_type=code&client_id=' +
                        clientId +
                        '&redirect_uri=' +
                        bcRedirectUri +
                        '&state=<state>&resource=' +
                        'https://api.businesscentral.dynamics.com';

var app = express();
var port = 1337;
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

// Clients redirected to create an OAuth authorize url and is redirected to AAD.
// Then they will authenticate and give consent to allow this code to access their Dynamics 365 API
app.get('/crmauth', function(req, res) {
  crypto.randomBytes(48, function(ex, buf) {
    var crmToken = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');
    res.cookie('authstate', crmToken);
    var authorizationUrl = dynCrmAuthUrl.replace('<state>', crmToken);

    console.log('redirecting to auth url: ' + authorizationUrl);
    res.redirect(authorizationUrl);
  });
});

app.get('/bcauth', function(req, res) {
  crypto.randomBytes(48, function(ex, buf) {
    var bcToken = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');
    res.cookie('authstate', bcToken);
    var dynBusinessCentralAuthUrlauthorizationUrl = dynBusinessCentralAuthUrl.replace('<state>', bcToken);

    console.log('redirecting to auth url: ' + dynBusinessCentralAuthUrlauthorizationUrl);
    res.redirect(dynBusinessCentralAuthUrlauthorizationUrl);
  });
});

// After consent is granted AAD redirects here.  The ADAL library and retrieves an access token that is used to make calls to Dynamics 365.
var accessToken = '';
var bcAccessToken = '';
app.get('/getcrmtoken', function(req, res) {

  var authorityUrl = authorityHostUrl + '/' + azureAdTenant;
  var authenticationContext = new AuthenticationContext(authorityUrl);
  console.log('getting crm auth context');
  authenticationContext.acquireTokenWithAuthorizationCode(
    req.query.code,
    crmRedirectUri,
    dynCrmInstance,
    clientId,
    clientSecret,
    function(err, response) {
      var message = '';
      if (err) {
        message = 'error: ' + err.message + '\n';
        return res.send(message)
      }

      accessToken = response.accessToken;
      console.log('crm token ' + accessToken);

      res.send('crm access token updated');
    }
  );
});

app.get('/getbctoken', function(req, res) {

  var authorityUrl = authorityHostUrl + '/' + azureAdTenant;
  var authenticationContext = new AuthenticationContext(authorityUrl);

  console.log('getting bc auth context');
  authenticationContext.acquireTokenWithAuthorizationCode(
    req.query.code,
    bcRedirectUri,
    'https://api.businesscentral.dynamics.com/',
    clientId,
    clientSecret,
    function(err, response) {
      var message = '';
      if (err) {
        message = 'error: ' + err.message + '\n';
        return res.send(message)
      }

      bcAccessToken = response.accessToken;
      console.log('bc token ' + bcAccessToken);

      res.send('bc access token updated');
    }
  );
});

app.get('/getaccount', (req, res) => {
  console.log('in get account');

  var body = '';
  request({
    url: dynCrmApiUrl + '/accounts?$top=1',
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
        accountLink = dynCrmInstance + `main.aspx?etn=${etn}&pagetype=${pagetype}&id=%7B${id}%7D`;
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
  var webhookEndpoint = dynCrmApiUrl + '/serviceendpoints';
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
    url: dynCrmApiUrl + webhookEndpoint,
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
  var sdkmessageprocessingsteps = dynCrmApiUrl + '/sdkmessages?$filter=name eq "create"&$select=sdkmessageid';
  var stepEndpoint = dynCrmApiUrl + '/sdkmessageprocessingsteps';

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

app.get('/companies', (req, res) => {

  var body = '';
  request({
    url: dynBusinessCentralCommonEndpoint + '/companies',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + bcAccessToken
    },
    json: JSON.stringify(body)
  }, (err, response, body) => {
    res.send(response || err);

    if (response) {

    }
    else {
      console.log('response is null');
    }
  });
});

