/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const expect = require('chai').expect;
const Helper = require('hubot-test-helper');
const nlcconfig = require('hubot-ibmcloud-cognitive-lib').nlcconfig;
const nlcDb = require('hubot-ibmcloud-cognitive-lib').nlcDb;
const EntityManager = require('../index').entityManager;
const env = require('../src/lib/env');
const helper = new Helper('./scripts');
const mockAlchemy = require('./alchemy.mock');

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../src/messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

const COMP_NAME = 'TestComp';
const COMP_VERSION = '1.0';

const CLASS_PARAMETER_ENTITY = {
	_id: 'test.entity',
	emittarget: 'test.entity.target',
	description: 'Test entity description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?'
		}
	]
};

const CLASS_PARAMETER_ENTITY_F = {
	_id: 'test.entity.f',
	emittarget: 'test.entity.f.target',
	description: 'Test entity with function description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`
		}
	]
};

const CLASS_PARAMETER_ENTITY_R = {
	_id: 'test.entity.r',
	emittarget: 'test.entity.r.target',
	description: 'Test entity with required = false description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			required: false
		}
	]
};

const CLASS_PARAMETER_ENTITY_F_R = {
	_id: 'test.entity.f.r',
	emittarget: 'test.entity.f.r.target',
	description: 'Test entity with function and required = false description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`,
			required: false
		}
	]
};

const CLASS_PARAMETER_ENTITY_V = {
	_id: 'test.entity.v',
	emittarget: 'test.entity.v.target',
	description: 'Test entity with values description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			values: { $ref: `${COMP_NAME}_databasename` }
		}
	]
};

const CLASS_PARAMETER_ENTITY_V_F = {
	_id: 'test.entity.v.f',
	emittarget: 'test.entity.v.f.target',
	description: 'Test entity with values and function description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`,
			values: { $ref: `${COMP_NAME}_databasename` }
		}
	]
};

const CLASS_PARAMETER_ENTITY_V_R = {
	_id: 'test.entity.v.r',
	emittarget: 'test.entity.v.r.target',
	description: 'Test entity with values and required = false description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			required: false,
			values: { $ref: `${COMP_NAME}_databasename` }
		}
	]
};

const CLASS_PARAMETER_ENTITY_V_F_R = {
	_id: 'test.entity.v.f.r',
	emittarget: 'test.entity.v.f.r.target',
	description: 'Test entity with values and function and required = false description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`,
			required: false,
			values: { $ref: `${COMP_NAME}_databasename` }
		}
	]
};

const CLASS_PARAMETERS_ENTITY = [
	CLASS_PARAMETER_ENTITY,
	CLASS_PARAMETER_ENTITY_F,
	CLASS_PARAMETER_ENTITY_R,
	CLASS_PARAMETER_ENTITY_F_R,
	CLASS_PARAMETER_ENTITY_V,
	CLASS_PARAMETER_ENTITY_V_F,
	CLASS_PARAMETER_ENTITY_V_R,
	CLASS_PARAMETER_ENTITY_V_F_R
];

const TEXTS_ENTITY = [
	'I would like to get cloudant database info',
	'I\'d like details about a database',
	'Database details'
];

const CLASS_PARAMETER_ENTITY2_V_F = {
	_id: 'test.entity2.v.f',
	emittarget: 'test.entity2.v.f.target',
	description: 'Test entity with values and entity function description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`,
			values: { $ref: `${COMP_NAME}_databasename` }
		},
		{
			name: 'viewname',
			title: 'database view name',
			type: 'entity',
			prompt: 'OK. What is the value for the database view name?',
			entityfunction: `${COMP_NAME}_get.viewname.function`,
			values: { $ref: `${COMP_NAME}_viewname` }
		}
	]
};

const CLASS_PARAMETER_ENTITY2_V_F_R = {
	_id: 'test.entity2.v.f.r',
	emittarget: 'test.entity2.v.f.r.target',
	description: 'Test entity with values, entity function, and required = false description',
	storageType: 'private',
	parameters: [
		{
			name: 'databasename',
			title: 'database name',
			type: 'entity',
			prompt: 'OK. What is the value for the database name?',
			entityfunction: `${COMP_NAME}_get.databasename.function`,
			required: false,
			values: { $ref: `${COMP_NAME}_databasename` }
		},
		{
			name: 'viewname',
			title: 'database view name',
			type: 'entity',
			prompt: 'OK. What is the value for the database view name?',
			entityfunction: `${COMP_NAME}_get.viewname.function`,
			required: false,
			values: { $ref: `${COMP_NAME}_viewname` }
		}
	]
};

