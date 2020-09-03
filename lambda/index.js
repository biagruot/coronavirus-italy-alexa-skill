const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const languageStrings = require('./localization');
const covidApi = require('./covidApi');
const util = require('./util');
const constants = require('./constants');
const launchScreenData = require('./documents/launchScreenData');
const statisticsRegionData = require('./documents/statisticsRegionData');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        let hintMessage = handlerInput.t('WELCOME_MESSAGES');
        let speakOutput = handlerInput.t('WELCOME_MESSAGE_PREFIX') + hintMessage + handlerInput.t('WELCOME_MESSAGE_SUFFIX');

        // Add APL directive to response
        if (util.supportsAPL(handlerInput)) {
            const hintTextOutput = handlerInput.t('WELCOME_MESSAGE_PREFIX') + hintMessage;
            const dataSource = launchScreenData.dataSource;
            dataSource.listTemplate1Metadata.hintText = hintTextOutput.trim();

            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.1',
                document: constants.APL.launchDoc,
                datasources: dataSource
            });
            // Add home card to response
            handlerInput.responseBuilder.withStandardCard()
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('HELP_MESSAGE');
        const repromptOutput = handlerInput.t('HELP_REPROMPT');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('STOP_MESSAGE');
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = handlerInput.t('ERROR_MESSAGE');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const StatisticsRegionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StatisticsRegionIntent';
    },
    async handle(handlerInput) {
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        const locationValue = getLocationSlotValue(slots);
        const fieldValue = getFieldSlotValue(slots);
        const obtainedData = await covidApi.handleRegionIntentRequest(locationValue, fieldValue);

        // Add APL directive to response
        if (util.supportsAPL(handlerInput)) {
            let dataSource = statisticsRegionData.dataSource;
            dataSource.listTemplate1ListData.listPage.listItems.forEach(item => {
                for (const [key, value] of Object.entries(obtainedData.fullData)) {
                    if (key === item.listItemIdentifier) {
                        item.textContent.fieldValue.text = value;
                    }
                }
            });
            dataSource.listTemplate1Metadata.headerTitle = 'Ultimo aggiornamento: ' + obtainedData.lastUpdate.trim();
            dataSource.listTemplate1Metadata.headerSubtitle = obtainedData.fullData['denominazione_regione'] ? obtainedData.fullData['denominazione_regione'].trim().toUpperCase() : locationValue.trim().toUpperCase();

            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.1',
                document: constants.APL.statisticsRegionDoc,
                datasources: dataSource
            });
            // Add home card to response
            handlerInput.responseBuilder.withStandardCard()
        }

        return handlerInput.responseBuilder
            .speak(obtainedData.response)
            .getResponse();
    }
};

const getLocationSlotValue = (slots) => {
    let locationValue = '';
    const locationResolutionValues = slots.LocationSlot &&
        slots.LocationSlot.resolutions &&
        slots.LocationSlot.resolutions.resolutionsPerAuthority[0] &&
        slots.LocationSlot.resolutions.resolutionsPerAuthority[0].values;

    if (locationResolutionValues) {
        locationValue = locationResolutionValues[0].value.id;
    }

    return locationValue;
}

const getFieldSlotValue = (slots) => {
    let fieldValue = '';
    const fieldResolutionValues = slots.FieldSlot &&
        slots.FieldSlot.resolutions &&
        slots.FieldSlot.resolutions.resolutionsPerAuthority[0] &&
        slots.FieldSlot.resolutions.resolutionsPerAuthority[0].values;

    if (fieldResolutionValues) {
        fieldValue = fieldResolutionValues[0].value.id;
    }

    return fieldValue;
}

/////////////////////////////////
// Interceptors Definition
/////////////////////////////////

/**
 * This request interceptor will bind a translation function 't' to the handlerInput
 */
const LocalizationInterceptor = {
    process(handlerInput) {
        const localisationClient = i18n.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings,
            returnObjects: true
        });
        localisationClient.localise = function localise() {
            const args = arguments;
            const value = i18n.t(...args);
            if (Array.isArray(value)) {
                return value[Math.floor(Math.random() * value.length)];
            }
            return value;
        };
        handlerInput.t = function translate(...args) {
            return localisationClient.localise(...args);
        }
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        StatisticsRegionIntentHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .addRequestInterceptors(
        LocalizationInterceptor
    )
    .lambda();
