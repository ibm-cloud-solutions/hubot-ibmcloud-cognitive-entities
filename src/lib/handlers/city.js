/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';


const ENTITY_TYPE = 'city';


/**
 * Return the entity type.
 */
exports.getEntityType = function() {
	return ENTITY_TYPE;
};

/**
 * Handle finding entity value in statement for entities of type 'city'.
 * The given entityDecoder is used to find any entities of type 'City'. If one is found (but not more than one)
 * then the associated text value is returned.
 *
 * @param {string} statement [The statement being processed.]
 * @param {object} entityDecoder [The intance of the EntityDecoder to use to obtain nouns, numbers, or cities
 *        from the given statement.]
 * @param {array of strings} entityValues [An optional array of potential entity values to check (ignored).]
 * @return {promise with string} [A promise.  If successful the promise returns a entity value.]
 */
exports.getEntityValue = function(statement, entityDecoder, entityValues) {
	return new Promise(function(resolve, reject) {
		var result;

		// Obtain cities from the entityDecoder.
		// If there is one (and only one) then return it.
		entityDecoder.getCityEntities().then(function(cities) {
			if (cities && cities.length === 1) {
				result = cities[0];
			}
			resolve(result);
		}).catch(function(err) {
			reject(err);
		});

	});
};

/**
 * Handle finding entities in statement that could be used as a value for type 'city'.
 * The given entityDecoder is used to find all available cities in the given statement.
 * The array of cities available are returned.
 *
 * @param {string} statement [The statement being processed.]
 * @param {object} entityDecoder [The intance of the EntityDecoder to use to obtain nouns, numbers, or cities
 *        from the given statement.]
 * @return {promise with string} [A promise.  If successful the promise returns an array of possible values.]
 */
exports.getPossibleValues = function(statement, entityDecoder) {
	return new Promise(function(resolve, reject) {

		// Obtain cities from the entityDecoder.
		// If there is one (and only one) then return it.
		entityDecoder.getCityEntities().then(function(cities) {
			resolve(cities);
		}).catch(function(err) {
			reject(err);
		});

	});
};

