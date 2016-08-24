/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';


const ENTITY_TYPE = 'number';


/**
 * Return the entity type.
 */
exports.getEntityType = function() {
	return ENTITY_TYPE;
};

/**
 * Handle finding entity value in statement for entities of type 'number'.
 * The given entityDecoder is used to find any numbers. If one is found (but not more than one) then the
 * associated number is returned (as a string).
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

		// Obtain numbers from the entityDecoder.
		// If there is one (and only one) then return it.
		entityDecoder.getNumbers().then(function(numbers) {
			if (numbers && numbers.length === 1) {
				result = numbers[0];
			}
			resolve(result);
		}).catch(function(err) {
			reject(err);
		});

	});
};

