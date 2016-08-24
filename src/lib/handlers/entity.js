/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const utils = require('./utils');


const ENTITY_TYPE = 'entity';


/**
 * Return the entity type.
 */
exports.getEntityType = function() {
	return ENTITY_TYPE;
};

/**
 * Handle finding entity value in statement for entities of type 'entity'.
 * If the given entityValues are specified, then it is assumed that the desired entity is in the list.
 * If so, the matching entity is returned as the entity value.
 * If not, nothing is returned.
 * If the given entityValues are not specified, then it is assumed that a possible value will be searched
 * for in the given statement.  The given entityDecoder is used to find any nouns.  If one and only one is found,
 * then the associated text value is returned.  Otherwise, nothing is returned.
 *
 * @param {string} statement [The statement being processed.]
 * @param {object} entityDecoder [The intance of the EntityDecoder to use to obtain nouns, numbers, or cities
 *        from the given statement.]
 * @param {array of strings} entityValues [An optional array of potential entity values to check.]
 * @return {promise with string} [A promise.  If successful the promise returns a entity value.]
 */
exports.getEntityValue = function(statement, entityDecoder, entityValues) {
	return new Promise(function(resolve, reject) {
		var result;

		// First, look for one of the given entityValues in the given statement.
		// If found, return it.
		if (entityValues) {
			for (var i = 0; (i < entityValues.length && !result); i++) {
				if (utils.findStringInStatement(statement, entityValues[i])) {
					result = entityValues[i];
					break;
				}
			}
		}
		
		resolve(result);

	});
};

/**
 * Handle finding entities in statement that could be used as a value for type 'entity'.
 * The given entityDecoder is used to find all available nouns in the given statement.
 * The array of nouns available are returned.
 *
 * @param {string} statement [The statement being processed.]
 * @param {object} entityDecoder [The intance of the EntityDecoder to use to obtain nouns, numbers, or cities
 *        from the given statement.]
 * @return {promise with string} [A promise.  If successful the promise returns an array of possible values.]
 */
exports.getPossibleValues = function(statement, entityDecoder) {
	return new Promise(function(resolve, reject) {

		// Return all nouns found in statement
		entityDecoder.getNouns().then(function(nouns) {
			resolve(nouns);
		}).catch(function(err) {
			reject(err);
		});

	});
};

