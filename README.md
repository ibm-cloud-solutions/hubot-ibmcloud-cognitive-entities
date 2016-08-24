[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities)
[![Coverage Status](https://coveralls.io/repos/github/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities/badge.svg?branch=master)](https://coveralls.io/github/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities?branch=master)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities)
[![npm](https://img.shields.io/npm/v/hubot-ibmcloud-cognitive-entities.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-ibmcloud-cognitive-entities)

# hubot-ibmcloud-cognitive-entities

Provides a function used by the Natural Language processing that attempts to extract entity values from a statement entered by the user.  The Natural Language processing determines the class that best matches the statement.  Once this is done, the parameter configuration associated with that class is used to extract entity values from the statement.

## Getting Started
 * [Installation](#installation)		
 * [Overview](#overview)		
 * [Entity Extraction Integration](#nlc-json-configuration-file)
 * [License](#license)		
 * [Contribute](#contribute)

## Installation

In your npm project:

Either run:

`npm install hubot-ibmcloud-cognitive-entities --save`

or add the following line to your package.json's dependencies:

`"hubot-ibmcloud-cognitive-entities": "*"`

## Overview

In general, Watson's Natural Language Classifier maps a statement to a class that best matches it.  The classifier is seeded with classes and various statements that can be associated with each class.

Once the class has been determined, the entity values needed by that class are extracted from the statement by this package.  For instance, if the statement is `I want the weather for Chicago` then the city (Chicago) is pulled from the statement.

Various facilities are used to extract entity values from the statement.  The Watson Alchemy API is used to find city names for the weather commands.  A parts-of-speech parser is used to find nouns and numbers within a statement for extraction of entities, keywords, and numbers.  Regular expressions are used to find some entity values such as those related to repositories.

If entity values cannot be extracted with confidence on the first pass, then a fuzzy match may be deployed.  The fuzzy match requires either a parameter of type _keyword_ or a parameter of type _entity_ with an _entityfunction_ field defined.  

The _entityfunction_ field specifies a function that will be invoked to obtain the latest/complete set of entities for this parameter.  The associated implementation will need to also issue a command to register the function itself.  The entity function is namespaced with the `name` (denoted `n1`) at the root of the JSON structure. To register the global entity function (say, 'entfunc1') at runtime, add a statement similar to the following:

	nlcconfig.setGlobalEntityFunction('n1_entfunc1, function(parameterName, parameters) {
		return new Promise(function(resolve, reject) {
			... obtain full list of entities
			resolve(full-list-of-entities);
		});
	});

Note that the function must return a Promise since there will often be a delay obtaining the entities.

The fuzzy matching takes a list of possible nouns from the statement and matches them against the full set of entities or keyword values to determine possible best matches.  If one or more match is found, a conversation with the user is initiated asking them to choose one.

If the user does not choose one and the parameter is required, then conversations with the user are initiated asking them to enter the entity value.

The processing has two phases:

1. For all parameter definitions for a class, determine if an entity value can be reliably obtained using just the parameter definition, the statement, and any currently known entity values (set using `nlcconfig.updateGlobalParameterValues()).

2. For each required parameter without a value from the first phase, in the order in which they are defined, use the following techniques to make a best guess at the entity value:

  1. If an _entityfunction_ field is specified for a parameter of type _entity_, then the associated registered function is invoked to get the latest, complete set of entity values.  If the parameter is of type _keyword_, then it should already have the full set of values.  Parameters of other types do not have a known list of possibilities.

  2. If there is a complete list of possibilities, then using unknown nouns in the statement make an attempt to fuzzy match against the complete list of possibilities.  If some best matches are found, then present a list of the best matches to the user in a bot conversation to see if they intended one of the choices.  If so, the matching value is used.

  3. If the fuzzy match did not yield results, use a bot conversation to ask the user to enter the parameter value.  The user's response can still be via natural language.  So the response is used to find a value and that is not successful, another fuzzy match is performed.

  4. If a parameter value is still not found, use a bot conversation to ask the user to enter just the parameter value (no natural language).

  5. If in step ii there is not a complete list of possibilities, then a fuzzy match cannot be reliable performed.  In this case, if there is only one possibility then it will be assumed to be the parameter value.

## Entity Extraction Integration

To integrate entity extraction functionality in your Hubot

1. Add dependencies to `package.json`.
	``` json
	dependencies: {
		"hubot-ibmcloud-cognitive-entities": ">=0.0.2"
	},
	devDependencies: {
		"hubot-ibmcloud-auth": ">=0.0.8",
		"hubot-ibmcloud-cognitive-lib": ">=0.0.37",
		"hubot-ibmcloud-nlc": ">=0.0.32"
	}
	```

1. Include these scripts in your bot's `external-scripts.json`.
	``` json
	[
	"hubot-ibmcloud-auth",
	"hubot-ibmcloud-nlc"
	]
	```

1. Authorize your user ID to access the commands.

	For more details, see the documentation for `hubot-ibmcloud-auth`
	```
	HUBOT_IBMCLOUD_POWERUSERS=<comma-separated list of power-user emails -- no spaces!>
	HUBOT_IBMCLOUD_READERUSERS=<comma-separated list of reader-user emails -- no spaces!>
	HUBOT_IBMCLOUD_AUTHENTICATION_DISABLED=<only if desired, disables authentication and authorization if true)>
	```

1. (Optional) If it is desired to use weather commands (city entity extraction), create a Bluemix Watson Alchemy API service and set the following environment variables with your credentials.

	```
	HUBOT_WATSON_ALCHEMY_URL=<API URL for Watson Alchemy API>
	HUBOT_WATSON_ALCHEMY_APIKEY=<API key for Watson Alchemy API>
	HUBOT_WATSON_ALCHEMY_DATASET=(Optional) Name of dataset to use>
	```

1. (Optional) If it is desired to modify the fuzzy match behavior, the following optional environment variables can be set with new values.

	```
	FUZZY_MATCH_THRESHOLD=<Specifies the fuzzy match threshold (between 0.0 (perfect match) and 1.0, default 0.6>
	FUZZY_MATCH_LOCATION=<Specifies the fuzzy match approximate location within text (default 0)>
	FUZZY_MATCH_DISTANCE=<Specifies the fuzzy match distance from location (default 100)>
	FUZZY_MATCH_DISTANCE_FROM_BEST=<Specifies the distance from best match score for other allowable matches (between 0.0 and 1.0, default 0.5>
	FUZZY_MATCH_MAX_ITEMS=<Specifies maximum fuzzy matches returned (default 10)>
	```

1. Create a Natural Language classification / parameter definition file.
	- For detailed information about the contents of this file see the documentation on [hubot-ibmcloud-cognitive-lib](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-cognitive-lib/blob/master/README.md)
	- The file should be added at `<project>/src/nlc/NLC.json`.
	- Sample portion of NLC.json for a cloudant bot.
	``` json
	{   
		"name": "IBMcloudCloudant",
		"version": "1.0",
		"classes": [
	  		{
		  		"class": "bluemix.cloudant.runview",
		  		"emittarget": "bluemix.cloudant.runview",
		  		"texts": [
		  			"Run a cloudant database view",
					"I'd like to execute a view against my cloudant database",
					"cloudant view run",
					"I want to execute a view"
	  			],
		       "parameters" : [
				   {
				       "name": "databasename",
				       "title": "database name",
				       "type": "entity",
				       "prompt": "OK. What is the name of the database you want to run the view against?",
				       "entityfunction": "funcdatabasename"
				   },
				   {
				       "name": "viewname",
				       "title": "database view name",
				       "type": "entity",
				       "prompt": "OK. What is the name of the view you want to run?",
				       "entityfunction": "funcviewname"
				   }
		       ]
	  		}
		]
	}
	```

1. Add code to register the entity functions.

	```		
	nlcconfig.setGlobalEntityFunction('IBMcloudCloudant_funcdatabasename', function(parameterName, parameters {
		return new Promise(function(resolve, reject) {	// Always return a Promise

			... logic to get array of database names

			// Refresh set of global database names to improve further entity extraction attempts
			nlcconfig.updateGlobalParameterValues(IBMcloudCloudant_databasename, array-of-database-names);

			// Return the array of the complete/latest set of database names
			resolve(array-of-database-names);
			
		});
	}));

	nlcconfig.setGlobalEntityFunction('IBMcloudCloudant_funcviewname', function(parameterName, parameters {
		return new Promise(function(resolve, reject) {	// Always return a Promise
			if (parameters.databasename) {		// Get the database name that has been extracted first

				... logic to get array of view names based on database name

				// Since the view names depend on the database name used, it does not help to
				// set them in a set of global view names.

				// Return the array of complete/latest set of view names for the given database name
				resolve(array-of-view-names);

			}
			else {		// Database name missing
				reject(new Error('Unable to get view names for a database because the database name has not been set'));
			}
		});
	}));
	```

1. (Optional) If needed, the entity extraction function can be disabled.  If disabled, a conversation with the user is used to obtain all required entity values.

	```
	ENTITY_PARSING_DISABLED=true
	```

## License

See [LICENSE.txt](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities/blob/master/LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-cognitive-entities/blob/master/CONTRIBUTING.md) for detailed information on how you can lend a hand.
