/*
*
*             A R U B A   C E N T R A L
*
*   I N V E N T O R Y   D A T A F E T C H   S C R I P T
*
*  Author: Tim Struthoff (tim.struthoff@hpe.com)
*
* This script authorizes itself against the Aruba Central REST API
* and then gathers information about the Access Points that are
* currently deployed in the Network Environment
*
* For authorization against the Aruba Central REST API, there is a guide available here:
* https://developer.arubanetworks.com/aruba-central/docs/api-oauth-access-token
*
* You can get information about your Aruba Central REST API by opening the Swagger
* documentation in Aruba Central
*
* Load authorization information from the .env file in the root of the project.
* You can also remove this line if you set the following environment variables
* before running the script:
* ARUBA_CENTRAL_API_ROOT_PATH = The root path of your API. It must end with a trailing forward slash (/). E.g. https://internal-apigw.central.arubanetworks.com/
* ARUBA_CENTRAL_CLIENT_ID = The client id of the app that you are using to connect to the API.
* ARUBA_CENTRAL_CLIENT_SECRET = The client secret of the app.
* ARUBA_CENTRAL_TOKEN_STRING = A JSON Token string obtained from the user interface.
*
* How to obtain the Client ID, Client Secret and the Token Object
* 1. Open the Aruba Central Account Homepage.
* 2. Navigate to API Gateway.
* 3. Click on the 'My Apps & Tokens' Tab.
* 4. Create a new App by clicking on '+ Add Apps & Tokens'.
* 5. In the Application field select 'Network Operations'.
* 6. You should now be able to copy the CLIENT ID and CLIENT SECRET from the table below the button you clicked.
* 7. The table below (Token List) contains all token. It should contain one entry.
*    Click on download. A new window should open. Copy the contents of this window into
*    a file named 'token.json' in the same folder as your script.
* */

require('dotenv').config();

const axios = require('axios');
const TokenStore = require('./TokenStore');

const tokenStore = new TokenStore('./token.json');

// Start the authorization process by obtaining the CSRF Token
// https://developer.arubanetworks.com/aruba-central/docs/api-oauth-access-token#section-1-login-and-obtain-csrf-token

console.log('Authorization: Obtaining a fresh token');
axios.post(process.env.ARUBA_CENTRAL_API_ROOT_PATH + 'oauth2/token',null,
    {
        params: {
            client_id: process.env.ARUBA_CENTRAL_CLIENT_ID,
            grant_type: 'refresh_token',
            client_secret: process.env.ARUBA_CENTRAL_CLIENT_SECRET,
            refresh_token: tokenStore.readTokenObject().refresh_token
        }
    })
    .then(response => {

        let tokenObject = response.data;

        // Check if all necessary parameters are present in the new token.

        if (typeof tokenObject.access_token != 'string') {
            throw new Error('The new token object does not include an access token string.')
        }

        if (typeof tokenObject.refresh_token != 'string') {
            throw new Error('The new token object does not include a refresh token string.')
        }

        if (typeof tokenObject.expires_in != 'number') {
            throw new Error('The new token object does not include an expiry interval.')
        }

        console.log(`Authorization: Successfully obtained a fresh token object. The access token ${response.data.access_token.substring(0, 5)} expires in ${response.data.expires_in} seconds.`);
        tokenStore.writeTokenObject(response.data)
    })
    .then(() => {
        // Fetch data about the access points in the network environment
        console.log('Fetching access point data.')
        return axios.get(process.env.ARUBA_CENTRAL_API_ROOT_PATH + 'monitoring/v2/aps',
        {
            headers: {
                Authorization: `Bearer ${tokenStore.readTokenObject().access_token}`
            }
        })
    })
    .then(response => {

        // Log the access point data to the console.
        let accessPointData = response.data.aps;

        console.log('\nAccess Point Data: ');
        for (accessPoint of accessPointData) {
            console.log(`Access Point ${accessPoint.name} with public IP-Address ${accessPoint.public_ip_address} is on site ${accessPoint.site}`)
        }
        console.log('');
    })
    .catch(error => {
        console.log(error);
    })