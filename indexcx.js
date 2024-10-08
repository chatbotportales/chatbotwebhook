const express = require('express');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');
const app = express();
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');
// Configura las credenciales y el cliente de Dialogflow CX
const projectId = 'YOUR_PROJECT_ID'; // Reemplaza con tu ID de proyecto
const location = 'global'; // Usa 'global' o la región específica que estés utilizando
const agentId = 'YOUR_AGENT_ID'; // Reemplaza con tu ID de agente
const serviceAccount = require('./firebase-adminsdk.json');

const { onNewNonfatalIssuePublished } = require('firebase-functions/v2/alerts/crashlytics');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chatbotportalesinteracti-52820-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

const sessionClient = new SessionsClient({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId,
});

app.use(express.json());

app.post('/webhookcx', async (req, res) => {
    console.log('Solicitud recibida:', req.body);

    let respuestamensaje = []

    const tag = req.body.fulfillmentInfo.tag;

    if (tag === 'PruebaTag') {
        respuestamensaje.push("conectado con el servidor1!")
        respuestamensaje.push("conectado con el servidor2!")
        respuestamensaje.push("conectado con el servidor3!")
        respuestamensaje.push("conectado con el servidor4!")
    } else if (tag === 'Portales') {
        console.log("por aqui paso 1");
        let portales = await Portales();

        //Aqui toca separar cada dato y agregarlo al array para que el codigo del json lo interprete bien
        for (let portal of portales) {
            respuestamensaje.push(portal);
        }
    } else if (req.body.sessionInfo && req.body.sessionInfo.parameters) {

        if (tag === 'PortalesInteractivos') {
            console.log("por aqui paso 2");
            if (req.body.sessionInfo.parameters.portales) {

                let portalesData = await PortalesInteractivos(req.body.sessionInfo.parameters.portales);

                //Aqui toca separar cada dato y agregarlo al array para que el codigo del json lo interprete bien
                for (let portaldata of portalesData) {
                    respuestamensaje.push(portaldata);
                }

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }
        else if (tag === 'CursosPorPortal') {
            if (req.body.sessionInfo.parameters.portales) {
                console.log("por aqui " + tag);

                let cursoPorPortalData = await CursosPorPortal(req.body.sessionInfo.parameters.portales);

                console.log("por aqui " + cursoPorPortalData.length);

                for (let cursoData of cursoPorPortalData) {
                    respuestamensaje.push(cursoData);
                }

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }
        else if (tag === 'ObtenerInformacionCurso') {
            if (req.body.sessionInfo.parameters.portales && req.body.sessionInfo.parameters.curso) {

                let obtInfCurso = await ObtenerInformacionCurso(req.body.sessionInfo.parameters.portales, req.body.sessionInfo.parameters.curso);

                for (let obtInfCursoData of obtInfCurso) {
                    respuestamensaje.push(obtInfCursoData);
                }

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }
        else if (tag === 'PreguntasFrecuentesPortal') {
            if (req.body.sessionInfo.parameters.portales) {

                let questFreqPortal = await PreguntasFrecuentesPortal(req.body.sessionInfo.parameters.portales);

                for (let questFreqPortalData of questFreqPortal) {
                    respuestamensaje.push(questFreqPortalData);
                }

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }
        else if (tag === 'RespuestasPreguntasFrecuentes') {
            if (req.body.sessionInfo.parameters.portales && req.body.sessionInfo.parameters.preguntasfrecuentes) {

                let respQuestFreq = await RespuestasPreguntasFrecuentes(req.body.sessionInfo.parameters.portales, req.body.sessionInfo.parameters.preguntasfrecuentes);

                for (let respQuestFreqData of respQuestFreq) {
                    respuestamensaje.push(respQuestFreqData);
                }

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }

    }

    //Se toma el array y se divide en los valores de cada text
    const fulfillmentMessages = respuestamensaje.map(message => ({
        text: {
            text: [message]
        }
    }));

    //Se toma esta constante y se arma la respuesta 
    const jsonResponse = {
        fulfillment_response: {
            messages: fulfillmentMessages,
        },
    };

    //Se convierte en el json que puede interpretar dialogflow cx
    const jsonS = JSON.stringify(jsonResponse, null, 0);

    //console.log(jsonS);

    res.status(200).send(jsonS)

});



async function PortalesInteractivos(portales) {
    try {
        const respuesta = await getDataPortal(portales);

        let respuestamensaje = []
        if (respuesta.length != 0) {
            const lineas = respuesta.split('\n');
            for (let i = 0; i < lineas.length; i++) {
                if (lineas[i] !== "") {
                    respuestamensaje.push(lineas[i])
                }
            }

            respuestamensaje.push("Puedes consultar:");
            respuestamensaje.push('Cursos ' + portales);
            respuestamensaje.push('Preguntas Frecuentes ' + portales);

            return respuestamensaje

        } else {
            return ["No entendí 😢 ¿Podrías escribírmelo de otra forma?"]
        }

    } catch (error) {
        console.error(error);
        return ['Error al obtener datos de Firestore']
    }
}

async function CursosPorPortal(portales) {
    let respuestamensaje = []

    try {
        const idPortal = await getDataIdPortal(portales)

        console.log("idPortal")
        if (idPortal) {
            cursos = await getCoursesNameByPortal(idPortal);
            console.log("getCoursesNameByPortal")
            respuestamensaje.push(`${portales} tiene los siguientes curso habilitados:`);
            for (let i = 0; i < cursos.length; i++) {
                respuestamensaje.push(cursos[i].name + " - " + portales);
            }
        } else {
            respuestamensaje.push("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
        }

        console.log("respuestamensaje " + respuestamensaje.length)

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        respuestamensaje.push('Error al obtener datos de Firestore');
    }

    return respuestamensaje
}


async function Portales() {
    let dataPortales = []
    try {
        portales = await getPortals();
        dataPortales.push(`Estos son los Portales Interactivos de Ciudad Bolivar:`);

        for (let i = 0; i < portales.length; i++) {
            console.log(portales[i].name)

            dataPortales.push(portales[i].name);
        }


    } catch (error) {
        //console.error('Error al obtener datos de Firestore:', error);
        dataPortales.push('Error al obtener datos de Firestore');
    }

    return dataPortales;
}



async function ObtenerInformacionCurso(portal, namecurso) {
    let respuestamensaje = []
    try {

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
                respuestamensaje.push(listDataCursos[i]);
            }
        }

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        respuestamensaje.push('Error al obtener datos de Firestore');
    }
    return respuestamensaje
}


async function PreguntasFrecuentesPortal(portales,) {
    let respuestamensaje = []
    try {
        const idPortal = await getDataIdPortal(portales)

        if (idPortal) {
            FQs = await getQuestionByPortal(idPortal);
            respuestamensaje.push(`${portales} deseas consultar sobre:`);
            for (let i = 0; i < FQs.length; i++) {
                respuestamensaje.push("Preguntar: " + FQs[i].ask + " - " + portales);
            }

            respuestamensaje.push('Cursos ' + portales);
            respuestamensaje.push('Preguntas Frecuentes ' + portales);

        } else {
            respuestamensaje.push("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
        }


    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        respuestamensaje.push('Error al obtener datos de Firestore');
    }
    return respuestamensaje
}


async function RespuestasPreguntasFrecuentes(portales, preguntasfrecuentes) {
    let respuestamensaje = []
    try {

        const idPortal = await getDataIdPortal(portales)
        let respuesta = "No se encontro el " + portales + " en la base de datos."

        if (preguntasfrecuentes) {
            if (idPortal) {
                const answerFQs = await getAnswerByPortal(idPortal, preguntasfrecuentes);
                respuesta = await formatAnswerList(answerFQs, portales);
            }
        }
        const listData = respuesta.split("\n");

        for (let i = 0; i < listData.length; i++) {
            if (listData[i] !== "") {
                //console.log(listData[i])
                respuestamensaje.push(listData[i]);
            }
        }
        if (idPortal) {
            respuestamensaje.push('Cursos ' + portales);
            respuestamensaje.push('Preguntas Frecuentes ' + portales);
        }

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        respuestamensaje.push('Error al obtener datos de Firestore');
    }
    return respuestamensaje
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
    console.log("getDataIdPortal1")
    try {
        const snapshot = await db.collection('portales').get();
        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
            };
        });
        console.log("getDataIdPortal2")

        const filteredData = docs.filter(obj => obj.name === portalName);

        console.log("getDataIdPortal3")
        if (filteredData.length === 0) {
            return null;
        }

        console.log("getDataIdPortal4")

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
    if (answer[0].url) {
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



app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
