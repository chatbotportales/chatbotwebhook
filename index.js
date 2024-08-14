const express = require('express')
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Ruta al archivo de configuración
const app = express()
const { WebhookClient } = require('dialogflow-fulfillment');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chatbotportalesinteracti-52820-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

app.get('/', function(req, res) {
    res.send('Hello World')
})

app.post('/webhook', express.json(), function(req, res) {
    const agent = new WebhookClient({ request: req, response: res });
    console.log('Dialogflow Request headers: ' + JSON.stringify(req.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(req.body));

    async function ProbandoWebhook(agent) {
        try {
            const text = await getPortalesAsText('portales');
            const frase = agent.parameters.portales;
            agent.add(`Estoy enviando esta respuesta desde el ProbandoWebhook ` + frase + " === " + text);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function PortalesInteractivos(agent) {
        try {
            //const snapshot = await db.collection('portales').get();
            //const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            //res.json(docs);

            const portales = agent.parameters.portales;
            const text = await getDataPortal(portales);
            agent.add(`Estoy enviando esta respuesta desde el PortalesInteractivos ` + portales + " === " + text);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    let intentMap = new Map();
    intentMap.set('ProbandoWebhook', ProbandoWebhook);
    intentMap.set('PortalesInteractivos', PortalesInteractivos);
    agent.handleRequest(intentMap);
})

async function getDataPortal(portalName) {
    try {
        const snapshot = await db.collection("portales").get();
        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                email: data.email,
                address: data.address,
                linkMap: data.linkMap,
                phone: data.phone,
                url: data.url,
                mondayEndTime: data.mondayEndTime,
                mondayStartTime: data.mondayStartTime,
                saturdayEndTime: data.saturdayEndTime,
                saturdayStartTime: data.saturdayStartTime,
                image: data.image
            };
        }).filter(data.name === portalName);

        // Convertir los datos a texto
        const portal = JSON.stringify(docs, null, 12); // Formateo con sangrías
        const infoPortal = JSON.parse(portal);

        const startWeek = new Date(infoPortal.mondayStartTime).toISOString().slice(11, 16);
        const endWeek = new Date(infoPortal.mondayEndTime).toISOString().slice(11, 16);
        const startWeekend = new Date(infoPortal.saturdayStartTime).toISOString().slice(11, 16);
        const endWeekend = new Date(infoPortal.saturdayEndTime).toISOString().slice(11, 16);

        const textOutput = "Esta es la información del Portal " + infoPortal.name + "\n " +
            "Dirección: " + infoPortal.address + "\n " +
            "Teléfono" + infoPortal.phone + "\n " +
            "email" + infoPortal.email + "\n " +
            "Horario Lunes a Viernes: " + startWeek + " a " + endWeek + "\n " +
            "Horario Sábados: " + startWeekend + " a " + endWeekend + "\n " +
            "ubicación :" + infoPortal.linkMap + "\n ";

        return textOutput;

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');  
    }
}

async function getPortalesAsText(collectionName) {
    try {
        const snapshot = await db.collection(collectionName).get();
        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name // Asegúrate de que el campo 'name' existe en tus documentos
            };
        });

        // Convertir los datos a texto
        const textOutput = JSON.stringify(docs, null, 2); // Formateo con sangrías

        return textOutput;
    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');  
    }
}

const PORT = process.env.PORT || 3000; // Utiliza el puerto proporcionado por Heroku o 3000 para desarrollo local

app.listen(PORT, async() => {
    const text = await getPortalesAsText('portales');
    console.log(text)
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});