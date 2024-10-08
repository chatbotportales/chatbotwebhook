const express = require('express');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');
const app = express();
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');
const projectId = 'YOUR_PROJECT_ID'; // Reemplaza con tu ID de proyecto
const serviceAccount = require('./firebase-adminsdk.json');

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

//API Webhook 
app.post('/webhookcx', async (req, res) => {

    let respuestamensaje = []
    let respuestamensajefinal = []

    const tag = req.body.fulfillmentInfo.tag;
    let payloadInitialized = false; // Variable para verificar si el payload ha sido inicializado
    let payload = {}; // Inicializamos el payload vacío

    //Validación de Tags y consultas Webhook
    if (tag === 'Bienvenida') {
        payload = {
            "richContent": [
              [
                {
                  "type": "chips",
                  "options": [
                    {
                      "value": "Portales",
                      "text": "Consultar Portales"
                    }
                  ]
                }
              ]
            ]
          };
        payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

    } else if (tag === 'PruebaTag') {
        respuestamensaje.push("prueba de conexion exitosa!..")
        payload = {
            "richContent": [
              [
                {
                  "type": "chips",
                  "options": [
                    {
                      "value": "Portales",
                      "text": "Consultar Portales"
                    }
                  ]
                }
              ]
            ]
          };
        payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

    } else if (tag === 'Portales') {
        let portales = await Portales();
        const options = [];
        
        //Aqui toca separar cada dato y agregarlo al array para que el codigo del json lo interprete bien
        respuestamensaje.push('Estos son los Portales Interactivos de Ciudad Bolivar:');
        for (let portal of portales) {
            //respuestamensaje.push(portal);
            options.push({
                "value": portal,  // Valor del portal
                "text": portal    // Texto a mostrar en el chip
            });
        }

        payload = {
            "richContent": [
                [
                    {
                        "type": "chips",
                        "options": options // Asigna las opciones creadas en el bucle
                    }
                ]
            ]
        };
        payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

    } else if (req.body.sessionInfo && req.body.sessionInfo.parameters) {

        if (tag === 'PortalesInteractivos') {
            if (req.body.sessionInfo.parameters.portales) {

                let portalesData = await PortalesInteractivos(req.body.sessionInfo.parameters.portales);
                let pagina = `chatbot?command=${req.body.sessionInfo.parameters.portales}`;

                //Aqui toca separar cada dato y agregarlo al array para que el codigo del json lo interprete bien
                for (let portaldata of portalesData) {
                    respuestamensaje.push(portaldata);
                }

                let richC = [];
                if (pagina){
                    richC.push(
                        {
                            "subtitle": "Informacion Portal",
                            "title": "ver datos en la pagina",
                            "type": "info",
                            "anchor": {
                              "href": pagina
                            }
                        }
                    )
                }
                richC.push(
                    {
                        "type": "chips",
                        "options": [
                          {
                            "text": "Consultar Cursos",
                            "value": "Cursos"
                          },
                          {
                            "value": "Consultar preguntas frecuentes",
                            "text": "Preguntas Frecuentes"
                          }
                        ]
                      }
                )
                payload = {
                    "richContent": [
                        richC
                    ]
                  };
                payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

            } else {
                respuestamensaje = ["Disculpa, de cual portal deseas informacion"];
            }
        }
        else if (tag === 'CursosPorPortal') {
            if (req.body.sessionInfo.parameters.portales) {
                let cursoPorPortalData = await CursosPorPortal(req.body.sessionInfo.parameters.portales);
                const options = [];

                respuestamensaje.push(`${req.body.sessionInfo.parameters.portales} tiene los siguientes curso habilitados:`);
                respuestamensajefinal.push("¿De cual curso quisiera mas informacion?");
                for (let cursoData of cursoPorPortalData) {
                    //respuestamensaje.push(cursoData);
                    options.push({
                        "value": cursoData,  // Valor del portal
                        "text": cursoData    // Texto a mostrar en el chip
                    });
                }

                payload = {
                    "richContent": [
                        [
                            {
                                "type": "chips",
                                "options": options // Asigna las opciones creadas en el bucle
                            }
                        ]
                    ]
                };
                payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

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
                const options = [];
                respuestamensaje.push(`Puedes preguntar en el ${req.body.sessionInfo.parameters.portales} sobre:`);
                respuestamensajefinal.push('Haz tu pregunta sobre estos temas.')
                for (let questFreqPortalData of questFreqPortal) {
                    //respuestamensaje.push(questFreqPortalData);
                    options.push({
                        "value": questFreqPortalData,  // Valor del portal
                        "text": questFreqPortalData    // Texto a mostrar en el chip
                    });
                }

                options.push({
                    "text": "Tambien puedes preguntas por los cursos del "+req.body.sessionInfo.parameters.portales,
                    "value": "Cursos"
                });

                payload = {
                    "richContent": [
                        [
                            {
                                "type": "chips",
                                "options": options // Asigna las opciones creadas en el bucle
                            }
                        ]
                    ]
                };
                payloadInitialized = true; // Cambiamos a true ya que se ha inicializado

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

    //Mensaje de respuesta del Webhook a la solicitud del Chatbot

    //Se toma el array y se divide en los valores de cada text
    const fulfillmentMessages = respuestamensaje.map(message => ({
        text: {
            text: [message]
        }
    }));

    fulfillmentMessages.push({
        payload: payload // Añade el payload como un mensaje adicional
    });

    for (let i = 0; i < respuestamensajefinal.length; i++) {
        fulfillmentMessages.push({
            text: {
                text: [respuestamensajefinal[i]] // Agrega cada mensaje dentro de un array
            }
        });
    }

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

            respuestamensaje.push("También puedes consultar por los cursos o las preguntas frecuentes del " + portales);

            return respuestamensaje

        } else {
            return ["No entendí 😢 ¿Podrías escribírmelo de otra forma?"]
        }

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        return ['Error al obtener datos de Firestore']
    }
}


async function CursosPorPortal(portales) {
    let respuestamensaje = []

    try {
        const idPortal = await getDataIdPortal(portales)

        if (idPortal) {
            cursos = await getCoursesNameByPortal(idPortal);
            //respuestamensaje.push(`${portales} tiene los siguientes curso habilitados:`);
            for (let i = 0; i < cursos.length; i++) {
                respuestamensaje.push(cursos[i].name);
            }

            //respuestamensaje.push("¿De cual curso quisiera mas informacion?");
        } else {
            respuestamensaje.push("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
        }

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
        //dataPortales.push(`Estos son los Portales Interactivos de Ciudad Bolivar:`);

        for (let i = 0; i < portales.length; i++) {
            dataPortales.push(portales[i].name);
        }

    } catch (error) {
        dataPortales.push('Error al obtener datos de Firestore');
    }

    return dataPortales;
}

async function ObtenerInformacionCurso(portal, namecurso) {
    let respuestamensaje = []
    try {

        const idPortal = await getDataIdPortal(portal)
        let respuesta = "No se encontro el " + portal + " en la base de datos."

        if (namecurso) {
            if (idPortal) {
                const cursos = await getCoursesByPortal(idPortal, namecurso);
                respuesta = await formatCourseList(cursos);
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
            cursos = await getCoursesNameByPortal(idPortal);
            //respuestamensaje.push(`${portales} tiene los siguientes curso habilitados:`);
            for (let i = 0; i < cursos.length; i++) {
                respuestamensaje.push(cursos[i].name);
            }

            //respuestamensaje.push("¿De cual curso quisiera mas informacion?");
        } else {
            respuestamensaje.push("No se encontro el " + portales + " en la base de datos. Vuelve a intentarlo por favor");
        }

    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        respuestamensaje.push('Error al obtener datos de Firestore');
    }

    
    try {
        const idPortal = await getDataIdPortal(portales)

        if (idPortal) {
            FQs = await getQuestionByPortal(idPortal);

            for (let i = 0; i < cursos.length; i++) {
                respuestamensaje.push(FQs[i].ask);
            }

            //respuestamensaje.push(formatDataPreguntas(FQs, portales));
            //respuestamensaje.push('Tambien puedes preguntas por los cursos del ' + portales);

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
                respuestamensaje.push(listData[i]);
            }
        }
        if (idPortal) {
            respuestamensaje.push('Pregunta por los cursos ' + portales + '. Tal vez te interese alguno');
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
            const distance = levenshtein(fquestion.ask.toLowerCase(), referenceName.toLowerCase());
            return distance <= maxDistance;
        });

        return filteredFQ;
    } catch (error) {
        console.error('Error al obtener datos de Firestore:', error);
        throw new Error('Error al obtener datos de Firestore');
    }
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

//Utilities

function extractSubstring(dateTimeString) {
    return dateTimeString.substring(11, 16);
}


//Formato de respuestas 

//Formato para la respuesta a una pregunta frecuente
function formatAnswerList(answer, portalName) {
    if (answer.length === 0) {
        return `Lo siento, este curso no está entre mis datos`;
    }
    url = ""
    if (answer[0].url) {
        url = `url ${answer[0].url}\n`
    }

    return `${answer[0].answer}\n
${url}`.trim();
}

//Formato para informacion individual del portal consultado
function formatDataPortal(obj) {
    const respuesta = [`Esta es la información del ${obj.name}.
${obj.address ? `la dirección del portal es: ${obj.address}, ` : ''}${obj.email ? `su Email es: ${obj.email}, ` : ''}${obj.phone ? `su linea de atencion: ${obj.phone}, ` : ''}${obj.mondayStartTime && obj.mondayEndTime ? `tiene horarios de lunes a viernes de  ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)} ` : ''}${obj.saturdayStartTime && obj.saturdayEndTime ? `y sabados de ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}` : ''}`,

    `Te proporciono la información sobre ${obj.name}. 
${obj.address ? `La dirección del portal es: ${obj.address}.` : ''}${obj.email ? `El correo electrónico es: ${obj.email}.` : ''}${obj.phone ? `El número de atención es: ${obj.phone}.` : ''}${obj.mondayStartTime && obj.mondayEndTime ? `El horario de atención es de lunes a viernes, de ${extractSubstring(obj.mondayStartTime)} a ${extractSubstring(obj.mondayEndTime)}.` : ''}${obj.saturdayStartTime && obj.saturdayEndTime ? `Y los sábados, de ${extractSubstring(obj.saturdayStartTime)} a ${extractSubstring(obj.saturdayEndTime)}.` : ''}`
    ]

    const indiceAleatorio = Math.floor(Math.random() * respuesta.length);
    const elementoAleatorio = respuesta[indiceAleatorio];

    return elementoAleatorio;
}

