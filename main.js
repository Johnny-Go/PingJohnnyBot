// Setup our environment variables via dotenv
require('dotenv').config();

// Import relevant classes
const { Client, Intents } = require('discord.js');
const axios = require('axios').default;

// Instantiate a new client with some necessary parameters.
const client = new Client(
    {
        intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
        partials: ['CHANNEL']
    }
);

// Notify progress
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
})

const getJohnny = async (guildId) => {
    const guild = client.guilds.cache.get(guildId); //get server by id
    const members = await guild.members.fetch(); //get all members of sever
    const johnny = members.find(({user}) => user.username === 'JohnnyGo' && user.discriminator === '7790');
    return johnny;
}

let goneLive = false;
setInterval(async () => {
    //get oathtoken
    axios.post('https://id.twitch.tv/oauth2/token', {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
    })
    //if successful check if jaek is live and try to ping johnny
    .then((response) => {
        let authorizationObject = response.data;
        let { access_token, expires_in, token_type } = authorizationObject;
        //token_type first letter must be uppercase
        token_type = token_type.substring(0, 1).toUpperCase() + token_type.substring(1, token_type.length);
        let authorization = `${token_type} ${access_token}`;
        
        //check if jaek is live
        axios.get('https://api.twitch.tv/helix/streams?user_login=JaekRock', {
            headers: {
                'Authorization': authorization,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        })
        //api call was successful
        .then(async function (response) {
            var streams = response.data.data;

            //if jaek is live and we haven't pinged johnny, ping johnny
            if(!goneLive) {
                streams.forEach(async element => {
                    goneLive = true;

                    //get all the server ids
                    const guildIds = client.guilds.cache.map(guild => guild.id);

                    //find johnny in server and ping him if he exists 
                    let johnny = null;
                    for(let i = 0; i < guildIds.length; i++) {
                        johnny = await getJohnny(guildIds[i]);
                        if(johnny) {
                            const guild = client.guilds.cache.get(guildIds[i]);
                            console.log(`Pinging Johnny in ${guild.name}`);
                            const channel = guild.channels.cache.find(ch => ch.name === 'announcements');
                            channel.send(`Hey ${johnny} Jaek is live at https://www.twitch.tv/${element.user_name}`)
                                .catch(e => console.log(e));
                        }
                    }
                });
            } else if (response.data.data.length == 0) {
                //set goneLive to false if jaek is offline
                if(goneLive) {
                    console.log(`Jake has gone offline`);
                    goneLive = false;
                }
            }
        })
        //log any errors
        .catch(function (error) {
            console.log(error);
        })
    })
    //log any errors
    .catch(function (error) {
        console.log(error);
    });
}, 1 * 60 * 1000);

// Authenticate
client.login(process.env.DISCORD_TOKEN);