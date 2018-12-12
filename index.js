const express = require('express');
const bodyParser = require('body-parser');
const mabl = require('./mabl.js');
const app = express();
const mongo = require('./mongo.js');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));

const PORT = process.env.PORT;
var devlink = '**dev url here**';
var staginglink = '**staging url here**';
var prodlink = '**prod url here**';

//use the pug template to generate a page with a link that contains the url to the app in isolation. The flow is as follows:
// - Pull request created against master
// - With review apps on in heroku, a review app is created (https://devcenter.heroku.com/articles/github-integration-review-apps)
// - A preconfigured app.json file contains a postdeploy script that sends a webrequest to /storereviewapp/:appName with the
// name of the review app as the parameter
// - A smoke test suite is then configured to navigate to this middleman app which serves up the review app url as well as
// some other environment urls
// PROBLEMS: The postdeploy scipt is only ran once so any subsequent pushes to that branch for which there is a pull request will
// not trigger the test runs. Consider adding some release phase implementation to remedy this. https://devcenter.heroku.com/articles/release-phase
// If there are multiple review apps, the home endpoint will serve up the latest review app url which could cause a queueing
// issue if there are ever multiple commits.
app.get('/', function(req, res) {
	var reviewAppLink = function() {
		mongo.getReviewApp(function(appName) {
			return appName;
		});
	};
	res.render('index', {
		devlink: devlink,
		staginglink: staginglink,
		prodlink: prodlink,
		reviewAppLink: reviewAppLink
	});
});
app.get('/tempUserCount', function(req, res) {
	mongo.tempUserCount(function(count) {
		res.send({ CurrentCount: count });
	});
});
app.get('/reviewApp/', function(req, res) {
	mongo.storeReviewApp(req.params, function(name) {
		res.send({ appName: name });
	});
});
app.get('/tempUserCount/ByMonth', function(req, res) {
	mongo.tempUserCountByMonth(function(dateObject) {
		res.send(dateObject);
	});
});

app.post('/', function(req, res) {
	if (req.body) {
		try {
			prodlink = 'https://' + req.body.app + '.herokuapp.com/';
			mabl.postToMabl(req.body.app);
			res.send({
				status: 200,
				result: 'Test run started.'
			});
		} catch (error) {
			res.send(
				mabl.postToSlack({
					text: 'Failure to execute tests',
					attachments: [
						{
							text:
								error + ' Could not execute POST requests to mabl and slack.'
						}
					]
				})
			);
		}
	}
});

app.post('/testSlack', function(req, res) {
	mabl.postToSlack({
		text: 'Failure to execute tests',
		attachments: [
			{
				text:
					req.body.app + ' Could not execute POST requests to mabl and slack.'
			}
		]
	});
	res.send({ success: 'true' });
});

app.post('/getEmail', function(req, res) {
	mongo.getEmail(req.body, function(email) {
		res.send(email);
	});
});
app.post('/insertNewUserDocument', function(req, res) {
	mongo.insertNewUserDocument(req.body, function(result) {
		res.send(result);
	});
});
app.post('/storeReviewApp/', function(req, res) {
	mongo.storeReviewApp(req.body.appName, function(name) {
		res.send(name);
	});
});
app.post('/updateDocument', function(req, res) {
	mongo.updateDocument(req.body.queryObject, req.body.updateObject, function(
		result
	) {
		res.send(result);
	});
});

app.listen(PORT);
