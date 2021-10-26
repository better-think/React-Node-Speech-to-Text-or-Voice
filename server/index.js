require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const socket = require('./socket');

const speechKey = process.env.SPEECH_KEY;
const speechRegion = process.env.SPEECH_REGION;
const {SOCKET_PORT} = process.env;

console.log("SOCKET_PORT: ", SOCKET_PORT)

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);

app.get('/api/get-speech-token', async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const speechKey = process.env.SPEECH_KEY;
    const speechRegion = process.env.SPEECH_REGION;

    if (speechKey === 'paste-your-speech-key-here' || speechRegion === 'paste-your-speech-region-here') {
        res.status(400).send('You forgot to add your speech key or region to the .env file.');
    } else {
        const headers = { 
            headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        try {
            const tokenResponse = await axios.post(`https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, headers);
            res.send({ token: tokenResponse.data, region: speechRegion });
        } catch (err) {
            res.status(401).send('There was an error authorizing your speech key.');
        }
    }
});

app.get('/api/get-voices', async (req, res, next) => {
    var config = {
        method: 'get',
        url: `https://${speechRegion}.customvoice.api.speech.microsoft.com/api/texttospeech/v3.0/longaudiosynthesis/voices`,
        headers: { 
          'Ocp-Apim-Subscription-Key': speechKey
        }
    };
      
    axios(config)
        .then(function (response) {
            res.json({
                ...response.data
            })
        })
        .catch(function (err) {
            console.log(err);
            res.status(303).send({err})
        });
});

app.listen(3001, () =>
    console.log('Express server is running on localhost:3001')
);
// socket server
const socketServer = app.listen(SOCKET_PORT, () => {
    console.log(`Sockert Server is running on port ${SOCKET_PORT}.`);
});
const io = require('socket.io')(socketServer, {
    cors: {
        origin: '*'
    },
    credentials: false
});

socket(app, io)
