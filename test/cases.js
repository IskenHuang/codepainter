var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var glob = require('glob');
var should = require('should');
var editorconfig = require('editorconfig');
var path = require('path');

var Pipe = require('../lib/Pipe');
var codepainter = require('../codepainter');
var rules = require('../lib/rules');
var Transformer = require('../lib/Transformer');


describe('Code Painter', function() {

	var globOptions = {sync : true};

	glob('test/cases/*', globOptions, function(er, testCases) {

		testCases.forEach(function(testCase) {

			testCase = testCase.substr(testCase.lastIndexOf('/') + 1);

			describe(testCase + ' rule', function() {
				var Rule;
				for (var i = 0; i < rules.length; i++) {
					if (rules[i].prototype.name === testCase) {
						Rule = rules[i];
						break;
					}
				}

				glob('test/cases/' + testCase + '/*/*.json', globOptions, function(er2, stylePaths) {
					stylePaths.forEach(function(stylePath) {
						var setting = {
							folder : stylePath.substr(0, stylePath.lastIndexOf('/') + 1),
							styles : JSON.parse(fs.readFileSync(stylePath, 'utf-8'))
						};

						if (editorconfig.parse(stylePath).test !== true) {
							return;
						}

						testInferrance(Rule, setting);
						testTransformation(setting);
					});
				});
			});
		});
	});
});

function testInferrance(Rule, setting) {
	Object.keys(setting.styles).forEach(function(styleKey) {
		var styleValue = setting.styles[styleKey];
		var samplePath = verifyPath(setting.folder + 'sample.js');
		if (fs.existsSync(samplePath)) {
			it('infers ' + styleKey + ' setting as ' + styleValue, function(done) {
				codepainter.infer(samplePath, function(inferredStyle) {
					styleValue.should.equal(inferredStyle[styleKey]);
					done();
				}, Rule);
			});
		}
	});
}

function verifyPath(path) {
	fs.existsSync(path).should.be.true;
	return path;
}

function testTransformation(setting) {
	var folders = setting.folder.split('/');
	setting.name = folders[folders.length - 2];
	it('formats ' + setting.name + ' setting properly', function(done) {
		var inputPath = setting.folder + 'input.js';
		var outputPath = generateTempPath(inputPath);
		var expectedPath = verifyPath(setting.folder + 'expected.js');
		var transformer = new Transformer();
		transformer.on('transform', function() {
			var output = fs.readFileSync(outputPath, 'utf8');
			fs.unlink(outputPath);
			var expected = fs.readFileSync(expectedPath, 'utf8');
			expected.should.equal(output);
			done();
		});
		transformer.transform(inputPath, {
			style : setting.styles,
			isTesting : true,
			output : outputPath
		});
	});
}

function generateTempPath(inputPath) {
	return [
	path.dirname(inputPath),
		'_' + crypto.randomBytes(4).readUInt32LE(0) + '.tmp'
	].join(path.sep);
}
