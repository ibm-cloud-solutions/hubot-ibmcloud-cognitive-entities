/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const path = require('path');
const TAG = path.basename(__filename);

const env = require('./env');
const watson = require('watson-developer-cloud');
const nlcconfig = require('hubot-ibmcloud-cognitive-lib').nlcconfig;
const utils = require('hubot-ibmcloud-utils').utils;
const Conversation = require('hubot-conversation');
const entityHandler = require('./entityHandler');
const EntityDecoder = require('./entityDecoder');
const FuzzyMatcher = require('./entityFuzzyMatch');

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

let textsByClass;

/*
 * Overview of the EntityManager.
 *
 * The primary interface is the getEntities() function.  It is invoked from
 * within the hubot-ibmcloud-nlc high confidence and medium confidence processing.
 * Once the target class is determined via the nlc processing, the class' definition
 * is obtained and then the getEntities() method is invoked.
 *
 * Following is the high-level processing sequence:
 *
 * If entity parsing is disabled
 *   Then For each required parameter:
 *     Use conversation to ask user to enter just the parameter value
 *   Return all parameter values
 *
 * Else if entity parsing is enabled
 *
 *   Perform Phase 1 processing:
 *     Recursively, do the following (until all values obtained or no new values obtained):
 *       Remove all current parameter values from the statement
 *       For each missing parameter:
 *         Invoke entity handler for parameter type (with latest entity values)
 *       Return all parameter values
 *
 *   Perform Phase 2 processing:
 *     For each missing parameter, in order of definition, do the following:
 *       If parameter definition has entity function defined:
 *         Invoke entity function to obtain latest/complete set of entities
 *       Invoke entity handler for parameter type (with latest/complete entity values)
 *       If parameter value found, we're done
 *       Else (no parameter value yet)
 *         Perform best fuzzy match processing as follows:
 *           Invoke entity handler for parameter type to obtain best possible values
 *           If best possible values found
 *             Then If fuzzy matching is possible for the parameter
 *               Then perform a fuzzy match using the possible value as follows:
 *                 Get best fuzzy matches for possible values against latest/complete entity values
 *                 Use conversation to ask user to pick one of the best fuzzy matches
 *                   If one selected, we're done
 *                   Else If parameter value is required
 *                     Then use conversation to ask user to enter parameter value (can use phrases still)
 *                       Invoke entity handler for parameter type (with latest/complete entity values)
 *                       If parameter value, we're done
 *                       Else, again, perform best fuzzy match processing as follows:
 *                         Invoke entity handler for parameter type to obtain best possible values for this phrase
 *                         If best possible values found
 *                           Then perform a fuzzy match using the possible values as follows:
 *                             Get best fuzzy matches for possible values against latest/complete entity values
 *                             Use conversation to ask user to pick one of the best fuzzy matches
 *                               If one selected, we're done
 *                               Else use conversation to ask user to enter just parameter value (no phrases)
 *                                 We're done (hopefully, with parameter value)
 *                         Else we're done (no parameter value)
 *                   Else we're done (no parameter value)
 *             Else If fuzzy matching is not possible for parameter
 *               If one and only one possible value returned, use it and we're done
 *               Else we're done (no parameter value)
 *           Else (no best possible values) we're done (no parameter value)
 *
 *
 *
 * The secondary interface is the getEntity() function.  It is invoked from
 * within the application script processing during the Regex flow if an optional parameter
 * value was not found.
 *
 * Following is the high-level processing sequence:
 *
 * Obtain class parameter definition for parameter.
 *
 * If entity parsing is disabled
 *   Use conversation to ask user to enter just the parameter value
 *   Return all parameter value
 *
 * Else
 *   If parameter definition has entity function defined:
 *     Invoke entity function to obtain latest/complete set of entities
 *   Invoke entity handler for parameter type (with latest/complete entity values)
 *   If parameter value found, we're done
 *   Else (no parameter value yet)
 *     Perform best fuzzy match processing as follows:
 *       Invoke entity handler for parameter type to obtain best possible values
 *       If best possible values found
 *         Then If fuzzy matching is possible for the parameter
 *           Then perform a fuzzy match using the possible value as follows:
 *             Get best fuzzy matches for possible values against latest/complete entity values
 *             Use conversation to ask user to pick one of the best fuzzy matches
 *               If one selected, we're done
 *               Else If parameter value is required
 *                 Then use conversation to ask user to enter parameter value (can use phrases still)
 *                   Invoke entity handler for parameter type (with latest/complete entity values)
 *                   If parameter value, we're done
 *                   Else, again, perform best fuzzy match processing as follows:
 *                     Invoke entity handler for parameter type to obtain best possible values for this phrase
 *                     If best possible values found
 *                       Then perform a fuzzy match using the possible values as follows:
 *                         Get best fuzzy matches for possible values against latest/complete entity values
 *                         Use conversation to ask user to pick one of the best fuzzy matches
 *                           If one selected, we're done
 *                           Else use conversation to ask user to enter just parameter value (no phrases)
 *                             We're done (hopefully, with parameter value)
 *                     Else we're done (no parameter value)
 *               Else we're done (no parameter value)
 *         Else If fuzzy matching is not possible for parameter
 *           If one and only one possible value returned, use it and we're done
 *           Else we're done (no parameter value)
 *       Else (no best possible values) we're done (no parameter value)
 */


/**
 * Creates an object that manages the gleaning of parameter values from statements.
 *
 * @constructor
 */
