# NodeBB VKontakte SSO

NodeBB Plugin that allows users to login/register via their Vkontakte account.

## Installation

    npm install nodebb-plugin-sso-vk
    
## Configuration
 
1. Create a **VKontakte OAuth Client** via the [API Console](http://vk.com/dev)
2. Locate your Client ID and Password
3. The appropriate "Callback URL" is your NodeBB's URL with `/auth/vkontakte/callback` appended to it.
