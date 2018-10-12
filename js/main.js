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
var dynBusinessCentralCommonEndpoint = 'https://api.businesscentral.dynamics.com/v1.0/' + azureAdTenant + '/api/beta';

var dynCrmApiUrl = dynCrmInstance + '/api/data/v9.0/';

var crmRedirectUri = 'http://localhost:1337/getcrmtoken';
var bcRedirectUri = 'http://localhost:1337/getbctoken';

var dynCrmAuthUrl = authorityHostUrl + '/' +
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
    res.cookie('crmauthstate', crmToken);
    var authorizationUrl = dynCrmAuthUrl.replace('<state>', crmToken);

    console.log('redirecting to auth url: ' + authorizationUrl);
    res.redirect(authorizationUrl);
  });
});

app.get('/bcauth', function(req, res) {
  crypto.randomBytes(48, function(ex, buf) {
    var bcToken = buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-');
    res.cookie('bcauthstate', bcToken);
    var dynBusinessCentralAuthUrlauthorizationUrl = dynBusinessCentralAuthUrl.replace('<state>', bcToken);

    console.log('redirecting to auth url: ' + dynBusinessCentralAuthUrlauthorizationUrl);
    res.redirect(dynBusinessCentralAuthUrlauthorizationUrl);
  });
});

// After consent is granted AAD redirects here.  The ADAL library and retrieves an access token that is used to make calls to Dynamics 365.
var accessToken = '';
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
      console.log('crm token\n' + accessToken);

      res.send('crm access token updated');
    }
  );
});

