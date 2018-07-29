var AuthenticationContext = require('adal-node').AuthenticationContext;
var http = require('http');
var request = require('request');

var math = require('./math').sum;

var MyApi = MyApi || {};

var clientId = '';
var clientSecret = '';
var authorityHostUrl = 'https://login.windows.net';
var azureAdTenant = 'grdegr.onmicrosoft.com'; 
var orgUrl = 'https://mssmartsheet.api.crm.dynamics.com';
// var authUrl = authorityHostUrl + '/' + azureAdTenant + '/oauth2/authorize?resource=' + orgUrl;
// var accessTokenkUrl = authorityHostUrl + '/' + azureAdTenant + '/oauth2/token?resource=' + orgUrl;
var callBackUrl = 'http://localhost:1337/getAccessToken';

var proxy = 'http://msssheet.proxy.beeceptor.com';

var context = new AuthenticationContext(authorityHostUrl + '/' + azureAdTenant);
resource = orgUrl;
var accessToken = '';

var acquireTokenWithClientCredentialsHelper = function(resource, clientId, clientSecret) {

  return new Promise(function (resolve, reject) {
    context.acquireTokenWithClientCredentials(resource, clientId, clientSecret, function(error, tokenResponse) {
      if (error) {
        console.log('well that didn\'t work: ' + error.stack);
        reject();
      } else {    
        accessToken = tokenResponse.accessToken;
        console.log(tokenResponse);

        var options = { 
          method: 'GET',
          url: 'https://mssmartsheet.api.crm.dynamics.com/api/data/v9.0/accounts',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken       
          },
          json: true 
        };

        request(options, function (error, response, body) {
          if (error) { throw new Error(error); }

          console.log(body);
        });

        resolve();
      }
    });  
  }); 
}

acquireTokenWithClientCredentialsHelper(resource, clientId, clientSecret);

var webhookEndpoint = orgUrl + '/api/data/v9.0/serviceendpoints';
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
// MyApi.registerWebhook = function () {

//   return new Promise(function (resolve, reject) {
//     MyApi.request('POST', stsTokenRequestUri, 'application/x-www-form-urlencoded', tokenRequestHeaders, tokenRequestParams)
//     .then(function (response) {
//       try {
//         MyApi.configuration.stsToken = response.access_token.toString();
//         resolve();
//       } catch (erroror) { reject(new erroror('Failed Promise MyApi.getSpurGoToken' + erroror.message)); }
//     })
//     .catch(function(erroror) { reject(new erroror('Failed Promise MyApi.getSpurGoToken' + erroror.message)); });
//   });  
// }

// MyApi.request('POST', webhookEndpoint, 'Application-json', null, payload);

// var options = {
//   host: 'developer.api.autodesk.com',
//   path: '/oss/v1/buckets',
//   method: 'POST',
//   headers: {
//       'Content-Type': 'application/json'
//       'Authorization': 'Bearer token'
//   }
// };
//       https://mssmartsheet.api.crm.dynamics.com/api/data/v9.0/accounts
// var reqBody = JSON.stringify(payload);
// req.write();


