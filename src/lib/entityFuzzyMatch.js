/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

var path = require('path');
var TAG = path.basename(__filename);

const env = require('./env');
const Fuse = require('fuse.js');


const DISTANCE_FROM_BEST = env.numberValue(env.fuzzy_match_distance_from_best);
const MAX_ITEMS = env.numberValue(env.fuzzy_match_max_items);

/**
 * Handles decoding the given statement using various methods:
 *  - breaking down the statement into an array of 'words' (using salient)
 *  - breaking down the statement into parts-of-speech (using salient)
 *  - obtaining well-known entities (using Watson Alchemy)
 *
 * @param {object} robot [The bot instance.]
 * @param {string} inStatement [The statement to break down.]
 * @param {object} inAlchemy [An instance of watson alchemy to use to communicate with Watson alchemy service.]
 * @param {array of strings} inSeedTexts [An array of the text statements associated with class.]
 * @constructor
 */
function FuzzyMatcher(inRobot) {

	// Store statement and alchemy instance
	this.robot = inRobot;

	// Setup options to use
	this.options = {
		caseSensitive: false,
		include: ['score'],
		shouldSort: true,
		tokenize: true,
		threshold: env.numberValue(env.fuzzy_match_threshold),
		location: env.numberValue(env.fuzzy_match_location),
		distance: env.numberValue(env.fuzzy_match_distance),
		maxPatternLength: 32,
		keys: []
	};

}

/**
 * Merge the second array of matches into the first.
 * If an item is in both arrays set the score to the lowest score.
 *
 * @param {array of maps} allMatches [The full set of matches to merge into.]
 * @param {array of maps} newMatches [The new set of matches to merge into the full set.]
 * @param {array of maps} [The merged set of matches.]
 */
function merge(allMatches, newMatches) {
	if (allMatches.length > 0) {
		for (var i = 0; i < allMatches.length; i++) {
			let allMatch = allMatches[i];
			let newMatchIndex = -1;
			for (var j = 0; j < newMatches.length; j++) {
				let newMatch = newMatches[j];
				if (newMatch.item === allMatch.item) {
					newMatchIndex = j;
					if (newMatch.score < allMatch.score) allMatch.score = newMatch.score;
					break;
				}
			}
			if (newMatchIndex >= 0) {
				newMatches.splice(newMatchIndex, 1);
			}
		}
		allMatches = allMatches.concat(newMatches);
	}
	else {
		allMatches = allMatches.concat(newMatches);
	}
	return allMatches;
}

/**
 * Sort the given array by ascending score.
 *
 * @param {array of maps} allMatches [The full set of matches to sort.]
 * @param {array of maps} [The sorted set of matches.]
 */
function sort(allMatches) {
	var sortedMatches = allMatches.sort(function(match1, match2) {
		return match1.score - match2.score;
	});
	return sortedMatches;
}

/**
 * Returns the array of values from the given actualValues that
 * correspond to the given set of sorted matches.  Each match contains
 * a field('item') that contains the index of the item within the actualValues array.
 * Only items with a score within .5 of the best score are returned.
 *
 * @param {array of maps} allMatches [The full set of matches to sort.]
 * @param {array of strings} [The sorted set of best matching actual values.]
 */
function convert(allMatches, actualValues) {
	var bestValues = [];
	if (allMatches && allMatches.length > 0) {
		let bestScore = allMatches[0].score;
		allMatches.forEach(function(allMatch) {
			if (allMatch.score - bestScore <= DISTANCE_FROM_BEST) {
				if (allMatch.item < actualValues.length) {
					if (bestValues.length < MAX_ITEMS) {
						bestValues.push(actualValues[allMatch.item]);
					}
				}
			}
		});
	}
	return bestValues;
}

/**
 * Handles trying to find the best matches for each of the possible values
 * to all of the actual values.  The results of each possible value are
 * merged and the top results are returned.
 * The top result is returned and all results with a score within .5 of the
 * top result are returned.
 *
 * @param {array of strings} possibleValues [The possible values to match against the actual values.]
 * @param {array of strings} actualValues [The true values being matched against.]
 * @param {array of strings} [The best matches in order.]
 */
FuzzyMatcher.prototype.match = function(possibleValues, actualValues) {
	var bestMatches = [];

	if (possibleValues && actualValues) {
		var matchedItems = [];
		let fuse = new Fuse(actualValues, this.options);
		for (var i = 0; i < possibleValues.length; i++) {
			let result = fuse.search(possibleValues[i]);
			this.robot.logger.debug(`${TAG}: Best fuzzy matches for possible value [${possibleValues[i]}] against the actual values [${actualValues}] are [${JSON.stringify(result)}]`);
			matchedItems = merge(matchedItems, result);
		}
		matchedItems = sort(matchedItems);
		bestMatches = convert(matchedItems, actualValues);
	}

	this.robot.logger.debug(`${TAG}: Best fuzzy matches for possible values [${possibleValues}] against the actual values [${actualValues}] are [${bestMatches}]`);
	return bestMatches;
};

module.exports = FuzzyMatcher;
