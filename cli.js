#! /usr/bin/env node


const Https = require('https');
const Chalk = require('Chalk');
const Config = require('./config');

const userArgs = process.argv.slice(2);


const printData = (content) => {

  console.log(`\n\t🥑  ${ Chalk.bold.underline.green('your fabulous list') } 🥑\n`);

  content.forEach((elem) => {
    const itemsColors = {
      id: elem.done ? Chalk.dim.strikethrough : Chalk.magenta,
      content: elem.done ? Chalk.dim.strikethrough : Chalk.white,
    }
    const item = [
      `  [${elem.done ? 'x' : ' '}]`,
      itemsColors.id(elem._id),
      itemsColors.content(elem.content || '')
    ];
    console.log(item.join('   '));
  });

  console.log(`\n\t🌊  ${Chalk.blue('kthxbai.\n')}`);
}

const req = Https.request({
  host: Config.WEBTASK_HOST,
  path: Config.WEBTASK_PATH,
  headers: {
    'Authorization': `Bearer ${Config.ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  method: 'GET'
}, (res) => {
  res.setEncoding('utf8')
  res.on('data', (data) => printData(JSON.parse(data).data));
});

req.on('error', function(e) {
  console.error(e);
});

req.end();