//Formato para consulta de preguntas frecuentes de un portal
function formatDataPreguntas(listPreguntas, portales) {
    if (listPreguntas.length === 0) {
        return `No hay preguntas frecuentes disponibles para el portal ${portales}.`;
    }
    const preguntas = listPreguntas.map(preguntas => preguntas.ask).join(', ');
    return `Puedes preguntar en el ${portales} sobre ${preguntas}; Haz tu pregunta sobre estos temas.`;
}

//Formato de para informacion de un curso de un portal en especifico 
function formatCourseList(course) {
    if (course.length === 0) {
        return `Lo siento, este curso no está entre mis datos. consulta otro curso`;
    }

    return `Que bueno que preguntes por el curso ${course[0].name}. Esta es su información: 

${course[0].description ? `Es ${course[0].description}. ` : ''} ${course[0].duration ? ` Tiene una duración de ${course[0].duration}.` : ''}${course[0].modality ? ` Su modalidad es ${course[0].modality} ` : ''}${course[0].prerequisites === "ninguno" ? "y no tiene prerequisitos" : (course[0].prerequisites ? `y necesitas tener como prerequisito ${course[0].prerequisites}` : '')}`.trim();
}


//Algoritmos de aproximación 
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

app.listen(port, () => {
    console.log(`..Servidor corriendo en el puerto ${port}`);
});
