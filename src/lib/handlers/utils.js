/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';


/**
 * Returns true if the given search string is found in the given statement.
 *
 * @param {string} statement [The statement to search.]
 * @param {string} searchString [The string to attempt to find within the statement.]
 * @return true if found; false otherwise.
 */
exports.findStringInStatement = function(statement, searchString) {
	return (statement.indexOf(searchString) >= 0);
};
