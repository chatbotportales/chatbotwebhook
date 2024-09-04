const express = require('express')
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Ruta al archivo de configuración
const app = express()
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const { onNewNonfatalIssuePublished } = require('firebase-functions/v2/alerts/crashlytics');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chatbotportalesinteracti-52820-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

app.post('/webhook', express.json(), function (req, res) {
    const agent = new WebhookClient({ request: req, response: res });

    async function PortalesInteractivos(agent) {
        try {
            const portales = agent.parameters.portales;
            const respuesta = await getDataPortal(portales);
            console.log("respuesta = " + respuesta.length);

            if (respuesta.length != 0) {
                const lineas = respuesta.split('\n');
                for (let i = 0; i < lineas.length; i++) {
                    if (lineas[i] !== "") {
                        agent.add(lineas[i]);
                    }
                }

                agent.add("Puedes consultar:");
                agent.add(new Suggestion('Cursos ' + portales));
                agent.add(new Suggestion('Preguntas Frecuentes ' + portales));
            } else {
                agent.add("No entendí 😢 ¿Podrías escribírmelo de otra forma?");
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function CursosPorPortal() {
        try {
            const portales = agent.parameters.portales;
            const idPortal = await getDataIdPortal(portales)

            if (idPortal) {
                cursos = await getCoursesNameByPortal(idPortal);
                agent.add(`${portales} tiene los siguientes curso habilitados:`);
                for (let i = 0; i < cursos.length; i++) {
                    agent.add(new Suggestion(cursos[i].name + " - " + portales));
                }
            } else {
                agent.add("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
            }


        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function Portales() {
        try {
           
            portales = await getPortals();
            agent.add(`Estos son los Portales Intercativos de Ciudad Bolivar:`);
            
            for (let i = 0; i < portales.length; i++) {
                //console.log(portales[i].name)
                agent.add(new Suggestion(portales[i].name));
            }
    
    
        } catch (error) {
            //console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function PreguntasFrecuentesPortal() {
        try {
            const portales = agent.parameters.portales;
            const idPortal = await getDataIdPortal(portales)

            if (idPortal) {
                FQs = await getQuestionByPortal(idPortal);
                agent.add(`${portales} deseas consultar sobre:`);
                for (let i = 0; i < FQs.length; i++) {
                    agent.add(new Suggestion("Preguntar: " + FQs[i].ask + " - " + portales));
                }

                agent.add(new Suggestion('Cursos ' + portales));
                agent.add(new Suggestion('Preguntas Frecuentes ' + portales));

            } else {
                agent.add("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
            }


        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    
    async function RespuestasPreguntasFrecuentes() {
        try {
            const portal = agent.parameters.portales;
            const ask = agent.parameters.ask;

            const idPortal = await getDataIdPortal(portal)
            let respuesta = "No se encontro el " + portal + " en la base de datos."

            //console.log("portal = " + portal);
            //console.log("ask = " + ask);

            if (ask) {
                if (idPortal) {
                    const answerFQs = await getAnswerByPortal(idPortal, ask);
                    respuesta = await formatAnswerList(answerFQs, portal);
                }
            }
            const listData = respuesta.split("\n");

            for (let i = 0; i < listData.length; i++) {
                if (listData[i] !== "") {
                    //console.log(listData[i])
                    agent.add(listData[i]);
                }
            }
            if( idPortal ){
                agent.add(new Suggestion('Cursos ' + portal));
                agent.add(new Suggestion('Preguntas Frecuentes ' + portal));
            }

        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            //res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }


    let intentMap = new Map();
    intentMap.set('PortalesInteractivos', PortalesInteractivos);
    intentMap.set('CursosPorPortal', CursosPorPortal);
    intentMap.set('ObtenerInformacionCurso', ObtenerInformacionCurso);
    intentMap.set('PreguntasFrecuentesPortal', PreguntasFrecuentesPortal);
    intentMap.set('RespuestasPreguntasFrecuentes', RespuestasPreguntasFrecuentes);
    intentMap.set('Portales', Portales);
    agent.handleRequest(intentMap);
})


async function ObtenerInformacionCurso(agent) {
    try {
        const portal = agent.parameters.portales;
        const namecurso = agent.parameters.curso;

        const idPortal = await getDataIdPortal(portal)
        let respuesta = "No se encontro el " + portal + " en la base de datos."

        console.log("portal = " + portal);
        console.log("namecurso = " + namecurso);

        if (namecurso) {
            if (idPortal) {
                const cursos = await getCoursesByPortal(idPortal, namecurso);
                respuesta = await formatCourseList(cursos, portal);
            }
        }
        const listDataCursos = respuesta.split("\n");

        for (let i = 0; i < listDataCursos.length; i++) {
            if (listDataCursos[i] !== "") {
                agent.add(listDataCursos[i]);
            }
        }

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        res.status(500).json({ error: 'Error al obtener datos de Firestore' });
    }
}

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
                phone: data.phone,
                url: data.url,
                mondayEndTime: data.mondayEndTime,
                mondayStartTime: data.mondayStartTime,
                saturdayEndTime: data.saturdayEndTime,
                saturdayStartTime: data.saturdayStartTime
            };
        });

        /*const mostSimilarDoc = findMostSimilarName(docs, portalName);
        const filteredData = mostSimilarDoc ? [mostSimilarDoc] : [];*/
        const filteredData = docs.filter(obj => obj.name === portalName);
        return filteredData.map(formatData).join("\n");

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
}


async function getDataIdPortal(portalName) {
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

        if (filteredData.length === 0) {
            return null;
        }
        return filteredData[0].id;

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
}

async function getCoursesByPortal(idPortal, referenceName = '', maxDistance = 2) {
    try {
        const coursesRef = db.collection('courses');
        const query = coursesRef.where('idPortal', '==', idPortal);
        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        const courses = [];
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });



        const filteredCourses = courses.filter(course => {
            console.log("course.name = " + course.name);
            console.log("course.name.toLowerCase() = " + course.name.toLowerCase());
            console.log("referenceName = " + referenceName);
            console.log("referenceName.toLowerCase() = " + referenceName.toLowerCase());
            const distance = levenshtein(course.name.toLowerCase(), referenceName.toLowerCase());
            return distance <= maxDistance;
        });

        return filteredCourses;
    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
}

async function getAnswerByPortal(idPortal, referenceName = '', maxDistance = 2) {
    try {

        const fQRef = db.collection('frequentQuestions');
        const query = fQRef.where('idPortal', '==', idPortal);
        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        const FQ = [];
        snapshot.forEach(doc => {
            FQ.push({ id: doc.id, ...doc.data() });
        });

        const filteredFQ = FQ.filter(fquestion => {
            console.log("fquestion.ask = " + fquestion.ask);
            console.log("fquestion.name.toLowerCase() = " + fquestion.ask.toLowerCase());
            console.log("referenceName = " + referenceName);
            console.log("referenceName.toLowerCase() = " + referenceName.toLowerCase());
            const distance = levenshtein(fquestion.ask.toLowerCase(), referenceName.toLowerCase());
            return distance <= maxDistance;
        });

        return filteredFQ;
    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
}

function formatCourseList(course, portalName) {
    if (course.length === 0) {
        return `Lo siento, este curso no está entre mis datos`;
    }

    return `Curso: ${course[0].name}\n
Descripcion: ${course[0].description}\n
Duracion: ${course[0].duration}\n
Modalidad: ${course[0].modality}\n
Prerequisitos: ${course[0].prerequisites}\n
Portal: ${portalName}`.trim();
}

function formatAnswerList(answer, portalName) {
    if (answer.length === 0) {
        return `Lo siento, este curso no está entre mis datos`;
    }
    url = ""
    if( answer[0].url){
        url = `url ${answer[0].url}\n`
    }
        
    return `Pregunta: ${answer[0].ask}\n
Respuesta: ${answer[0].answer}\n
${url}
Portal: ${portalName}`.trim();
}

async function getCoursesNameByPortal(idPortal) {
    try {
        const coursesRef = db.collection('courses');
        const query = coursesRef.where('idPortal', '==', idPortal).where('status', '==', 'activo').select('name');
        const snapshot = await query.get();

        if (snapshot.empty) {
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

async function getPortals() {
    try {
        const portalesRef = db.collection('portales');
        const query = portalesRef.select('name');
        const snapshot = await query.get();

        if (snapshot.empty) {
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

async function getQuestionByPortal(idPortal) {
    try {
        const coursesRef = db.collection('frequentQuestions');
        const query = coursesRef.where('idPortal', '==', idPortal).select('ask');
        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        const FQs = [];
        snapshot.forEach(doc => {
            FQs.push({ ask: doc.data().ask });
        });

        return FQs

    } catch (error) {
        console.error('Error al obtener los documentos', error);
    }

}
// Función para formatear un objeto en una cadena legible
function formatData(obj) {
    return `Esta es la información del ${obj.name}:
 
${obj.address ? `Dirección: ${obj.address}` : ''}
${obj.email ? `Email: ${obj.email}` : ''}
${obj.phone ? `Teléfono: ${obj.phone}` : ''}
${obj.url ? `URL: ${obj.url}` : ''}
${obj.mondayStartTime && obj.mondayEndTime ? `Horario Lunes a Viernes: ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)}` : ''}
${obj.saturdayStartTime && obj.saturdayEndTime ? `Horario Sábados: ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}` : ''}`.trim();
}


function extractSubstring(dateTimeString) {
    return dateTimeString.substring(11, 16);
}

function levenshtein(a, b) {
    const alen = a.length;
    const blen = b.length;
    const arr = [];

    for (let i = 0; i <= alen; i++) {
        arr[i] = [i];
    }

    for (let j = 1; j <= blen; j++) {
        arr[0][j] = j;
    }

    for (let i = 1; i <= alen; i++) {
        for (let j = 1; j <= blen; j++) {
            const tmp = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
            arr[i][j] = Math.min(
                arr[i - 1][j] + 1,
                arr[i][j - 1] + 1,
                arr[i - 1][j - 1] + tmp
            );
        }
    }

    return arr[alen][blen];
}


function findMostSimilarName(docs, portalName) {
    if (docs.length === 0) return [];

    let mostSimilar = docs[0];
    let smallestDistance = levenshtein(portalName, mostSimilar.name);

    for (let i = 1; i < docs.length; i++) {
        const distance = levenshtein(portalName, docs[i].name);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            mostSimilar = docs[i];
        }
    }

    return mostSimilar;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    //const text = await getDataPortal('portal perdomo');
    //console.log(text)
    console.log("inicio el servicio")
});