function EntityManager(robot) {

	// Create Conversation to use throughout
	this.switchBoard = new Conversation(robot);

	// Update the Watson Alchemy constructor options
	if (env.alchemy_url && env.alchemy_apikey) {
		let alchemy_ctor_opts = {};
		alchemy_ctor_opts.url = env.alchemy_url;
		alchemy_ctor_opts.apikey = env.alchemy_apikey;

		// Create Watson Alchemy instance with options
		this.alchemy = watson.alchemy_language(alchemy_ctor_opts);
	}

	else {
		this.alchemy = null;
	}

}


/* ---------------------------- General purpose functions ------------------ */

/**
 * Returns an array of the seeded text strings corresponding to the given class name.
 * If the seeded text strings have not been obtained yet, do it.
 *
 * @param {string} className [The name of the class for which the seeded text strings are requested.]
 * @return {array of strings} [The seeded text strings corresponding to the given class name.]
 */
function getTextsByClass(className) {
	return new Promise(function(resolve, reject) {

		if (!textsByClass) {
			textsByClass = {};
			nlcconfig.getAllClasses().then(function(classes) {
				for (let i = 0; i < classes.length; i++) {
					let classItem = classes[i];
					let text = classItem[0];
					let cName = classItem[1];
					let texts = textsByClass[cName] || [];
					texts.push(text);
					textsByClass[cName] = texts;
				}
				resolve(textsByClass[className]);
			}).catch(function(err) {
				reject(err);
			});
		}
		else {
			resolve(textsByClass[className]);
		}

	});
}

/**
 * Remove each of the given parameter values from the given statement.
 *
 * @param {string} statement [The statement to process against the parameter.]
 * @param {map} parameters [The current set of parameter values.]
 * @return {string} [The modified statement.]
 */
function removeParameterValuesFromStatement(statement, parameters) {
	Object.keys(parameters).map(function(key) {
		statement = statement.replace(parameters[key], '');
	});
	return statement;
}

/**
 * Builds a displayable version of the given classParameter within the given class.
 *
 * @param {string} className [The class name.]
 * @param {map} classParameter [The class parameter object.]
 * @return {string} [The displayable string.]
 */
function getDisplayableClassParameter(className, classParameter) {
	return `[${className}:${classParameter.name}]`;
}


/* ---------------------------- Parsing disabled functions ------------------ */

/**
 * Initiate conversation get the parameter value and just the parameter value.
 * The parameter value is returned.
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function doAskForJustValueNoParsing(robot, res, switchBoard, className, classParameter) {
	return new Promise(function(resolve, reject) {

		// Only prompt if the parameter is required
		if (classParameter.required === undefined || classParameter.required === true) {
			robot.logger.debug(`${TAG}: doAskForJustValueNoParsing(): Parsing is disabled; prompting user to enter just the value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);

			let prompt = i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.title || classParameter.name);
			utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then(function(dialogResult) {
				let reply = dialogResult.match[1].trim();
				robot.logger.debug(`${TAG}: doAskForJustValueNoParsing(): Dialog reply is: ${reply}`);
				if (reply === 'exit') {
					robot.logger.debug(`${TAG}: doAskForJustValueNoParsing(): User exited with no value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
					resolve();
				}
				else {
					resolve(reply);
				}
			});

		}

		// If not required, nothing to do
		else {
			robot.logger.debug(`${TAG}: doAskForJustValueNoParsing(): Parsing is disabled and the ${getDisplayableClassParameter(className, classParameter)} parameter is not required; nothing to do.`);
			resolve();
		}

	});
}


/* ---------------------------- Phase2 functions ------------------ */

/**
 * Retrieve the latest complete list of entities associated with the given parameter.
 * In order to obtain this list, an 'entityfunction' must be defined in the NLC.json and the specified function
 * must be registered by the app.  If so, this function is invoked to retrieve the entities.
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {map} parameters [A map of parameter name -> parameter value.]
 * @return {promise: array of strings} [The complete current list of entities for the parameter via Promise.resolve().]
 */
