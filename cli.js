#! /usr/bin/env node


const Https = require('https');
const Chalk = require('Chalk');
const QS = require('querystring');
const Config = require('./config');


/**
 * request helpers
 */

const buildReqOpt = (method, body) => {

  const opt = {
    host: Config.WEBTASK_HOST,
    path: Config.WEBTASK_PATH,
    method: method
  };

  const headers = {
    'Authorization': `Bearer ${ Config.ACCESS_TOKEN }`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (body) {
    Object.assign(
      headers,
      { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) }
    );
  }

  return Object.assign({}, opt, { headers });
}

const sendReq = (method, item) => {

  let body;
  if (item) {
    item.from = Config.FROM;
    body = { item: item }
  }

  const req = Https.request(buildReqOpt(method, body), (res) => {

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        const parsed = JSON.parse(chunk);
        if (parsed.status !== 200) {
          printError(parsed.message);
        } else {
          printData(parsed.data);
        }
      });

  });

  if (body) {
    req.write(JSON.stringify(body));
  }

  return req;
}


/**
 * print the returned data
 */

const printData = (content) => {

  if (!content.length) return;

  console.log(`\n\t🥑  ${ Chalk.bold.underline.green('your fabulous list') } 🥑\n`);

  content.forEach((elem) => {
    const itemsColors = {
      id: elem.done ? Chalk.dim.strikethrough : Chalk.magenta,
      content: elem.done ? Chalk.dim.strikethrough : Chalk.white,
    }
    const item = [
      `  [${ elem.done ? 'x' : ' ' }]`,
      itemsColors.id(elem._id),
      itemsColors.content(elem.content || '')
    ];
    console.log(item.join('   '));
  });

  console.log(`\n\t🌊  ${ Chalk.blue('kthxbai.\n') }`);
}

const printError = (msg) => {
  console.log(`\n\t🚨  ${ Chalk.red.bold('Error') }`);
  console.log(Chalk.red(`\t${ msg }\n`));
  process.exit(1);
}


/**
 * entry point
 */

if (!Config.ACCESS_TOKEN || !Config.FROM) {
  printError('Either `ACCESS_TOKEN` or `FROM` is missing from config.js.');
}

const userArgs = process.argv.slice(2);
const cmd = userArgs[0];
let req;

switch (cmd) {
  case 'ls':
    req = sendReq('GET');
    break;
  case 'add':
    req = sendReq('POST', { content: userArgs[1] });
    break;
  case 'fin':
    req = sendReq('POST', { _id: userArgs[1], done: true });
    break;
  case 'edit':
    req = sendReq('POST', { _id: userArgs[1], content: userArgs[2] });
    break;
  case 'rm':
    req = sendReq('DELETE', { _id: userArgs[1] });
    break;
  default:
    console.log('help');
    break;
}

if (req) {
  req.on('error', (e) => console.error(e));
  req.end();
}
