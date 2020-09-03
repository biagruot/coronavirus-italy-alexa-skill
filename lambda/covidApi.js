const https = require('https');

const datasetUrls = {
  country: 'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json',
  region: 'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json',
  province: 'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-province.json'
};

module.exports.handleRegionIntentRequest = async (locationValue, fieldValue) => {
  let parsedJsonData;
  let fullData;
  let lastUpdate;
  let response;
  let fieldValueData;
  if (locationValue.toLowerCase() === 'italia') {
    parsedJsonData = await getDataFromJSON(datasetUrls.country);
    fullData = parsedJsonData[parsedJsonData.length - 1];
    lastUpdate = fullData['data'];
    fieldValueData = fullData[fieldValue];
    response = buildResponse(locationValue, fieldValue, fieldValueData);
  } else {
    parsedJsonData = await getDataFromJSON(datasetUrls.region);
    fullData = getRegionData(locationValue, parsedJsonData);
    lastUpdate = fullData['data'];
    fieldValueData = fullData[fieldValue];
    response = buildResponse(fullData['denominazione_regione'], fieldValue, fieldValueData);
  }
  
  return {
    fullData,
    lastUpdate,
    fieldValueData,
    response
  }
}

const buildResponse = (locationValue, fieldValue, data) => {
  let response = '';

  switch (fieldValue) {
    case 'tamponi':
      response = `In ${locationValue} sono stati effettuati ${data} tamponi`;
      break;

    case 'totale_casi':
      response = `In ${locationValue} si contano attualmente ${data} casi di corona virus registrati`;
      break;

    case 'deceduti':
      response = `In ${locationValue}, purtroppo, sono morte ${data} persone`;
      break;

    case 'dimessi_guariti':
      response = `In ${locationValue}, sono guarite ${data} persone`;
      break;

    case 'nuovi_attualmente_positivi':
      response = `Oggi ${data} persone sono risultate positive in ${locationValue}`;
      break;

    case 'totale_attualmente_positivi':
      response = `Il numero totale di persone risultate positive al virus in ${locationValue} è ${data}`;
      break;

    case 'isolamento_domiciliare':
      response = `In ${locationValue} le persone in isolamento domiciliare sono ${data}`;
      break;

    case 'totale_ospedalizzati':
      response = `In ${locationValue} le persone ricoverate in ospedale sono ${data}`;
      break;

    case 'terapia_intensiva':
      response = `In ${locationValue} le persone ricoverate in terapia intensiva sono ${data}`;
      break;

    case 'ricoverati_con_sintomi':
      response = `In ${locationValue} le persone ricoverate con sintomi sono ${data}`;
      break;

    default:
      break;
  }

  return response;
}

const getDataFromJSON = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve(JSON.parse(data.trim()));
      });

    }).on("error", (err) => {
      reject(err.message);
    });
  });
}

const getRegionData = (location, parsedJsonData) => {
  switch (location) {
    case 'emiliaromagna':
      location = 'emilia romagna';
      break;

    case 'valleaosta':
      location = 'valle d\'aosta';
      break;

    case 'friuliveneziagiulia':
      location = 'friuli venezia giulia';
      break;

    default:
      break;
  }

  const lastUpdate = parsedJsonData[parsedJsonData.length - 1]['data'];
  let regionData;
  parsedJsonData.forEach(data => {
    if (data.data === lastUpdate && data['denominazione_regione'].toLowerCase() === location) {
      regionData = data;
    }
  });
  return regionData
}