const TEXTS_ENTITY2 = [
	'I would like to run a cloudant database view',
	'I\'d like to invoke a database view',
	'Run database view'
];

const CLASS_PARAMETER_KEYWORD = {
	_id: 'test.keyword',
	emittarget: 'test.keyword.target',
	description: 'Test keyword description',
	storageType: 'private',
	parameters: [
		{
			name: 'resource',
			title: 'application resource',
			type: 'keyword',
			prompt: 'OK. What is the value for the application resource?',
			values: [ 'cpu', 'memory', 'disk' ]
		}
	]
};

const TEXTS_KEYWORD = [
	'I would like to resource information',
	'I\'d like to know the status of my application resource',
	'Application resource'
];

const CLASS_PARAMETER_NUMBER = {
	_id: 'test.number',
	emittarget: 'test.number.target',
	description: 'Test number description',
	storageType: 'private',
	parameters: [
		{
			name: 'instances',
			title: 'number of instances',
			type: 'number',
			prompt: 'OK. What is the value for the number of instances?'
		}
	]
};

const TEXTS_NUMBER = [
	'I want to increase my application instances',
	'I\'d like to set the number of instances for my application',
	'Scale app instances'
];

const CLASS_PARAMETER_REPOUSER_REPONAME = {
	_id: 'test.repouser.reponame',
	emittarget: 'test.repouser.reponame.target',
	description: 'Test repouser/reponame description',
	storageType: 'private',
	parameters: [
		{
			name: 'repouser',
			title: 'repository user',
			type: 'repouser',
			prompt: 'OK. What is the value for the repository user?'
		},
		{
			name: 'reponame',
			title: 'name of repository',
			type: 'reponame',
			prompt: 'OK. What is the value for the name of the repository?'
		}
	]
};

const TEXTS_REPOUSER_REPONAME = [
	'I want to create a github issue',
	'I\'d like to create an issue on my github repository',
	'Create github issue'
];

const CLASS_PARAMETER_REPOURL = {
	_id: 'test.repourl',
	emittarget: 'test.repourl.target',
	description: 'Test repourl description',
	storageType: 'private',
	parameters: [
		{
			name: 'repourl',
			title: 'repository url',
			type: 'repourl',
			prompt: 'OK. What is the value for the repository url?'
		}
	]
};

const TEXTS_REPOURL = [
	'I want to deploy from github repository',
	'I\'d like to do a github deploy',
	'Github deploy'
];

const CLASS_PARAMETER_CITY = {
	_id: 'test.city',
	emittarget: 'test.city.target',
	description: 'Test city description',
	storageType: 'private',
	parameters: [
		{
			name: 'city',
			title: 'city',
			type: 'city',
			prompt: 'OK. What is the value for the city?'
		}
	]
};

const TEXTS_CITY = [
	'I want to know the weather',
	'What is the weather like for my city',
	'Weather'
];

const CLASS_PARAMETER_NOPARAMS = {
	_id: 'test.noparams',
	emittarget: 'test.noparams.target',
	description: 'Test noparams description',
	storageType: 'private',
	parameters: []
};

const TEXTS_NOPARAMS = [
	'I want to list my applications',
	'I\'d like you to show me my apps',
	'Show apps'
];

const ALL_PARAMETERS = [
	[ CLASS_PARAMETERS_ENTITY, TEXTS_ENTITY ],
	[ [ CLASS_PARAMETER_ENTITY2_V_F, CLASS_PARAMETER_ENTITY2_V_F_R ], TEXTS_ENTITY2 ],
	[ [ CLASS_PARAMETER_KEYWORD ], TEXTS_KEYWORD ],
	[ [ CLASS_PARAMETER_NUMBER ], TEXTS_NUMBER ],
	[ [ CLASS_PARAMETER_REPOUSER_REPONAME ], TEXTS_REPOUSER_REPONAME ],
	[ [ CLASS_PARAMETER_REPOURL ], TEXTS_REPOURL ],
	[ [ CLASS_PARAMETER_CITY ], TEXTS_CITY ],
	[ [ CLASS_PARAMETER_NOPARAMS ], TEXTS_NOPARAMS ]
];