function getLatestEntities(robot, res, className, classParameter, parameters) {
	return new Promise(function(resolve, reject) {

		// If a function defined in nlc json to handle retrieving the entities exists, use it
		if (classParameter.entityfunction) {

			// Obtain the defined function and if it exists, use it
			let entityFunction = nlcconfig.getGlobalEntityFunction(classParameter.entityfunction);
			if (entityFunction) {

				// Invoke the defined and registered function to obtain the complete, current list of entities.
				entityFunction(robot, res, classParameter.name, parameters).then(function(entityList) {
					robot.logger.debug(`${TAG}: getLatestEntities(): Latest set of entities for parameter ${getDisplayableClassParameter(className, classParameter)} have been obtained from the entity function; entities = [${entityList}].`);
					resolve(entityList);
				}).catch(function(err) {
					reject(err);
				});

			}

			// If no function registered, return error
			else {
				robot.logger.error(`${TAG}: getLatestEntities(): No entity function registered for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
				reject(new Error(`The function [${classParameter.entityfunction}] was defined for the ${getDisplayableClassParameter(className, classParameter)} parameter but the actual function was not registered.`));
			}
		}

		// If no function defined, nothing to do
		else {
			robot.logger.debug(`${TAG}: getLatestEntities(): No entity function exists for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
			resolve();
		}

	});
}

/**
 * Determine if we can attempt to do a fuzzy match or not.
 * Unfortunately, there is not a particularly clean way to do this so we will do the
 * following:
 *  - If the parameter type is 'keyword' then fuzzy match is supported by definition.
 *  - If a valid list of latestEntities was obtained, then fuzzy match is supported.
 *
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {array of strings} [The latest complete set of entities for the parameter.]
 * @return {bool} [True if fuzzy match is possible.]
 */
function isFuzzyMatchPossible(classParameter, latestEntities) {
	let fuzzyMatchPossible = false;
	if (classParameter.type === 'keyword') {
		fuzzyMatchPossible = true;
	}
	else if (latestEntities) {
		fuzzyMatchPossible = true;
	}
	return fuzzyMatchPossible;
}

/**
 * Using the given set of possible values and the complete set of entities for the parameter,
 * obtain the best set of fuzzy matches within the entities.
 * Up to 10 best fuzzy matches will be used.
 * A conversation is initiated with the user to have them select the best fuzzy match to use or 'none'.
 * If a parameter value is selected, then it is returned.
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {array of strings} latestEntities [The complete current list of entities for the parameter.]
 * @param {array of strings} possibleValues [The complete possible values with the statement for the parameter.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function doFuzzyMatch(robot, res, switchBoard, className, classParameter, latestEntities, possibleValues) {
	return new Promise(function(resolve, reject) {

		// Get set of up to 10 of the best fuzzy matches (within the set of entities) to the possible values
		let fuzzyMatcher = new FuzzyMatcher(robot);
		let bestMatches = fuzzyMatcher.match(possibleValues, latestEntities || classParameter.values);
		robot.logger.debug(`${TAG}: doFuzzyMatch(): Best fuzzy matches for the ${getDisplayableClassParameter(className, classParameter)} parameter have been found; best matches = [${bestMatches}]; prompting user to choose one.`);
		if (bestMatches && bestMatches.length > 0) {

			// Build prompt with choices to present to user for selection
			let bestMatchesString = '';
			let i = 0;
			for (i = 0; i < bestMatches.length; i++) {
				let fuzzyString = i18n.__('fuzzy.result.item', i + 1, bestMatches[i]) + '\n';
				bestMatchesString += fuzzyString;
			}
			bestMatchesString += i18n.__('fuzzy.result.item', i + 1, i18n.__('fuzzy.result.none')) + '\n';
			let prompt = i18n.__('fuzzy.result', classParameter.title || classParameter.name, bestMatchesString);

			// Initiate conversation with user to obtain selection (by text, by number, or by 'none')
			utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then(function(dialogResult) {
				let reply = dialogResult.match[1].trim();
				robot.logger.debug(`${TAG}: doFuzzyMatch(): Dialog reply is: ${reply}`);
				let parameterValue;

				// Handle text selected
				if (isNaN(reply)) {

					// Handle none of the choices are wanted
					if (reply === 'none') {
						robot.logger.debug(`${TAG}: doFuzzyMatch(): User replied with none for the ${getDisplayableClassParameter(className, classParameter)} parameter; no items chosen from fuzzy match.`);
					}
					// See if one of the choices was entered
					else {
						// Search best matches for a match with entered choice
						let matchFound = false;
						for (let j = 0; j < bestMatches.length; j++) {
							if (reply === bestMatches[j]) {
								matchFound = true;
								break;
							}
						}
						// Handle one of the choices was entered
						if (matchFound) {
							parameterValue = reply;
						}
						// Handle an invalid choice was entered
						else {
							robot.logger.debug(`${TAG}: doFuzzyMatch(): User replied with invalid fuzzy match text ${reply} for the ${getDisplayableClassParameter(className, classParameter)} parameter; no items chosen from fuzzy match.`);
						}
					}
				}

				// Handle number selected
				else {
					let bestMatchIndex = parseInt(reply, 10);
					// Handle none of the choices are wanted
					if (bestMatchIndex === bestMatches.length + 1) {
						robot.logger.debug(`${TAG}: doFuzzyMatch(): User replied with number associated with none choice ${reply} for the ${getDisplayableClassParameter(className, classParameter)} parameter; no items chosen from fuzzy match.`);
					}
					else if (bestMatchIndex > 0 && bestMatchIndex <= bestMatches.length) {
						parameterValue = bestMatches[bestMatchIndex - 1];
					}
					else {
						robot.logger.debug(`${TAG}: doFuzzyMatch(): User replied with invalid fuzzy match number ${reply} for the ${getDisplayableClassParameter(className, classParameter)} parameter; no items chosen from fuzzy match.`);
					}
				}

				// Return the parameter value (or undefined)
				resolve(parameterValue);

			});
		}

		// No best matches returned; nothing to do
		else {
			robot.logger.debug(`${TAG}: doFuzzyMatch(): No best fuzzy matches found for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
			resolve();
		}

	});
}

/**
 * Make another attempt at getting the specific parameter value from the statement with
 * the latest/complete set of entities using a fuzzy/best match.
 * The processing for the given parameter includes:
 *  If fuzzy match is possible (keyword or latest/complete set of entities)
 *    Use fuzzy match with possible values against latest/complete set of entity values to obtain best matches.
 *    Use conversation to ask user to choose one of best matches (or none).
 *  Else if one and only one possible value, use it
 *  If no value yet, but value required
 *    Use conversation to ask user to enter value (phrase is allowable)
 *      Go through entity handler and fuzzy match processing again to find value
 *  If still no value, but value required
 *    Use conversation to ask user to enter just the value (no phrase).
 * The parameter value is returned (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {object} [The entityDecoder instance.]
 * @param {array of strings} latestEntities [The complete current list of entities for the parameter.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function doBestMatch(robot, res, switchBoard, statement, className, classParameter, entityDecoder, latestEntities) {
	return new Promise(function(resolve, reject) {

		// First use the latest statement and latest entities to see if the parameter value can be pulled from it
		entityHandler.getEntityValue(classParameter.type, statement, entityDecoder, latestEntities || classParameter.values).then(function(parameterValue) {

			// If found, we're done
			if (parameterValue) {
				robot.logger.debug(`${TAG}: doBestMatch(): Parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} has been found via entity handler; value = ${parameterValue}.`);
				resolve(parameterValue);
			}

			// If not found, continue with fuzzy match
			else {

				// Determine if the entity handler supports getting possible values.  If so, proceed to
				// either do a fuzzy match or find a single possible value.
				if (entityHandler.isPossibleValuesSupported(classParameter.type)) {

					// Obtain the set of possible values
					entityHandler.getPossibleValues(classParameter.type, statement, entityDecoder).then(function(possibleValues) {
						robot.logger.debug(`${TAG}: doBestMatch(): Possible values for parameters of type ${classParameter.type} within statement = ${statement} are [${possibleValues}].`);
						let possibleValueCount = (possibleValues ? possibleValues.length : 0);
						if (possibleValueCount > 0) {

							// Determine if doing a fuzzy match is feasible.
							if (isFuzzyMatchPossible(classParameter, latestEntities)) {
								robot.logger.debug(`${TAG}: doBestMatch(): Fuzzy match is supported for the ${getDisplayableClassParameter(className, classParameter)} parameter; starting fuzzy matching.`);

								doFuzzyMatch(robot, res, switchBoard, className, classParameter, latestEntities, possibleValues).then(function(parameterValue) {
									robot.logger.debug(`${TAG}: doBestMatch(): Fuzzy match processing complete for the ${getDisplayableClassParameter(className, classParameter)} parameter; parameter value = ${parameterValue}.`);
									resolve(parameterValue);
								}).catch(function(err) {
									reject(err);
								});

							}

							// If fuzzy match is not feasible then see if there is a possible value to return.
							else {
								robot.logger.debug(`${TAG}: doBestMatch(): Fuzzy match is not supported for the ${getDisplayableClassParameter(className, classParameter)} parameter; if one and only one possible value available, use it.`);

								if (possibleValueCount === 1) {
									robot.logger.debug(`${TAG}: doBestMatch(): There was ${possibleValueCount} possible value for the ${getDisplayableClassParameter(className, classParameter)} parameter so it will be used; parameter value = ${possibleValues[0]}.`);
									resolve(possibleValues[0]);
								}
								else {
									robot.logger.debug(`${TAG}: doBestMatch(): There were ${possibleValueCount} possible values so one best match was not possible to find for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
									resolve();
								}

							}

						}

						// No possible values returned; nothing to do
						else {
							robot.logger.debug(`${TAG}: doBestMatch(): There were ${possibleValueCount} possible values so a best value could not be obtained for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
							resolve();
						}

					}).catch(function(err) {
						reject(err);
					});

				}

				// Nothing that can be done without possible values
				else {
					robot.logger.debug(`${TAG}: doBestMatch(): Parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} has not been found; retrieval of possible matches is not supported for the parameter so we're done.`);
					resolve();
				}

			}

		}).catch(function(err) {
			reject(err);
		});

	});
}

/**
 * Initiate conversation get the parameter value and just the parameter value.
 * The parameter value is returned.
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function doAskForJustValue(robot, res, switchBoard, className, classParameter) {
	return new Promise(function(resolve, reject) {

		robot.logger.debug(`${TAG}: doAskForJustValue(): Prompting user to enter just the value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
		let prompt = i18n.__('cognitive.prompt.param.again', classParameter.title || classParameter.name);
		utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then(function(dialogResult) {
			let reply = dialogResult.match[1].trim();
			robot.logger.debug(`${TAG}: doAskForJustValue(): Dialog reply is: ${reply}`);
			if (reply === 'exit') {
				robot.logger.debug(`${TAG}: doAskForJustValue(): User exited with no value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
				resolve();
			}
			else {
				resolve(reply);
			}
		});

	});
}

/**
 * Last ditch effort to get the parameter value.
 * Initiate conversation with the user to enter the parameter value.
 * Attempt to pull the parameter value from the entered statement through the entity handler.
 * If a value cannot be cleanly obtained, initiate another conversation with the user to enter just
 * the parameter value and no other text.
 * The parameter value is returned.

 * Attempts to pull parameter value from the given statement for the specified class parameter.
 * The class to use is derived from the natural language processing.
 * The processing for the given parameter includes:
 *  Use conversation to ask user to enter value (phrase is allowable)
 *  If single word entered, return it
 *  Otherwise go through entity/fuzzy match processing again as follows:
 *    If fuzzy match is possible (keyword or latest/complete set of entities)
 *      Use fuzzy match with possible values against latest/complete set of entity values to obtain best matches.
 *      Use conversation to ask user to choose one of best matches (or none).
 *    Else if one and only one possible value, use it
 *    If no value yet, but value required
 *  If still no value, but value required
 *    Use conversation to ask user to enter just the value (no phrase).
 * The parameter value is returned (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {object} [The entityDecoder instance.]
 * @param {array of strings} latestEntities [The complete current list of entities for the parameter.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function doAskForValue(robot, res, switchBoard, statement, className, classParameter, entityDecoder, latestEntities) {
	return new Promise(function(resolve, reject) {

		robot.logger.debug(`${TAG}: doAskForValue(): Prompting user to enter the value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
		let prompt = classParameter.prompt || i18n.__('cognitive.prompt.param', classParameter.title || classParameter.name);
		utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then(function(dialogResult) {
			let reply = dialogResult.match[1].trim();
			robot.logger.debug(`${TAG}: doAskForValue(): Dialog reply is: ${reply}`);

			// If user wants out ('exit')
			if (reply === 'exit') {
				robot.logger.debug(`${TAG}: doAskForValue(): User exited with no value for the ${getDisplayableClassParameter(className, classParameter)} parameter.`);
				resolve();
			}

			// User replied with a single word; use it
			else if (reply.indexOf(' ') < 0){
				resolve(reply);
			}

			// Handle wildcard specially ... just return what user entered on this line
			else if (classParameter.type === 'wildcard'){
				resolve(reply);
			}

			// User replied with multiple words; use nlc/fuzzy match to see if we can figure it out
			else {

				// Use nlc/fuzzy match to get parameter value from statement
				robot.logger.debug(`${TAG}: doAskForValue(): Looking for best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${reply}.`);
				let replyEntityDecoder = entityDecoder.clone(reply);
				doBestMatch(robot, res, switchBoard, reply, className, classParameter, replyEntityDecoder, latestEntities || classParameter.values).then(function(parameterValue) {

					// If value found, use it
					if (parameterValue) {
						robot.logger.debug(`${TAG}: doAskForValue(): Best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${reply} has been found; value = ${parameterValue}.`);
						resolve(parameterValue);
					}

					// If value not found, ask user to entity just parameter value; nothing else
					else {
						robot.logger.debug(`${TAG}: doAskForValue(): No best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${reply} was found; since the parameter is required, we will ask user for just the value.`);
						doAskForJustValue(robot, res, switchBoard, className, classParameter).then(function(parameterValue) {
							robot.logger.debug(`${TAG}: doAskForValue(): Parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} has been retrieved from user; value = ${parameterValue}.`);
							resolve(parameterValue);
						});
					}

				}).catch(function(err) {
					reject(err);
				});

			}

		}).catch(function(err) {
			reject(err);
		});

	});
}

/**
 * Attempts to pull parameter value from the given statement for the specified class parameter.
 * The class to use is derived from the natural language processing.
 * The processing for the given parameter includes:
 *  If supported, obtaining the latest/complete set of entity values via entity function.
 *  Invoke entity handler again, but now with the latest/complete set of entity values.
 *  Invoke entity handler to obtain set of possible values
 *  If fuzzy match is possible (keyword or latest/complete set of entities)
 *    Use fuzzy match with possible values against latest/complete set of entity values to obtain best matches.
 *    Use conversation to ask user to choose one of best matches (or none).
 *  Else if one and only one possible value, use it
 *  If no value yet, but value required
 *    Use conversation to ask user to enter value (phrase is allowable)
 *      Go through entity handler and fuzzy match processing again to find value
 *  If still no value, but value required
 *    Use conversation to ask user to enter just the value (no phrase).
 * The parameter value is returned (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {map} classParameter [The class parameter definition for the class parameter being processed.]
 * @param {object} [The entityDecoder instance.]
 * @param {map} parameters [A map of parameter name -> parameter value.]
 * @return {promise: string} [The parameter value via Promise.resolve().]
 */
function processStatementForParameter(robot, res, switchBoard, statement, className, classParameter, entityDecoder, parameters) {
	return new Promise(function(resolve, reject) {
		robot.logger.debug(`${TAG}: processStatementForParameter(): Looking for parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement}.`);
		let latestEntities;

		// Request the latest, most complete set of entity values from the application
		getLatestEntities(robot, res, className, classParameter, parameters).then(function(entityList) {
			robot.logger.debug(`${TAG}: processStatementForParameter(): Latest / complete set of entities = ${entityList}; starting best match processing.`);

			// With the latest, most complete set of entity values try to abstract the parameter value again
			latestEntities = entityList;
			doBestMatch(robot, res, switchBoard, statement, className, classParameter, entityDecoder, latestEntities).then(function(parameterValue) {

				// If the parameter value was found in the statement, we're done
				if (parameterValue) {
					robot.logger.debug(`${TAG}: processStatementForParameter(): Best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} has been found; value = ${parameterValue}.`);
					resolve(parameterValue);
				}

				// If the parameter value could not be pulled from the statement using a fuzzy match
				// and the value is required, then ask the user for it.
				// First, allow them to enter nlc text.  If that doesn't work, ask for just the value.
				else if (classParameter.required === undefined || classParameter.required === true) {
					robot.logger.debug(`${TAG}: processStatementForParameter(): No best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} was found; since the parameter is required, we will ask user for value.`);
					doAskForValue(robot, res, switchBoard, statement, className, classParameter, entityDecoder, latestEntities).then(function(parameterValue) {
						robot.logger.debug(`${TAG}: processStatementForParameter(): Parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} has been retrieved from user; value = ${parameterValue}.`);
						resolve(parameterValue);
					}).catch(function(err) {
						reject(err);
					});
				}

				// If the value is not obtained and is not required, just return with no value
				else {
					robot.logger.debug(`${TAG}: processStatementForParameter(): No best match parameter value for the ${getDisplayableClassParameter(className, classParameter)} parameter within the statement = ${statement} was found; since the parameter is not required, we're done.`);
					resolve();
				}

			}).catch(function(err) {
				reject(err);
			});

		}).catch(function(err) {
			reject(err);
		});

	});
}


/* ---------------------------- Root-level functions ------------------ */

/**
 * This function is invoked if the parsing parameter function is disabled.
 * For each parameter, a conversation is initiated with the user to have them enter
 * in just the parameter value.
 * An object is returned specifying a value for each parameter (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} className [The name of the class being processed.]
 * @param {array of maps} classParameters [The class parameters defined for the class being processed.]
 * @return {promise: map} [A map of parameter name -> parameter value via Promise.resolve().]
 */
function promptEachParameterValue(robot, res, switchBoard, className, classParameters) {
	return new Promise(function(resolve, reject) {

		let parameters = {};

		// Attempt to extract each of the parameter values.
		let prom = Promise.resolve();
		return classParameters.reduce(function(p, classParameter) {
			return p.then(function() {
				return doAskForJustValueNoParsing(robot, res, switchBoard, className, classParameter);
			}).then(function(parameterValue) {
				if (parameterValue) parameters[classParameter.name] = parameterValue;
			});
		}, prom).then(function() {
			resolve(parameters);
		}).catch(function(err) {
			reject(err);
		});

	});
}

/**
 * Attempts to pull parameter values from the given statement for parameters specified in the given class'
 * definition.  The class to use is derived from the natural language processing.
 * For each required parameter (specified in the class' definition), an entityHandler for the parameter's type is
 * found and invoked to obtain a parameter value.  On the invocation to each entityHandler, an EntityDecoder instance is
 * provided.  This decoder can be used by the entityHandler to obtain tokens, partsOfSpeech, and/or entities from
 * the statement using various services.  The statement is first modified to remove all previously found parameter values.
 * An object is returned specifying a value for each parameter (if a value is found).
 *
 * This method is recursive.  If some, but not all, parameters had values found in this pass, then this method
 * is invoked recursively to make another pass (with parameter values removed from statement again).
 * Otherwise the promise is resolved with the current map of parameter values.
 *
 * @param {object} robot [The bot instance.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {array of maps} classParameters [The class parameters defined for the class being processed.]
 * @param {object} [The entityDecoder instance.]
 * @param {map} parameters [A map of parameter name -> parameter value.]
 * @return {promise: map} [A map of parameter name -> parameter value via Promise.resolve().]
 */
function processStatementPhase1(robot, statement, className, classParameters, entityDecoder, parameters) {
	return new Promise(function(resolve, reject) {

		// Current number of parameter values found
		let numParameterValues = Object.keys(parameters).length;

		// Determine if any parameter values are missing.
		// If so, queue function to extract parameter value.
		let missingClassParameters = [];
		for (let i = 0; i < classParameters.length; i++) {
			let classParameter = classParameters[i];
			if (!parameters[classParameter.name]) {
				missingClassParameters.push(classParameter);
			}
		}

		// If there are any missing parameter values, then attempt to extract them
		if (missingClassParameters.length > 0) {

			// Remove any parameters found on the previous pass from the statement and create a new decoder.
			let modStatement = removeParameterValuesFromStatement(statement, parameters);
			entityDecoder.modifyStatement(modStatement);
			robot.logger.debug(`${TAG}: processStatementPhase1(): Statement with parameter values removed = ${modStatement}.`);

			// Create array of entity handler promises to execute
			let entityHandlers = [];
			for (let j = 0; j < missingClassParameters.length; j++) {
				let missingClassParameter = missingClassParameters[j];
				entityHandlers.push(entityHandler.getEntityValue(missingClassParameter.type, modStatement, entityDecoder, missingClassParameter.values || []));
			}

			// Invoke all entity handlers in parallel
			Promise.all(entityHandlers).then(function(results) {
				robot.logger.debug(`${TAG}: processStatementPhase1(): Results of this iteration of Phase 1 processing = ${JSON.stringify(results)}.`);

				// Gather all the resulting parameter values into the given parameters map
				for (let k = 0; k < results.length; k++) {
					if (results[k]) parameters[classParameters[k].name] = results[k];
				}

				// If no new values were obtained on that pass or all values have been obtained, then return the parameters map.
				// If some new values were obtained but not all, then map another pass.
				let newNumParameterValues = Object.keys(parameters).length;
				if (newNumParameterValues <= numParameterValues || newNumParameterValues === classParameters.length) {
					resolve(parameters);
				}
				else {
					robot.logger.debug(`${TAG}: processStatementPhase1(): Making another pass for statement = ${statement} and parameters = ${parameters} since we were able to find ${newNumParameterValues - numParameterValues} new parameter values on the last pass.`);
					processStatementPhase1(robot, statement, className, classParameters, entityDecoder, parameters).then(function(parameters) {
						resolve(parameters);
					}).catch(function(err) {
						reject(err);
					});
				}

			}).catch(function(err) {
				reject(err);
			});

		}

		// If no missing parameter values ... we're done.
		else {
			robot.logger.debug(`${TAG}: processStatementPhase1(): No missing parameter values; nothing to do.`);
			resolve(parameters);
		}

	});

}

/**
 * Attempts to pull parameter values from the given statement for parameters specified in the given class'
 * definition.  The class to use is derived from the natural language processing.
 * This phase performs various attempts to obtain a parameter value for each parameter without
 * a parameter value yet (in the order that they are defined in the class defition).
 * The processing for each parameter includes:
 *  If supported, obtaining the latest/complete set of entity values via entity function.
 *  Invoke entity handler again, but now with the latest/complete set of entity values.
 *  Invoke entity handler to obtain set of possible values
 *  If fuzzy match is possible (keyword or latest/complete set of entities)
 *    Use fuzzy match with possible values against latest/complete set of entity values to obtain best matches.
 *    Use conversation to ask user to choose one of best matches (or none).
 *  Else if one and only one possible value, use it
 *  If no value yet, but value required
 *    Use conversation to ask user to enter value (phrase is allowable)
 *      Go through entity handler and fuzzy match processing again to find value
 *  If still no value, but value required
 *    Use conversation to ask user to enter just the value (no phrase).
 * An object is returned specifying a value for each parameter (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {object} switchBoard [The hubot coversation swithboard to use.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {array of maps} classParameters [The class parameters defined for the class being processed.]
 * @param {object} [The entityDecoder instance.]
 * @param {map} parameters [A map of parameter name -> parameter value.]
 * @return {promise: map} [A map of parameter name -> parameter value via Promise.resolve().]
 */
function processStatementPhase2(robot, res, switchBoard, statement, className, classParameters, entityDecoder, parameters) {
	return new Promise(function(resolve, reject) {

		// Determine if any parameter values are missing.
		// If so, queue function to extract parameter value.
		let missingClassParameters = [];
		for (let i = 0; i < classParameters.length; i++) {
			let classParameter = classParameters[i];
			if (!parameters[classParameter.name]) {
				missingClassParameters.push(classParameter);
			}
		}

		// If there are missing parameter values, then attempt to extract the values.
		if (missingClassParameters.length > 0) {

			// Modify the statement being used by removing all parameter values.
			let modStatement = removeParameterValuesFromStatement(statement, parameters);
			entityDecoder.modifyStatement(modStatement);
			robot.logger.debug(`${TAG}: processStatementPhase2(): Statement with parameter values removed = ${modStatement}.`);

			// Process each parameter individually until a value is obtained or never will be
			let prom = Promise.resolve();
			return missingClassParameters.reduce(function(p, missingClassParameter) {
				return p.then(function() {
					return processStatementForParameter(robot, res, switchBoard, modStatement, className, missingClassParameter, entityDecoder, parameters);
				}).then(function(missingValue) {
					if (missingValue) {
						parameters[missingClassParameter.name] = missingValue;
						modStatement = modStatement.replace(missingValue, '');
						entityDecoder.modifyStatement(modStatement);
						robot.logger.debug(`${TAG}: processStatementPhase2(): Statement with new parameter value [${missingValue}] removed = ${modStatement}.`);
					}
					else if (missingClassParameter.required === undefined || missingClassParameter.required === true) {
						robot.logger.debug(`${TAG}: processStatementPhase2(): Unable to obtain a value for the required parameter ${getDisplayableClassParameter(className, missingClassParameter)}`);
					}
				});
			}, prom).then(function() {
				resolve(parameters);
			}).catch(function(err) {
				reject(err);
			});
		}

		// If no missing parameter values ... we're done.
		else {
			robot.logger.debug(`${TAG}: processStatementPhase2(): No missing parameter values; nothing to do.`);
			resolve(parameters);
		}

	});
}


/* ---------------------------- Exported functions ------------------ */

/**
 * Attempts to pull parameter values from the given statement for parameters specified in the given class'
 * definition.  The class to use is derived from the natural language processing.
 * For each required parameter (specified in the class' definition), a entityHandler for the parameter's type is
 * found and invoked to obtain a parameter value.  On the invocation to each entityHandler, an EntityDecoder instance is
 * provided.  This decoder can be used by the entityHandler to obtain tokens, partsOfSpeech, and/or entities from
 * the statement using various services.
 * The processing to find parameter values goes through two phases:
 * 1) The first phase process each parameter currently without a value against a statement.  On the first pass, the
 * statement is the given statement.  On subsequent passes, the statement is modified to remove all found parameter values.
 * On each pass, the entity handler for each parameter without a value is invoked to attempt to obtain a value.
 * Passes continue until all parameters have a value or no values were found on the last pass.
 * 2) The second phase processes each parameter in order of definition.  If the parameter definition has a getEntityList()
 * function, then the function is invoked to get a current/complete set of entities for the parameter.  The entity
 * handler for the parameter is invoked to attempt to get a value.  If this is not successful, then the entity handler is
 * invoked to obtain a set of terms to use in a fuzzy search.  If terms are return, the a fuzzy search is performed and
 * a conversation is opened to allow the user to select one of the items.  If no selection is made, then a conversation is
 * opened to ask the user to enter the parameter value again.
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {array of maps} classParameters [The class parameters defined for the class being processed.]
 * @return {Promise: map} [A map of parameter name -> parameter value via Promise.resolve().]
 */
EntityManager.prototype.getEntities = function(robot, res, statement, className, classParameters) {
	let self = this;
	return new Promise(function(resolve, reject) {
		robot.logger.debug(`${TAG}: getEntities() invoked with statement = ${statement}; className = ${className}; classParameters = ${JSON.stringify(classParameters)}.`);

		// If the EntityManager is disabled, then prompt for each parameter value
		if (env.isTrue(env.entityParsingDisabled)) {
			robot.logger.debug(`${TAG}: getEntities(): Parameter parsing feature is disabled; asking user to enter each required parameter value.`);
			promptEachParameterValue(robot, res, self.switchBoard, className, classParameters).then(function(parameters) {
				robot.logger.debug(`${TAG}: getEntities(): Prompted parameter values = ${parameters}.`);
				resolve(parameters);
			}).catch(function(err) {
				reject(err);
			});
		}

		// If there are any parameter values to be obtained; obtain them
		else if (classParameters && classParameters.length > 0) {
			let entityDecoder;

			// Obtain the set of seeded text strings associated with the class (used by EntityDecoder)
			getTextsByClass(className).then(function(textsForClass) {
				robot.logger.debug(`${TAG}: getEntities(): textsForClass = ${textsForClass}; starting Phase 1.`);
				entityDecoder = new EntityDecoder(robot, statement, self.alchemy, textsForClass);
				return processStatementPhase1(robot, statement, className, classParameters, entityDecoder, {});
			}).then(function(parameters) {
				robot.logger.debug(`${TAG}: getEntities(): Phase 1 parameter values = ${parameters}; starting Phase 2.`);
				return processStatementPhase2(robot, res, self.switchBoard, statement, className, classParameters, entityDecoder, parameters);
			}).then(function(parameters) {
				robot.logger.debug(`${TAG}: getEntities(): Phase 2 complete.  Returning parameter values = ${parameters} for statement = ${statement}; className = ${className}; classParameters = ${JSON.stringify(classParameters)}.`);
				resolve(parameters);
			}).catch(function(err) {
				robot.logger.error(`${TAG}: getEntities(): Exiting with error = ${err}.`);
				reject(err);
			});

		}

		// If no parameters associated with class ... we're done.
		else {
			robot.logger.debug(`${TAG}: getEntities(): No parameters defined; nothing to do.`);
			resolve({});
		}

	});
};

/**
 * Attempts to pull parameter value from the given statement.  This can be used by an
 * application script Regex processing for an optional parameter to use fuzzy matching
 * to obtain the best value to use.
 * The processing for the given parameter includes:
 *  If supported, obtaining the latest/complete set of entity values via entity function.
 *  Invoke entity handler again, but now with the latest/complete set of entity values.
 *  Invoke entity handler to obtain set of possible values
 *  If fuzzy match is possible (keyword or latest/complete set of entities)
 *    Use fuzzy match with possible values against latest/complete set of entity values to obtain best matches.
 *    Use conversation to ask user to choose one of best matches (or none).
 *  Else if one and only one possible value, use it
 *  If no value yet, but value required
 *    Use conversation to ask user to enter value (phrase is allowable)
 *      Go through entity handler and fuzzy match processing again to find value
 *  If still no value, but value required
 *    Use conversation to ask user to enter just the value (no phrase).
 * The parameter value is returned in the given parameter map (if a value is found).
 *
 * @param {object} robot [The bot instance.]
 * @param {object} res [The bot response object.]
 * @param {string} statement [The statement to process (containing the parameter values).]
 * @param {string} className [The name of the class being processed.]
 * @param {string} parameterName [The name of the parameter being processed.]
 * @param {map} parameters [A map of current parameter values as parameter name -> parameter value.]
 * @return {Promise: map} [A map of parameter name -> parameter value via Promise.resolve().]
 */
EntityManager.prototype.getEntity = function(robot, res, statement, className, parameterName, parameters) {
	let self = this;
	return new Promise(function(resolve, reject) {
		robot.logger.debug(`${TAG}: getEntity() invoked with statement = ${statement}; className = ${className}; parameterName = ${parameterName}; parameters = ${JSON.stringify(parameters)}.`);

		// Call emit target if specified with parameter values
		nlcconfig.getClassEmitTarget(className).then(function(tgt) {
			let classParameter;
			if (tgt && tgt.parameters) {
				for (let i = 0; i < tgt.parameters.length; i++) {
					if (tgt.parameters[i].name === parameterName) {
						classParameter = tgt.parameters[i];
						break;
					}
				}
			}
			if (classParameter) {

				// If the EntityManager is disabled, then prompt for each parameter value
				if (env.isTrue(env.entityParsingDisabled)) {
					robot.logger.debug(`${TAG}: getEntity(): Parameter parsing feature is disabled; asking user to enter each required parameter value.`);

					// Attempt to extract the parameter value.
					doAskForJustValueNoParsing(robot, res, self.switchBoard, className, classParameter).then(function(parameterValue) {
						robot.logger.debug(`${TAG}: getEntity(): parameterValue = ${parameterValue}.`);
						if (parameterValue) parameters[classParameter.name] = parameterValue;
						robot.logger.debug(`${TAG}: getEntity(): Returning parameter values = ${parameters} for statement = ${statement}; className = ${className}; parameterName = ${parameterName}; classParameter = ${JSON.stringify(classParameter)}.`);
						resolve(parameters);
					}).catch(function(err) {
						robot.logger.error(`${TAG}: getEntity(): Exiting with error = ${err}.`);
						reject(err);
					});
				}

				// Use nlc/fuzzy match processing to obtain parameter value
				else {

					getTextsByClass(className).then(function(textsForClass) {

						// Create an entity decoder based on the given information
						let entityDecoder = new EntityDecoder(robot, statement, self.alchemy, textsForClass);

						// Invoke function to find a value for the parameter
						processStatementForParameter(robot, res, self.switchBoard, statement, className, classParameter, entityDecoder, parameters).then(function(parameterValue) {
							robot.logger.debug(`${TAG}: getEntity(): parameterValue = ${parameterValue}.`);
							if (parameterValue) parameters[parameterName] = parameterValue;
							robot.logger.debug(`${TAG}: getEntity(): Returning parameter values = ${parameters} for statement = ${statement}; className = ${className}; parameterName = ${parameterName}; classParameter = ${JSON.stringify(classParameter)}.`);
							resolve(parameters);
						}).catch(function(err) {
							robot.logger.error(`${TAG}: getEntity(): Exiting with error = ${err}.`);
							reject(err);
						});

					}).catch(function(err) {
						robot.logger.error(`${TAG}: getEntity(): Exiting with error = ${err}.`);
						reject(err);
					});

				}

			}
			else {
				robot.logger.error(`${TAG}: getEntity(): Exiting with error = The ${parameterName} parameter definition within ${className} could not be found.`);
				reject(new Error(`${TAG}: The ${parameterName} parameter definition within ${className} could not be found.`));
			}
		}).catch(function(err) {
			robot.logger.error(`${TAG}: getEntity(): Exiting with error = ${err}.`);
			reject(err);
		});

	});
};

module.exports = EntityManager;
