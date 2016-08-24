/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';


const ENTITY_TYPE = 'repourl';

const REGEX_REPOURL = /(.*)\s+(http[s]?:\/\/\S+)/i;


/**
 * Return the entity type.
 */
exports.getEntityType = function() {
	return ENTITY_TYPE;
};

/**
 * Handle finding entity value in statement for entities of type 'repourl'.
 * The given statment is processed against a regular expression.  If found, the matched value is returned
 * as the entity value.
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

		// First, use the given regular expression to find the URL
		// If found, return it.
		var matches = statement.match(REGEX_REPOURL);
		if (matches && matches.length > 1 && matches[2]) {
			result = matches[2];
		}

		resolve(result);

	});
};

