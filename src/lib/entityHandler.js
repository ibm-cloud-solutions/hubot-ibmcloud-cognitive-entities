/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const fs = require('fs');
const path = require('path');

let entityTypeHandlers = {};


/**
 * Registers a entity type handler for the specified entity type.
 *
 * @param {string} entityType [Entity type being registered.]
 * @param {object} entityTypeHandler [Handler being registered.]
 */
function setEntityTypeHandler(entityType, entityTypeHandler) {
	entityTypeHandlers[entityType] = entityTypeHandler;
};

/**
 * Returns registered handler for specified entity type.
 *
 * @param {string} entityType [Entity type being requested.]
 * @return {object} [The handler corresponding to the given entity type.]
 */
function getEntityTypeHandler(entityType) {
	return entityTypeHandlers[entityType];
};

/**
 * Registers a entity type handler for the specified entity type.
 *
 * @param {string} entityType [Entity type being registered.]
 * @param {object} entityTypeHandler [Handler being registered.]
 */
exports.setEntityTypeHandler = setEntityTypeHandler;

/**
 * Returns registered handler for specified entity type.
 *
 * @param {string} entityType [Entity type being requested.]
 * @return {object} [The handler corresponding to the given entity type.]
 */
exports.getEntityTypeHandler = getEntityTypeHandler;

/**
 * Invoke the getEntityValue function on the entity type handler associated
 * with the given entity type with the given statement and entity values to
 * obtain the entity value.
 * A Promise is returned.  The resolve() method is invoked with the entity value.
 *
 * @param {string} entityType [Entity type.]
 * @param {string} statement [The statement to process against the entity.]
 * @param {object} entityDecoder [An instance of the EntityDecoder to used to obtain partsOfSpeech and entities.]
 * @param {array of strings} entityValues [An array of possible entity values.]
 * @return {promise: string} [The entity value via Promise.resolve().]
 */
exports.getEntityValue = function(entityType, statement, entityDecoder, entityValues) {
	return new Promise(function(resolve, reject) {

		let entityTypeHandler = getEntityTypeHandler(entityType);
		if (entityTypeHandler) {
			if (entityTypeHandler.getEntityValue) {
				entityTypeHandler.getEntityValue(statement, entityDecoder, entityValues).then(function(entityValue) {
					resolve(entityValue);
				}).catch(function(error) {
					reject(error);
				});
			}
			else {
				reject(new Error(`Unable to find getEntityValue() function to handle entity type ${entityType}`));
			}
		}
		else {
			reject(new Error(`Unable to find entity handler to handle entity type ${entityType}`));
		}

	});

};

/**
 * Returns true if the given entity type handler supports getting possible values
 * from a statement.
 * True/False is returned immediately; no promise.
 *
 * @param {string} entityType [Entity type.]
 * @return {boolean} True if getting possible values is supported.
 */
exports.isPossibleValuesSupported = function(entityType) {
	let entityTypeHandler = getEntityTypeHandler(entityType);
	let isSupported = false;
	if (entityTypeHandler) {
		if (entityTypeHandler.getPossibleValues) {
			isSupported = true;
		}
	}
	return isSupported;
};

/**
 * Invoke the getPossibleValues function on the entity type handler associated
 * with the given entity type with the given statement to
 * obtain strings that can be used as a possible value or in a fuzzy match.
 * This method is invoked if getEntityValue() did not return a value and
 * fuzzy search is an option.
 * A Promise is returned.  The resolve() method is invoked with the array of
 * possible values.
 *
 * @param {string} entityType [Entity type.]
 * @param {string} statement [The statement to process against the entity.]
 * @param {object} entityDecoder [An instance of the EntityDecoder to used to obtain partsOfSpeech and entities.]
 * @return {promise: array of strings} [The possible values via Promise.resolve().]
 */
exports.getPossibleValues = function(entityType, statement, entityDecoder) {
	return new Promise(function(resolve, reject) {

		let entityTypeHandler = getEntityTypeHandler(entityType);
		if (entityTypeHandler) {
			if (entityTypeHandler.getPossibleValues) {
				entityTypeHandler.getPossibleValues(statement, entityDecoder).then(function(possibleValues) {
					resolve(possibleValues);
				}).catch(function(error) {
					reject(error);
				});
			}
			else {
				resolve();
			}
		}
		else {
			reject(new Error(`Unable to getPossibleValues() function to handle entity type ${entityType}`));
		}

	});

};

function readHandlers() {
	const handlersPath = path.resolve(__dirname, 'handlers');
	fs.access(handlersPath, fs.R_OK, (err) => {
		if (!err) {
			fs.readdir(handlersPath, (err, files) => {
				if (!err) {
					// For each file, load it using require
					files.forEach(function(file) {
						let fullFile = path.join(handlersPath, file);
						let handler = require(fullFile);
						if (handler && handler.getEntityType) {
							setEntityTypeHandler(handler.getEntityType(), handler);
						}
					});
				}
			});
		}
	});
}

readHandlers();
