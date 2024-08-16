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
            const respuesta = await getDataPortal(portales);
            agent.add(respuesta);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function CursosPorPortal() {
        try {
            const portales = 'Portal Perdomo'//agent.parameters.portales;
            const idPortal = await getDataIDPortal(portales)
            let respuesta = "No se encontro el "+portales+ " en la base de datos."
            if (idPortal) {
                respuesta = await getCoursesNameByPortal(idPortal);
                respuesta = await formatCourseNameList(respuesta);
            }
            console.log(respuesta)
            agent.add(respuesta);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    let intentMap = new Map();
    intentMap.set('ProbandoWebhook', ProbandoWebhook);
    intentMap.set('PortalesInteractivos', PortalesInteractivos);
    intentMap.set('CursosPorPortal', CursosPorPortal);
    agent.handleRequest(intentMap);
})


async function getDataPortal(portalName) {
    try {
        const snapshot = await db.collection('portales').get();
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
        });

        const filteredData = docs.filter(obj => obj.name === portalName);
        //const filteredJsonString = JSON.stringify(filteredData, null, 2);
        return filteredData.map(formatData).join("\n\n");

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');  
    }
}


async function getDataIDPortal(portalName) {
    try {
        const snapshot = await db.collection('portales').get();
        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
            };
        });

        const filteredData = docs.filter(obj => obj.name === portalName);

        // Verifica si se encontraron datos y retorna el id del primer portal encontrado
        if (filteredData.length === 0) {
            console.log('No matching portal found.');
            return null; // No se encontró ningún portal
        }

        return filteredData[0].id; // Retorna el id del primer portal encontrado

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
}


async function getCoursesByPortal(idPortal) {
    try {
        const coursesRef = db.collection('courses');
        const query = coursesRef.where('idPortal', '==', idPortal);
        const snapshot = await query.get();

        if (snapshot.empty) {
            console.log('No courses found with the given idportal')
            //res.status(404).send('No courses found with the given idportal');
            return [];
        }

        const courses = [];
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });

        //res.status(200).json(courses);
        //console.log(courses)
        return courses
    } catch (error) {
        console.error('Error getting documents', error);
        //res.status(500).send('Error retrieving courses');
    }
}

async function getCoursesNameByPortal(idPortal) {
    try {
        const coursesRef = db.collection('courses');
        const query = coursesRef.where('idPortal', '==', idPortal).where('status', '==', 'activo').select('name');
        const snapshot = await query.get();

        if (snapshot.empty) {
            //res.status(404).send('No se encontraron cursos con el idportal dado');
            return [];
        }

        const courses = [];
        snapshot.forEach(doc => {
            courses.push({ name: doc.data().name });
        });

        return courses

    } catch (error) {
        console.error('Error al obtener los documentos', error);
    }

}
// Función para formatear un objeto en una cadena legible
function formatData(obj) {
    return `
  Esta es la información del ${obj.name}
  Dirección: ${obj.address}
  Email: ${obj.email}
  Teléfono: ${obj.phone}
  Mapa: ${obj.linkMap}
  URL: ${obj.url}
  Horario Lunes a Viernes: ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)}
  Horario Sábados: ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}
    `.trim(); // `trim()` elimina los espacios en blanco al principio y al final
}

function formatCourseNameList(courses) {
    if (courses.length === 0) {
        return 'No se encontraron cursos.';
    }

    // Construimos el listado de nombres
    const courseNames = courses.map(course => `- ${course.name}`).join('\n');
    
    return `
    Lista de cursos encontrados:

    ${courseNames}
    `.trim(); // `trim()` elimina los espacios en blanco al principio y al final
}

function extractSubstring(dateTimeString) {
    return dateTimeString.substring(11, 16);
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
    //const text = await getPortalesAsText('portales');
    //CursosPorPortal()//('Portal Perdomo');
    //console.log(textq)
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});