var bcAccessToken = '';
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
      console.log('bc token\n' + bcAccessToken);

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

    if (response && response.body.value) {
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

app.get('/bccustomers', (req, res) => {

  /**
   https://api.businesscentral.dynamics.com/v1.0/grdegr.onmicrosoft.com/api/beta/companies(988d626b-8f94-4131-a2be-ae62950fe5dc)/customers

   {
    "@odata.context": "https://api.businesscentral.dynamics.com/v1.0/grdegr.onmicrosoft.com/api/beta/$metadata#companies(988d626b-8f94-4131-a2be-ae62950fe5dc)/customers",
    "value": [
        {
            "@odata.etag": "W/\"JzQ0OzZEL1krdEE0clBCY3h0NjBDWDRZdVRITDU0RGdLZkVFUjBGTkFLOWN1eEE9MTswMDsn\"",
            "id": "34cf128e-b4cb-4c14-8b90-0dc256e45b74",
            "number": "40000",
            "displayName": "Alpine Ski House",
            "type": "Company",
            "phoneNumber": "",
            "email": "ian.deberry@contoso.com",
            "website": "",
            "taxLiable": true,
            "taxAreaId": "713f64ba-72f4-41e8-81d8-f00429e29fff",
            "taxAreaDisplayName": "Atlanta, GA - North",
            "taxRegistrationNumber": "",
            "currencyId": "00000000-0000-0000-0000-000000000000",
            "currencyCode": "USD",
            "paymentTermsId": "bec85441-2cc1-4c1b-90ad-6df74cd0a18a",
            "shipmentMethodId": "00000000-0000-0000-0000-000000000000",
            "paymentMethodId": "e86c6609-316e-49ca-ad47-871d5e0fe5ab",
            "blocked": " ",
            "balance": 4316.92,
            "overdueAmount": 4316.92,
            "totalSalesExcludingTax": 71453,
            "lastModifiedDateTime": "2018-03-21T13:28:36.707Z",
            "address": {
                "street": "10 Deerfield Road",
                "city": "Atlanta",
                "state": "GA",
                "countryLetterCode": "US",
                "postalCode": "31772"
            }
        }
      ]
    }

    CRM ACCOUNT
    {
  "@odata.context": "https:\/\/game.api.crm.dynamics.com\/api\/data\/v9.0\/$metadata#accounts",
  "value": [
    {
      "@odata.etag": "W\/\"3001136\"",
      "openrevenue_date": "2018-10-11T22:58:48Z",
      "territorycode": 1,
      "statecode": 0,
      "address2_shippingmethodcode": 1,
      "accountid": "3dd65528-0d4e-e811-a961-000d3a10877d",
      "address1_addressid": "6917c6e9-3fd6-4cee-92ec-7afb06942e4d",
      "creditonhold": false,
      "donotbulkemail": false,
      "donotsendmm": false,
      "createdon": "2018-05-02T13:31:46Z",
      "openrevenue": 0,
      "opendeals_state": 1,
      "businesstypecode": 1,
      "preferredcontactmethodcode": 1,
      "donotpostalmail": false,
      "_ownerid_value": "ea02a959-0895-469f-ac88-bacbe0b96d11",
      "donotbulkpostalmail": false,
      "name": "Paper Company (debug account)",
      "donotemail": false,
      "address2_addresstypecode": 1,
      "opendeals_date": "2018-10-11T22:58:48Z",
      "donotphone": false,
      "_transactioncurrencyid_value": "14ee0241-57a4-e711-a968-000d3a192311",
      "exchangerate": 1,
      "openrevenue_state": 1,
      "_modifiedby_value": "ea02a959-0895-469f-ac88-bacbe0b96d11",
      "statuscode": 1,
      "shippingmethodcode": 1,
      "followemail": true,
      "modifiedon": "2018-05-02T13:31:46Z",
      "_owningbusinessunit_value": "5f41590d-51a4-e711-a968-000d3a192311",
      "openrevenue_base": 0,
      "versionnumber": 3001136,
      "opendeals": 0,
      "donotfax": false,
      "merged": false,
      "_createdby_value": "ea02a959-0895-469f-ac88-bacbe0b96d11",
      "marketingonly": false,
      "accountratingcode": 1,
      "address2_addressid": "e6b68b85-f0d6-4cc2-91d5-f5d7e3141123",
      "customersizecode": 1,
      "_owninguser_value": "ea02a959-0895-469f-ac88-bacbe0b96d11",
      "participatesinworkflow": false,
      "accountclassificationcode": 1,
      "address2_freighttermscode": 1,
      "address2_line1": null,
      "address1_telephone1": null,
      "address1_postofficebox": null,
      "marketcap": null,
      "emailaddress3": null,
      "address2_county": null,
      "address2_upszone": null,
      "numberofemployees": null,
      "address1_line2": null,
      "timespentbymeonemailandmeetings": null,
      "yominame": null,
      "address2_longitude": null,
      "ownershipcode": null,
      "timezoneruleversionnumber": null,
      "primarysatoriid": null,
      "_masterid_value": null,
      "address1_telephone2": null,
      "address2_fax": null,
      "_slaid_value": null,
      "aging60_base": null,
      "telephone1": null,
      "accountcategorycode": null,
      "entityimage": null,
      "revenue": null,
      "_preferredequipmentid_value": null,
      "emailaddress1": null,
      "address1_latitude": null,
      "tickersymbol": null,
      "address2_telephone1": null,
      "address2_name": null,
      "accountnumber": null,
      "address1_stateorprovince": null,
      "address1_line3": null,
      "industrycode": null,
      "address1_line1": null,
      "importsequencenumber": null,
      "paymenttermscode": null,
      "fax": null,
      "address2_line3": null,
      "address2_utcoffset": null,
      "_modifiedonbehalfby_value": null,
      "utcconversiontimezonecode": null,
      "ftpsiteurl": null,
      "stockexchange": null,
      "address2_telephone3": null,
      "_owningteam_value": null,
      "aging60": null,
      "_defaultpricelevelid_value": null,
      "address1_postalcode": null,
      "address1_telephone3": null,
      "aging30": null,
      "entityimage_url": null,
      "sharesoutstanding": null,
      "address2_latitude": null,
      "stageid": null,
      "preferredappointmenttimecode": null,
      "address2_composite": null,
      "aging90_base": null,
      "address1_fax": null,
      "_originatingleadid_value": null,
      "address1_city": null,
      "description": null,
      "address2_stateorprovince": null,
      "overriddencreatedon": null,
      "address1_country": null,
      "_slainvokedid_value": null,
      "address1_primarycontactname": null,
      "onholdtime": null,
      "_createdbyexternalparty_value": null,
      "creditlimit_base": null,
      "traversedpath": null,
      "processid": null,
      "_createdonbehalfby_value": null,
      "_modifiedbyexternalparty_value": null,
      "aging90": null,
      "address2_postalcode": null,
      "address1_shippingmethodcode": null,
      "entityimage_timestamp": null,
      "address1_name": null,
      "address2_primarycontactname": null,
      "primarytwitterid": null,
      "_preferredserviceid_value": null,
      "customertypecode": null,
      "address2_postofficebox": null,
      "address2_city": null,
      "_primarycontactid_value": null,
      "address1_freighttermscode": null,
      "address1_longitude": null,
      "telephone2": null,
      "address1_addresstypecode": null,
      "lastusedincampaign": null,
      "_preferredsystemuserid_value": null,
      "telephone3": null,
      "preferredappointmentdaycode": null,
      "websiteurl": null,
      "sic": null,
      "creditlimit": null,
      "lastonholdtime": null,
      "address2_line2": null,
      "entityimageid": null,
      "aging30_base": null,
      "address1_composite": null,
      "_territoryid_value": null,
      "address1_upszone": null,
      "address1_county": null,
      "marketcap_base": null,
      "teamsfollowed": null,
      "address2_country": null,
      "address1_utcoffset": null,
      "emailaddress2": null,
      "_parentaccountid_value": null,
      "revenue_base": null,
      "address2_telephone2": null
    },

   */

  var body = '';
  var options = {
    url: 'https://api.businesscentral.dynamics.com/v1.0/grdegr.onmicrosoft.com/api/beta/companies',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + bcAccessToken
    },
    json: JSON.stringify(body)
  };

  request(options, (err, response, body) => {
    res.send(response || err);

    if (response) {
      console.log(body);
    }
    else {
      console.log('response is null');
    }
  });
});

