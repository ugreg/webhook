# Webhook
Example Webhook creattion using REST and JavaScript. Powerful API that let's you interact with instances made in the classic admin Dynamics 365 portal. As well as instances made in the new admin center https://admin.powerplatform.microsoft.com/environments that leverage classic Dynamics 365 Solutions, Model and Canvas Driven apps. Tested with v8.2 and v9 instances.

Get the Client/Application ID and Client Secret can from following this auth0 guide after creating a Web app / API in your App registrations through Azure Active Directory https://auth0.com/docs/connections/enterprise/azure-active-directory/v2. *Make sure to add a permission to Dynamics CRM Online (allows you to use the Dynamics CRM Online REST API) and Dynamics 365 (allows you to use the Dynamics Business Central REST API)) under API ACCESS > Required Permissions during the required permissions step*.

Your redirect URI must be one of the Reply URLs listen in Azure for the Web app / API.

> NOTE
>
> After the required permission step, you won't need to complete the rest of the auth0 guide. Add the Dynamics CRM Online permission and move onto the code.

# Run
```js
$ node main.js
```
 Then visit `http://localhost:1337/auth` in a private window to log in with your Dynamics 365 credentials.

# References

- Handle auth using ADAL for NodeJS https://github.com/AzureAD/azure-activedirectory-library-for-nodejs
- Detailed blog on using Business Central API [blog linkcoming soon](http://example.net/).
- Mock an API with https://beeceptor.com/

