const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Ruta al archivo de configuración
const app = express();
const { WebhookClient } = require('dialogflow-fulfillment'); // Para Dialogflow ES
const { Suggestion } = require('dialogflow-fulfillment');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chatbotportalesinteracti-52820-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const projectId = 'your-project-id'; // Reemplaza con tu ID de proyecto

// Configura el cliente de Dialogflow CX
const sessionClient = new SessionsClient({
    credentials: serviceAccount,
    projectId: projectId
});

app.post('/webhook', express.json(), function (req, res) {
    const agent = new WebhookClient({ request: req, response: res });

    async function PortalesInteractivos(agent) {
        try {
            const portales = agent.parameters.portales;
            const respuesta = await getDataPortal(portales);

            if (respuesta.length != 0) {
                agent.add(respuesta);
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
            const portal = agent.parameters.portales;
            const idPortal = await getDataIdPortal(portal)

            if (idPortal) {
                cursos = await getCoursesNameByPortal(idPortal);
                cursosDataFormat = formatDataCursos(cursos, portal);

                agent.add(cursosDataFormat);

            } else {
                agent.add("No se encontro el " + portal + " en la base de datos. Vuelve a intentarlo por favor");
            }
        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function Portales() {
        try {

            portales = await getPortals();
            let dataPortals = formatDataTotalPortales(portales);
            agent.add(dataPortals);

        } catch (error) {
            //console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function ObtenerInformacionCurso(agent) {
        try {
            let respuesta = "";
            const portal = agent.parameters.portales;
            const namecurso = agent.parameters.curso;

            const idPortal = await getDataIdPortal(portal)
            const cursos = await getCoursesByPortal(idPortal, namecurso);

            // Validación de parámetros
            if (!portal || !namecurso) {
                respuesta = "Lo siento, no encontre el portal ni el curso";
                if (portal || !namecurso) {
                    respuesta = "Lo siento, no encontre en el " + portal + " el curso " + namecurso;
                }

            } else {
                respuesta = await formatCourseList(cursos, portal);
            }

            agent.add(respuesta);

        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }

    async function PreguntasFrecuentesPortal() {
        try {
            const portales = agent.parameters.portales;
            const idPortal = await getDataIdPortal(portales)

            let respuestas = '';

            if (idPortal) {
                FQs = await getQuestionByPortal(idPortal);
                respuestas = formatDataPreguntas(FQs, portales);
                agent.add(respuestas);
            } else {
                agent.add("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
            }
        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }


    async function RespuestasFrecuentes(agent) {
        console.log("Entro aqui");
        try {
            const portales = agent.parameters.portales;
            const respuestasfrecuentes = agent.parameters.respuestasfrecuentes;

            console.log(portales);
            console.log(respuestasfrecuentes);

            const idPortal = await getDataIdPortal(portales)
            let respuesta = "No se encontro el " + portales + " en la base de datos."

            console.log(idPortal);

            if (respuestasfrecuentes) {
                if (idPortal) {
                    const answerFQs = await getAnswerByPortal(idPortal, respuestasfrecuentes);
                    console.log(answerFQs);
                    respuesta = await formatAnswerList(answerFQs, idPortal);
                }
            }
            console.log(respuesta);
            agent.add(respuesta);
        } catch (error) {
            console.error('Error al obtener datos de Firestore:', error);
            res.status(500).json({ error: 'Error al obtener datos de Firestore' });
        }
    }


    let intentMap = new Map();
    intentMap.set('PortalesInteractivos', PortalesInteractivos);
    intentMap.set('CursosPorPortal', CursosPorPortal);
    intentMap.set('ObtenerInformacionCurso', ObtenerInformacionCurso);
    intentMap.set('PreguntasFrecuentesPortal', PreguntasFrecuentesPortal);
    intentMap.set('RespuestasFrecuentes', RespuestasFrecuentes);
    intentMap.set('Portales', Portales);
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
                phone: data.phone,
                url: data.url,
                mondayEndTime: data.mondayEndTime,
                mondayStartTime: data.mondayStartTime,
                saturdayEndTime: data.saturdayEndTime,
                saturdayStartTime: data.saturdayStartTime
            };
        });

        const filteredData = docs.filter(obj => obj.name === portalName);
        return filteredData.map(formatDataPortal).join("\n");

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


function formatAnswerList(answer) {
    if (answer.length === 0) {
        return `Lo siento, esa pregunta no la reconozco`;
    }
    return `${answer[0].answer}`;
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


//Formato de respuesta para el chatbot

//Formato para consulta de preguntas frecuentes de un portal
function formatDataPreguntas(listPreguntas, portales) {
    if (listPreguntas.length === 0) {
        return `No hay preguntas frecuentes disponibles para el portal ${portales}.`;
    }
    const preguntas = listPreguntas.map(preguntas => preguntas.ask).join(', ');
    return `Puedes preguntar en el ${portales} sobre ${preguntas}; Haz tu pregunta sobre estos temas.`;
}

//Formato consulta de curso de un portal elegido
function formatCourseList(course, portalName) {
    if (course.length === 0) {
        return `Lo siento, este curso no está entre mis datos. consulta otro curso`;
    }

    return `Que bueno que preguntas por el curso ${course[0].name}. 
    ${course[0].description ? `ese es un ${course[0].description}, ` : ''}
    ${course[0].duration ? `tiene una duración de ${course[0].duration}, ` : ''}
    ${course[0].modality ? `su modalidad es ${course[0].modality}, ` : ''}
    ${course[0].prerequisites ? `y necesitas tener como prerequisito ${course[0].prerequisites}` : ''}`;
}

//Formato para consultar todos los portales
function formatDataTotalPortales(listPortals) {
    if (listPortals.length === 0) {
        return `No hay portales activos`;
    }
    const portales = listPortals.map(curso => curso.name).join(', ');
    return `Estos son los portales activos : ${portales}.                              ¿De cuál portal quisieras más información?`;
}

//Formato para informacion individual del portal consultado
function formatDataPortal(obj) {
    const respuesta = [`Esta es la información del ${obj.name}, 
    ${obj.address ? `la dirección del portal es: ${obj.address}, ` : ''} 
    ${obj.email ? `su Email es: ${obj.email}, ` : ''}
    ${obj.phone ? `su linea de atencion: ${obj.phone}, ` : ''} 
    ${obj.mondayStartTime && obj.mondayEndTime ? `tiene horarios de lunes a viernes de  ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)} ` : ''}
    ${obj.saturdayStartTime && obj.saturdayEndTime ? `y sabados de ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}` : ''}
    . Preguntame sobre algun curso y te dire si esta disponible en el portal que me nombres`,

    `Te proporciono la información sobre ${obj.name}. 
    ${obj.address ? `La dirección del portal es: ${obj.address}.` : ''} 
    ${obj.email ? `El correo electrónico es: ${obj.email}.` : ''} 
    ${obj.phone ? `El número de atención es: ${obj.phone}.` : ''} 
    ${obj.mondayStartTime && obj.mondayEndTime ? `El horario de atención es de lunes a viernes, de ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)}.` : ''} 
    ${obj.saturdayStartTime && obj.saturdayEndTime ? `Y los sábados, de ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}.` : ''} 
    Si deseas saber sobre algún curso, indícame el nombre y el portal, te confirmaré si está disponible allí.`
    ]

    const indiceAleatorio = Math.floor(Math.random() * respuesta.length);
    const elementoAleatorio = respuesta[indiceAleatorio];

    return elementoAleatorio;
}

//Formato para cursos de un portal
function formatDataCursos(listCursos, portales) {
    if (listCursos.length === 0) {
        return `No hay cursos disponibles para el portal ${portales}.`;
    }
    const cursos = listCursos.map(curso => curso.name).join(', ');
    return `Estos son los cursos del ${portales}: ${cursos}. ¿Cuál curso quisieras más información?`;
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
    console.log("inicio el servicio")
});
