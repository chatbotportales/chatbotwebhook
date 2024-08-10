const express = require('express')
const app = express()
const { WebhookClient } = require('dialogflow-fulfillment');

app.get('/', function(req, res) {
    res.send('Hello World')
})

app.post('/webhook', express.json(), function(req, res) {
    const agent = new WebhookClient({ request: req, response: res });
    console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(req.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        const messages = [
            `Ups, no he entendido a que te refieres.`,
            `¿Podrías repetirlo, por favor?`,
            `¿Disculpa?`,
            `¿Decías?`,
            `¿Cómo?`,
            `¿No entiendo? Escribe 'Hola' para interactuar`
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        agent.add(randomMessage);
    }

    function ProbandoWebhook(agent) {
        agent.add(`Estoy enviando esta respuesta desde el webhook`);
    }

    function PortalesInteractivos(agent) {
        const frase = agent.request_.queryResult.queryResult.parameters.pregunta;
        agent.add(`Estoy enviando esta respuesta desde el webhook` + frase);
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('ProbandoWebhook', ProbandoWebhook);
    intentMap.set('PortalesInteractivos', PortalesInteractivos);
    agent.handleRequest(intentMap);
})
app.listen(3000, () => {
    console.log("Estamos probando el puerto " + 3000);
})