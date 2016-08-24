/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';
const nock = require('nock');
const path = require('path');
const env = require(path.resolve(__dirname, '..', 'src', 'lib', 'env'));

const alchemyEndpoint = env.alchemy_url;

module.exports = {
	setupMockery: function() {
		let alchemyScope = nock(alchemyEndpoint).persist();

		alchemyScope.post(/.*/, function(body){
			return (body.text.includes('Raleigh'));
		})
		.reply(200,
			{
				status: 'OK',
				usage: 'By accessing AlchemyAPI or using information generated by AlchemyAPI, you are agreeing to be bound by the AlchemyAPI Terms of Use: http://www.alchemyapi.com/company/terms.html',
				url: '',
				language: 'english',
				entities: [{
					type: 'City',
					relevance: '0.33',
					count: '1',
					text: 'Raleigh',
					disambiguated: {
						subType: ['PlaceWithNeighborhoods'],
						name: 'Raleigh, North Carolina',
						website: 'http://www.raleighnc.gov',
						dbpedia: 'http://dbpedia.org/resource/Raleigh,_North_Carolina',
						freebase: 'http://rdf.freebase.com/ns/m.0fvyg',
						geonames: 'http://sws.geonames.org/4487042/',
						yago: 'http://yago-knowledge.org/resource/Raleigh,_North_Carolina'
					}
				}, {
					type: 'StateOrCounty',
					relevance: '0.33',
					count: '1',
					text: 'NC'
				}]
			});

		alchemyScope.post(/.*/, function(body){
			return (!body.text.includes('Raleigh'));
		})
		.reply(200,
			{
				status: 'OK',
				usage: 'By accessing AlchemyAPI or using information generated by AlchemyAPI, you are agreeing to be bound by the AlchemyAPI Terms of Use: http://www.alchemyapi.com/company/terms.html',
				url: '',
				language: 'english',
				entities: []
			});

	}
};