
# Requirements
I want to implement a cute site about candies shop named "Vikis sweets shop" with the following requirements
- The site is the (relaying party) RP and it is implementing Gigya (SAP CDC)
- The site is implementing an OIDC flow to take the identities from another SAP-CDC site on the same data center (us1).
- In the end of the OIDC flow, the site should hold the access_token and refresh_token in a parameter.
- There should be a login page using the SAP-CDC screen set.
- There should be a candies catalog with:
  - 2 regular candies (pictures with price)
  - 2 special candies (pictures with price) available only to members of the group "Sweet shop" under the "Club members" model.
- A button of "Send candy to a friend", this button should be available only to a user which is a member of group "SAP CDC" under the organizations model, and when clicking on it opens a button to write the friend name, address and a few words to the receiver. there should be also 2 buttons - send and cancel
- A button to show profile information, by calling getUserInfo  using the access token received from OIDC flow
- After login there will be no 'login button' or 'login text' - just the content of candies.
- Use Gigya SDK

# Secrets management
RP_SITE_API_KEY, OP_SITE_API_KEY, USER_KEY, USER_SECRET will be fetched from .env file

# Techstack
Nodejs
local run