const TEST_DATABASENAMES_SET = ['AppTestDB', 'AppProdDB', 'AppDevDB'];
const TEST_DATABASENAMES_LATEST = TEST_DATABASENAMES_SET.concat([ 'somestuff', 'smith', 'users', 'nlc' ]);

const TEST_VIEWNAMES_SET = ['AppTestView', 'AppProdView', 'AppDevView'];
const TEST_VIEWNAMES_LATEST = TEST_VIEWNAMES_SET.concat([ 'seestuff', 'all', 'byUser', 'byTenant' ]);

function getDatabaseNameFunction(robot, res, parameterName, parameters) {
	return new Promise(function(resolve, reject) {
		resolve(TEST_DATABASENAMES_LATEST);
	});
};

function getViewNameFunction(robot, res, parameterName, parameters) {
	return new Promise(function(resolve, reject) {
		if (parameters && parameters.databasename) {
			resolve(TEST_VIEWNAMES_LATEST);
		}
		else {
			resolve();
		}
	});
};

describe('Test the entity extracting', function(){
	let db;
	let room;
	let entityManager;

	before(function() {
		return mockAlchemy.setupMockery();
	});

	before(function(done) {
		entityManager = new EntityManager();

		return nlcDb.open().then((res) => {
			db = res;
			let dbputList = [];
			let textsCount = 1;
			for (let i = 0; i < ALL_PARAMETERS.length; i++) {
				let classParameters = ALL_PARAMETERS[i][0];
				let texts = ALL_PARAMETERS[i][1];
				for (let j = 0; j < classParameters.length; j++) {
					let classParameter = classParameters[j];
					for (let k = 0; k < texts.length; k++) {
						let textEntity = {
							_id: `${COMP_NAME}_${textsCount++}_${COMP_VERSION}`,
							class: classParameter._id,
							text: texts[k],
							storageType: 'private'
						};
						dbputList.push(db.put(textEntity));
					}
					dbputList.push(db.put(classParameter));
				}
			}
			return Promise.all(dbputList).then(function(results) {
				let hasError = false;
				for (let j = 0; j < results.length; j++) {
					if (results[j].ok !== true) {
						done(new Error(`Result number ${j} had an error; result = ${results[j]}`));
						hasError = true;
						break;
					}
				}
				if (!hasError) done();
			}).catch(function(error) {
				done(error);
			});
		});
	});

	before(function() {
		nlcconfig.updateGlobalParameterValues(`${COMP_NAME}_databasename`, TEST_DATABASENAMES_SET);
		nlcconfig.setGlobalEntityFunction(`${COMP_NAME}_get.databasename.function`, getDatabaseNameFunction);
		nlcconfig.updateGlobalParameterValues(`${COMP_NAME}_viewname`, TEST_VIEWNAMES_SET);
		nlcconfig.setGlobalEntityFunction(`${COMP_NAME}_get.viewname.function`, getViewNameFunction);
	});

	beforeEach(function() {
		room = helper.createRoom();
	});

	afterEach(function() {
		room.destroy();
	});

	context('Testing getEntities() for single entity parameter type; no entityfunction, optional, or values', function() {
		let classParameter = CLASS_PARAMETER_ENTITY;

		it('Base entity; no value; enter value at first prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list (does not matter); no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list (does not matter); enter value at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list (does not matter); Reenter same statement at first prompt; enter value at second prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', statement);
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.not.be.undefined;
					expect(parameters.databasename).to.eql(`${databasenameValue}`);
					done();
				}).catch(function(error) {
					done(error);
				});
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter exit at first prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', 'exit');
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; Enter multiple at first prompt; enter exit at second prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `Get database details ${TEST_DATABASENAMES_SET[0]} ${TEST_DATABASENAMES_SET[1]}`);
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', 'exit');
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.be.undefined;
					done();
				}).catch(function(error) {
					done(error);
				});
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with entityfunction, no optional or values', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_F;

		it('Base entity; no value; enter value at first prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value in list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter none at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', 'none');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter none index at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', '3');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter invalid text at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', 'junk');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter bad index at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', '999');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter value choice at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', 'I\'d like to use somevalue');
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', `${TEST_DATABASENAMES_LATEST[3]}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value not in list at first prompt; enter choice index at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', 'I\'d like to use somevalue');
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', '2');
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value not in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = 'Get database details somevalue';
			let replyFn = function(msg) {
				if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', '1');
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list; first one used; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with optional and no entityfunction or values', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_R;

		it('Base entity; no value; no prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list (does not matter); no prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list (does not matter); no prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with entityfunction and optional, no values', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_F_R;

		it('Base entity; no value; no prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value not in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = 'Get database details somevalue';
			let replyFn = function(msg) {
				if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', '1');
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list; first one used; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with values and no entityfunctionor  optional', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_V;

		it('Base entity; no value; enter value not in list at first prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter value in list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list; no prompt (first value used); no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values not in list (does not matter); Reenter same statement at first prompt; enter value at second prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = 'Get database details somevalue anothervalue';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', statement);
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.not.be.undefined;
					expect(parameters.databasename).to.eql(`${databasenameValue}`);
					done();
				}).catch(function(error) {
					done(error);
				});
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with values and entityfunction, and no optional', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_V_F;

		it('Base entity; no value; enter value at first prompt; no error expected', function(done) {
			let databasenameValue = 'somevalue';
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value in values list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value in entities list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = 'Get database details';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in values list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value in entities list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with values and optional, and no entityfunction', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_V_R;

		it('Base entity; no value; enter value no prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values in list; no prompt (first value used); no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue} ${TEST_DATABASENAMES_SET[1]}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; 2 values not in list (does not matter); Reenter same statement at first prompt; enter value at second prompt; no error expected', function(done) {
			let statement = 'Get database details somevalue anothervalue';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.be.undefined;
					done();
				}).catch(function(error) {
					done(error);
				});
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single entity parameter type; with values, entityfunction, and optional', function() {
		let classParameter = CLASS_PARAMETER_ENTITY_V_F_R;

		it('Base entity; no value; no prompt; no error expected', function(done) {
			let statement = 'Get database details';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.be.undefined;
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; value in values list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with value in entities list at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let statement = `Get database details ${databasenameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for two entity parameter types; with values and entityfunction, and no optional', function() {
		let classParameter = CLASS_PARAMETER_ENTITY2_V_F;

		it('Base entity; no value; enter first value at first prompt; enter second value at first prompt; no error expected', function(done) {
			let databasenameValue = 'somedatabase';
			let viewnameValue = 'someview';
			let statement = 'Run database view';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${databasenameValue}`);
				}
				else if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `${viewnameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with first value in values list at first prompt; enter phrase with second value at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let viewnameValue = `${TEST_VIEWNAMES_SET[0]}`;
			let statement = 'Run database view';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `I'd like to use ${viewnameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; no value; enter phrase with first value in entities list at first prompt; enter phrase with second value at first prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let viewnameValue = `${TEST_VIEWNAMES_LATEST[3]}`;
			let statement = 'Run database view';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `I'd like to use ${databasenameValue}`);
				}
				else if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `I'd like to use ${viewnameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; first value in values list; second value in values list at prompt; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let viewnameValue = `${TEST_VIEWNAMES_SET[0]}`;
			let statement = `Run database view ${databasenameValue}`;
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `${viewnameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; first value in values list; second value in values list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
			let viewnameValue = `${TEST_VIEWNAMES_SET[0]}`;
			let statement = `Run database view ${databasenameValue} ${viewnameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base entity; first value in entities list; second value in entities list; no error expected', function(done) {
			let databasenameValue = `${TEST_DATABASENAMES_LATEST[3]}`;
			let viewnameValue = `${TEST_VIEWNAMES_LATEST[3]}`;
			let statement = `Run database view ${databasenameValue} ${viewnameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single keyword parameter type; with values', function() {
		let classParameter = CLASS_PARAMETER_KEYWORD;

		it('Base keyword; no value; enter value not in list at first prompt; no error expected', function(done) {
			let resourceValue = 'somevalue';
			let statement = 'Get application resource info';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${resourceValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.resource).to.not.be.undefined;
				expect(parameters.resource).to.eql(`${resourceValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base keyword; no value; enter value in list at first prompt; no error expected', function(done) {
			let resourceValue = `${CLASS_PARAMETER_KEYWORD.parameters[0].values[0]}`;
			let statement = 'Get application resource info';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${resourceValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.resource).to.not.be.undefined;
				expect(parameters.resource).to.eql(`${resourceValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base keyword; value in list; no error expected', function(done) {
			let resourceValue = `${CLASS_PARAMETER_KEYWORD.parameters[0].values[0]}`;
			let statement = `Get application ${resourceValue} resource info`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.resource).to.not.be.undefined;
				expect(parameters.resource).to.eql(`${resourceValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base keyword; 2 values not in list (does not matter); Reenter same statement at first prompt; enter value at second prompt; no error expected', function(done) {
			let resourceValue = `${CLASS_PARAMETER_KEYWORD.parameters[0].values[0]}`;
			let statement = 'Get application someresource resource info from anotherthing';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', statement);
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${resourceValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.resource).to.not.be.undefined;
					expect(parameters.resource).to.eql(`${resourceValue}`);
					done();
				}).catch(function(error) {
					done(error);
				});
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base keyword; no value; enter phrase with value not in list at first prompt; enter none at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let resourceValue = `${CLASS_PARAMETER_KEYWORD.parameters[0].values[0]}`;
			let statement = 'Get application resource info';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', 'I want memry or memor or remy');
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', 'none');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${resourceValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.resource).to.not.be.undefined;
				expect(parameters.resource).to.eql(`${resourceValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single number parameter type', function() {
		let classParameter = CLASS_PARAMETER_NUMBER;

		it('Base number; no value; enter value at first prompt; no error expected', function(done) {
			let instancesValue = '3';
			let statement = 'Scale application';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${instancesValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.instances).to.not.be.undefined;
				expect(parameters.instances).to.eql(`${instancesValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base number; value in statement; no error expected', function(done) {
			let instancesValue = '4';
			let statement = `Scale application to ${instancesValue} instances`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.instances).to.not.be.undefined;
				expect(parameters.instances).to.eql(`${instancesValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single repouser and reponame parameter type', function() {
		let classParameter = CLASS_PARAMETER_REPOUSER_REPONAME;

		it('Base repouser/reponame; no values; enter values at first prompt; no error expected', function(done) {
			let repouserValue = 'testuser';
			let reponameValue = 'testname';
			let statement = 'Open github issue';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${repouserValue}`);
				}
				else if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `${reponameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.repouser).to.not.be.undefined;
				expect(parameters.repouser).to.eql(`${repouserValue}`);
				expect(parameters.reponame).to.not.be.undefined;
				expect(parameters.reponame).to.eql(`${reponameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base repouser/reponame; values in statement; no error expected', function(done) {
			let repouserValue = 'testuser';
			let reponameValue = 'testname';
			let statement = `Open github issue against ${repouserValue}/${reponameValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.repouser).to.not.be.undefined;
				expect(parameters.repouser).to.eql(`${repouserValue}`);
				expect(parameters.reponame).to.not.be.undefined;
				expect(parameters.reponame).to.eql(`${reponameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single repourl parameter type', function() {
		let classParameter = CLASS_PARAMETER_REPOURL;

		it('Base repourl; no value; enter value at first prompt; no error expected', function(done) {
			let repourlValue = 'https://github.com/repoorg/reponame';
			let statement = 'Deploy github';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${repourlValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.repourl).to.not.be.undefined;
				expect(parameters.repourl).to.eql(`${repourlValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base repourl; value in statement; no error expected', function(done) {
			let repourlValue = 'https://github.com/repoorg/reponame';
			let statement = `Deploy github ${repourlValue}`;
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.repourl).to.not.be.undefined;
				expect(parameters.repourl).to.eql(`${repourlValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for single city parameter type', function() {
		let classParameter = CLASS_PARAMETER_CITY;

		it('Base city; no value; enter value at first prompt; no error expected', function(done) {
			let cityValue = 'Raleigh';
			let statement = 'Get weather';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', `${cityValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.city).to.not.be.undefined;
				expect(parameters.city).to.eql(`${cityValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base city; value in list; no error expected', function(done) {
			let cityValue = 'Raleigh';
			let statement = 'Get weather for Raleigh, NC';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.city).to.not.be.undefined;
				expect(parameters.city).to.eql(`${cityValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

		it('Base city; no value; enter phrase with value at first prompt; enter none at second prompt; enter value not in list at third prompt; no error expected', function(done) {
			let cityValue = 'Raleigh';
			let statement = 'Get weather';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[0].prompt) {
					room.user.say('mimiron', 'I\'d like weather for Ralgh');
				}
				else if (msg.includes(i18n.__('fuzzy.result.none'))) {
					room.user.say('mimiron', 'none');
				}
				else if (msg === i18n.__('cognitive.prompt.param.again', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
					room.user.say('mimiron', `${cityValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.city).to.not.be.undefined;
				expect(parameters.city).to.eql(`${cityValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntity() for two entity parameter types; with values and entityfunction, and no optional', function() {
		let classParameter = CLASS_PARAMETER_ENTITY2_V_F;

		it('Base entity; no value; enter first value at first prompt; enter second value at first prompt; no error expected', function(done) {
			let databasenameValue = 'somedatabase';
			let viewnameValue = 'someview';
			let statement = 'Run database view';
			let replyFn = function(msg) {
				if (msg === classParameter.parameters[1].prompt) {
					room.user.say('mimiron', `${viewnameValue}`);
				}
				else {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				}
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			entityManager.getEntity(room.robot, res, statement, classParameter._id, 'viewname', { databasename: `${databasenameValue}` }).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(parameters.databasename).to.not.be.undefined;
				expect(parameters.databasename).to.eql(`${databasenameValue}`);
				expect(parameters.viewname).to.not.be.undefined;
				expect(parameters.viewname).to.eql(`${viewnameValue}`);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntities() for no parameters', function() {
		let classParameter = CLASS_PARAMETER_NOPARAMS;

		it('No parameters; no error expected', function(done) {
			let statement = 'List applications';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
				expect(classEmitTarget).to.not.be.undefined;
				return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
			}).then(function(parameters) {
				expect(parameters).to.not.be.undefined;
				expect(Object.keys(parameters).length).to.eql(0);
				done();
			}).catch(function(error) {
				done(error);
			});
		});

	});

	context('Testing getEntity() for no parameters', function() {
		let classParameter = CLASS_PARAMETER_NOPARAMS;

		it('No parameters; no error expected', function(done) {
			let statement = 'List applications';
			let replyFn = function(msg) {
				done(new Error(`Unexpected message sent to bot user: ${msg}.`));
			};
			let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
			entityManager.getEntity(room.robot, res, statement, classParameter._id, 'viewname', {}).then(function(parameters) {
				done(new Error('Unexpected good response.'));
			}).catch(function(error) {
				if (error) {
					done();
				}
				else {
					done(new Error('Missing bad response.'));
				}
			});
		});

	});

	describe('Test the entity extracting with parsing disabled', function(){
		let saveParsingDisabled;

		before(function() {
			saveParsingDisabled = env.entityParsingDisabled;
			env.entityParsingDisabled = true;

			entityManager = new EntityManager();
		});

		after(function() {
			env.entityParsingDisabled = saveParsingDisabled;
		});

		context('Testing getEntities() for two entity parameter types; with values and entityfunction, and no optional', function() {
			let classParameter = CLASS_PARAMETER_ENTITY2_V_F;

			it('Base entity; no value; enter first value at first prompt; enter second value at first prompt; no error expected', function(done) {
				let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
				let viewnameValue = `${TEST_VIEWNAMES_SET[0]}`;
				let statement = `Run database view ${databasenameValue} ${viewnameValue}`;
				let replyFn = function(msg) {
					if (msg === i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
						room.user.say('mimiron', `${databasenameValue}`);
					}
					else if (msg === i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.parameters[1].title || classParameter.parameters[1].name)) {
						room.user.say('mimiron', `${viewnameValue}`);
					}
					else {
						done(new Error(`Unexpected message sent to bot user: ${msg}.`));
					}
				};
				let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
				nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
					expect(classEmitTarget).to.not.be.undefined;
					return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
				}).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.not.be.undefined;
					expect(parameters.databasename).to.eql(`${databasenameValue}`);
					expect(parameters.viewname).to.not.be.undefined;
					expect(parameters.viewname).to.eql(`${viewnameValue}`);
					done();
				}).catch(function(error) {
					done(error);
				});
			});

			it('Base entity; both values (ignored); enter first value at first prompt; enter exit at first prompt; no error expected', function(done) {
				let databasenameValue = `${TEST_DATABASENAMES_SET[0]}`;
				let viewnameValue = `${TEST_VIEWNAMES_SET[0]}`;
				let statement = `Run database view ${databasenameValue} ${viewnameValue}`;
				let replyFn = function(msg) {
					if (msg === i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.parameters[0].title || classParameter.parameters[0].name)) {
						room.user.say('mimiron', `${databasenameValue}`);
					}
					else if (msg === i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.parameters[1].title || classParameter.parameters[1].name)) {
						room.user.say('mimiron', 'exit');
					}
					else {
						done(new Error(`Unexpected message sent to bot user: ${msg}.`));
					}
				};
				let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
				nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
					expect(classEmitTarget).to.not.be.undefined;
					return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
				}).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.not.be.undefined;
					expect(parameters.databasename).to.eql(`${databasenameValue}`);
					expect(parameters.viewname).to.be.undefined;
					done();
				}).catch(function(error) {
					done(error);
				});
			});

		});

		context('Testing getEntity() for two entity parameter types; with values and entityfunction, and no optional', function() {
			let classParameter = CLASS_PARAMETER_ENTITY2_V_F;

			it('Base entity; no value; enter first value at first prompt; enter second value at first prompt; no error expected', function(done) {
				let databasenameValue = 'somedatabase';
				let viewnameValue = 'someview';
				let statement = 'Run database view';
				let replyFn = function(msg) {
					if (msg === i18n.__('cognitive.prompt.param.parsingdisabled', classParameter.parameters[1].title || classParameter.parameters[1].name)) {
						room.user.say('mimiron', `${viewnameValue}`);
					}
					else {
						done(new Error(`Unexpected message sent to bot user: ${msg}.`));
					}
				};
				let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
				entityManager.getEntity(room.robot, res, statement, classParameter._id, 'viewname', { databasename: `${databasenameValue}` }).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.not.be.undefined;
					expect(parameters.databasename).to.eql(`${databasenameValue}`);
					expect(parameters.viewname).to.not.be.undefined;
					expect(parameters.viewname).to.eql(`${viewnameValue}`);
					done();
				}).catch(function(error) {
					done(error);
				});
			});

		});

		context('Testing getEntities() for two entity parameter types; with optional', function() {
			let classParameter = CLASS_PARAMETER_ENTITY2_V_F_R;

			it('Base entity; no value; no prompts; no error expected', function(done) {
				let statement = 'Run database view';
				let replyFn = function(msg) {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				};
				let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
				nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
					expect(classEmitTarget).to.not.be.undefined;
					return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
				}).then(function(parameters) {
					expect(parameters).to.not.be.undefined;
					expect(parameters.databasename).to.be.undefined;
					expect(parameters.viewname).to.be.undefined;
					done();
				}).catch(function(error) {
					done(error);
				});
			});

		});

	});

	describe('Test the entity extracting with parsing disabled', function(){
		let saveAlchemyUrl;

		before(function() {
			saveAlchemyUrl = env.alchemy_url;
			env.alchemy_url = undefined;

			entityManager = new EntityManager();
		});

		after(function() {
			env.alchemy_url = saveAlchemyUrl;
		});

		context('Testing getEntities() for single city parameter type', function() {
			let classParameter = CLASS_PARAMETER_CITY;

			it('Base city; value in list; no error expected', function(done) {
				let statement = 'Get weather for Raleigh, NC';
				let replyFn = function(msg) {
					done(new Error(`Unexpected message sent to bot user: ${msg}.`));
				};
				let res = { message: {text: statement, user: {id: 'mimiron'}}, reply: replyFn };
				nlcconfig.getClassEmitTarget(classParameter._id).then(function(classEmitTarget) {
					expect(classEmitTarget).to.not.be.undefined;
					return entityManager.getEntities(room.robot, res, statement, classParameter._id, classEmitTarget.parameters);
				}).then(function(parameters) {
					done(new Error('Unexpected good response.'));
				}).catch(function(error) {
					if (error) {
						done();
					}
					else {
						done(new Error('Missing bad response.'));
					}
				});
			});

		});

	});

});
