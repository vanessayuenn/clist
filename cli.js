#! /usr/bin/env node


const Https = require('https');
const Chalk = require('Chalk');
const QS = require('querystring');
const Config = require('./config');


const reqOpt = {
  host: Config.WEBTASK_HOST,
  path: Config.WEBTASK_PATH,
  headers: {
    'Authorization': `Bearer ${ Config.ACCESS_TOKEN }`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

const printData = (content) => {

  if (!content) {
    return;
  }

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

const userArgs = process.argv.slice(2);
const cmd = userArgs[0];

const sendReq = (method, body) => {
  const req = Https.request(
    Object.assign({}, reqOpt, { method: method }),
    (res) => {
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        const parsed = JSON.parse(chunk);
        // console.log(parsed);
        if (parsed.status !== 200) {
          console.log(`\n\t🚨  ${ Chalk.red.bold('Error') }`);
          console.log(Chalk.red(`\t${ parsed.message }\n`));
        } else {
          printData(parsed.data);
        }
      });
    }
  );
  if (body) {
    body.from = Config.FROM;
    req.write(JSON.stringify({ item: body }));
  }
  return req;
}

let req;

switch (cmd) {
  case 'ls':
    req = sendReq('GET');
    break;
  case 'add':
    req = sendReq('POST', { content: userArgs[1] });
    break;
  case 'fin':
    req = sendReq(
      'POST',
      { _id: userArgs[1], done: true }
    );
    break;
  case 'edit':
    req = sendReq(
      'POST',
      { _id: userArgs[1], content: userArgs[2] }
    );
    break;
  default:
    console.log('help');
    break;
}

if (req) {
  req.on('error', (e) => console.error(e));
  req.end();
}

// clist <command> [<args>]
// clist ls
// clist add 'content'
// clist fin 'id'
// clist edit 'id' 'content'
// clist rm 'id'
// clist help
