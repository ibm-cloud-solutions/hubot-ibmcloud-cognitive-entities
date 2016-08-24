/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const settings = {
	alchemy_url: process.env.HUBOT_WATSON_ALCHEMY_URL,
	alchemy_apikey: process.env.HUBOT_WATSON_ALCHEMY_APIKEY,
	alchemy_dataset: process.env.HUBOT_WATSON_ALCHEMY_DATASET,
	entityParsingDisabled: process.env.ENTITY_PARSING_DISABLED || false,
	fuzzy_match_threshold: process.env.FUZZY_MATCH_THRESHOLD || 0.6,
	fuzzy_match_location: process.env.FUZZY_MATCH_LOCATION || 0,
	fuzzy_match_distance: process.env.FUZZY_MATCH_DISTANCE || 100,
	fuzzy_match_distance_from_best: process.env.FUZZY_MATCH_DISTANCE_FROM_BEST || 0.5,
	fuzzy_match_max_items: process.env.FUZZY_MATCH_MAX_ITEMS || 10
};

module.exports = settings;

module.exports.isTrue = function(val) {
	var retBool = false;
	if (val && (val === true || val === 'true' || val === 'TRUE' ||
		val === 'YES' || val === 'Y' || val === 'y')) {
		retBool = true;
	}
	return retBool;
};

module.exports.numberValue = function(val) {
	var retNumber = val;
	if (isNaN(val)) {
		try {
			retNumber = parseFloat(val);
		}
		catch (err) {
			retNumber = val;
		};
	};
	return retNumber;
};
