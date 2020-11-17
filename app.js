const express = require('express');
const bodyParser = require('body-parser');
const AssistantV2 = require('ibm-watson/assistant/v2');
const {IamAuthenticator} = require('ibm-watson/auth');
const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();
const chatData = require("./chatData");
const Config = require("./config.json");

const Local = require('./model/local');

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');


const NodeGeocoder = require('node-geocoder');
const geocoder = NodeGeocoder({
    provider: 'openstreetmap',
    language: 'pt-BR',
});

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

app = express();
app.use(express.static('./public'));
app.use(bodyParser.json());

let assistant = new AssistantV2({
    authenticator: new IamAuthenticator({
        apikey: Config.credentials.watsonAssistant.iam_apikey,
    }),
    version: Config.credentials.watsonAssistant.version,
    url: Config.credentials.watsonAssistant.url
});

let userAddress, geoCoderResult, facility, userGeoLocation, assistantMessageResponse;


async function mountMessage({output, context}, session_id) {
    let response = {body: {"response_type": "text", messages: [], session_id: {conversation_id: session_id}}};

    let newContext = 0;

    let {generic} = output;
    let contextVariables = context.skills["main skill"].user_defined;
    // console.log('------------------------');
    // console.log(contextVariables);
    if (contextVariables) {
        if (contextVariables.db) {
            userAddress = contextVariables.endereco;
            let userInputLocal = contextVariables.local;
            geoCoderResult = await geocoder.geocode(userAddress)
                .catch((e) => {
                    console.log(e)
                });
            // console.log(geoCoderResult);
            if (geoCoderResult.length > 0) {
                for (let result of geoCoderResult) {
                    if (result.city !== 'Fortaleza') {
                        newContext = 1;
                        // console.log("entrou 1");
                        assistantMessageResponse = 'Não consegui entender o endereço digitado. Por favor veja se não errou nada ou se a rua existe e digite novamente!';
                        // return await sendMessage(' . ', idSessao, newContext);
                    } else {
                        userGeoLocation = result;
                        facility = await Local.aggregate([
                            {
                                $geoNear: {
                                    near: {
                                        coordinates: [result.longitude, result.latitude],
                                        type: "Point"
                                    },
                                    distanceField: "distancia.calculada",
                                    spherical: true,
                                    num: 124
                                }
                            },
                            {$match: {tipo: userInputLocal}}
                        ]).exec().catch(err => {
                            console.log(err);
                            newContext = 1;
                            // console.log("entrou 2");
                            assistantMessageResponse = 'Não consegui entender o endereço digitado. Por favor veja se não errou nada ou se a rua existe e digite novamente!';
                            // return await sendMessage(' . ', idSessao, newContext);
                        });
                        if (facility[0]) {
                            response.body.messages.push(`Você deve se dirigir a <strong>${facility[0].nome}</strong><br>Endereço: <strong>${facility[0].endereco}</strong><br>Telefone para contato: <strong>${facility[0].telefone}</strong>`,`Precisa de ajuda para chegar lá?`,`• Sim Ø • Não Ø`);
                            assistantMessageResponse = '';
                            newContext = 0;
                            break;
                        } else {
                            // console.log("n tem local");
                            newContext = 1;
                            assistantMessageResponse = 'Não consegui entender o endereço digitado. Por favor veja se não errou nada ou se a rua existe e digite novamente!';
                            // return await sendMessage(' . ', idSessao, newContext);
                        }
                    }
                }
                response.body.messages.push(assistantMessageResponse);
                // if (facility) response.body.messages.push(assistantMessageResponse);
            } else {
                // console.log("aoisdqo");
                newContext = 1;
                assistantMessageResponse = 'Não consegui entender o endereço digitado. Por favor veja se não errou nada ou se a rua existe e digite novamente!';
                response.body.messages.push(assistantMessageResponse);
            }
        }
        if (contextVariables.mapa) {
            response.body.messages.push(`Clique <a href=https://www.google.com/maps/dir/?api=1&origin=${userGeoLocation.latitude},${userGeoLocation.longitude}&destination=${facility[0].location.coordinates[1]},${facility[0].location.coordinates[0]}&travelmode=driving target="_blank">aqui</a> para abrir o mapa.`);
        }
    }
    if (newContext === 0) {
        for (let message of generic)
            if (message.response_type === 'text')
                response.body.messages.push(message.text);

    }
    return response;
}


async function createSession() {
    let response = await assistant.createSession({
        assistantId: Config.credentials.watsonAssistant.assistantId
    }).catch(err => console.log(err));

    return await mountMessage(await sendMessage('', response.result.session_id), response.result.session_id);
}

async function sendMessage(message, sessionId) {
    let messageResponse = await assistant.message({
        assistantId: Config.credentials.watsonAssistant.assistantId,
        sessionId,
        input: {
            'message_type': 'text',
            'text': message,
            'options': {
                'return_context': true
            }
        },
        context: {
            'global': {
                'system': {
                    'timezone': 'America/Sao_Paulo'
                }
            }
        }
    }).catch(err => console.log(err));

    return messageResponse.result;
}

app.post('/conversation/', async (req, res) => {
    let {text, context} = req.body;

    if (!context) return res.json(await createSession());
    let session_id = context.conversation_id;

    if (!session_id) return res.json(await createSession());

    res.json(await mountMessage(await sendMessage(text, session_id), session_id));

    // let params = {
    //     input: { text },
    //     workspace_id: `${Config.credentials.watsonAssistant.workspace_id}`,
    //     context,
    //     alternate_intents: true
    // };
    //
    // mes.user = text;
    //
    // assistant.message(params, async (err, response) => {
    //     //console.log(response);
    //     mes.intents = response.intents;
    //     mes.entities = response.entities;
    //     mes.sessionID = response.context.conversation_id;
    //     console.log(re)
    // });
});

let isHttps = process.env.HTTPS === 'true';

if (isHttps)
    https.createServer({
        key: fs.readFileSync(process.env.KEY),
        cert: fs.readFileSync(process.env.CERT),
        passphrase: process.env.PASSPHRASE
    }, app).listen(process.env.PORT, function () {
        console.log(`Servidor de produção iniciando na porta ${process.env.PORT} [HTTPS]`);
    });

else app.listen(process.env.PORT, function () {
    console.log(`Servidor de produção iniciando na porta ${process.env.PORT} [SEM HTTPS]`);
});
