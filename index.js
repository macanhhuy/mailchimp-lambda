require('dotenv').load();

var AWS = require('aws-sdk');
var ses = new AWS.SES({ apiVersion: '2010-12-01' });
var Promise = require('es6-promise').Promise,
  request = require('superagent'),
  md5 = require('md5');

var API_URL = '.api.mailchimp.com/3.0/lists/',
  DATACENTER = process.env.DATACENTER,
  API_KEY = process.env.API_KEY,
  LIST_ID = process.env.LIST_ID,
  USERNAME = process.env.USERNAME,
  STATUS = process.env.STATUS;

function urlForList() {
  return 'https://' + DATACENTER + API_URL + LIST_ID + '/members/';
}

function urlForUser(emailAddress) {
  return urlForList() + md5(emailAddress);
}

function updateSubscription(emailAddress, name) {
  return new Promise(function (resolve, reject) {
    request.patch(urlForUser(emailAddress))
      .auth(USERNAME, API_KEY)
      .send({ status: STATUS, merge_fields: { NAME: name } })
      .end(function (err, res) {
        if (err) {
          console.log('ERROR', err);
          reject({ status: err.status, message: err.response.text });
        } else {
          resolve(res.body);
        }
      });
  });
}

function createSubscription(emailAddress, name) {
  return new Promise(function (resolve, reject) {
    request.post(urlForList())
      .auth(USERNAME, API_KEY)
      .send({ 'email_address': emailAddress, 'status': STATUS, merge_fields: { NAME: name } })
      .end(function (err, res) {
        if (err) {
          console.log('ERROR', err);
          reject({ status: err.status, message: err.response.text });
        } else {
          resolve(res.body);
        }
      });
  });
}


var toAddress = 'stream.space <macanhhuydn@gmail.com>';
var source = 'Stream Space <info@stream.space>';
var charset = 'UTF-8';

exports.handler = function (event, context) {
  var emailAddress = event.email;
  var name = event.name || '';
  var subject = 'Submitted Form';
  var replyTo = name + " <" + emailAddress + ">";
  var emailData = [];
  emailData.push("Name: " + name);
  emailData.push("Email: " + emailAddress);

  function create() {
    createSubscription(emailAddress, name)
      .then(function (responseBody) {
        ses.sendEmail({
          Destination: { ToAddresses: [toAddress] },
          Message: {
            Body: { Text: { Data: emailData.join('\r\n'), Charset: charset } },
            Subject: { Data: subject, Charset: charset }
          },
          Source: source,
          ReplyToAddresses: [replyTo]
        }, function (err, data) {
          context.succeed(responseBody);
        });
      })
      .catch(function (err) {
        context.succeed(err);
      });
  }

  create();
};
