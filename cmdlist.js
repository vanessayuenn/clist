'use latest';

const Express = require('express');
const Webtask = require('webtask-tools');
const jwt = require('jsonwebtoken@7.1.9');
const Mongo = require('mongodb');
const MongoClient = Mongo.MongoClient;

const app = new Express();
app.use(require('body-parser').json());

const COLLECTION = 'items';
const RESPONSE = {
  OK: { status: 200, message: 'ok' },
  ERROR: { status: 400, message: 'you fucked up' },
  UNAUTHORIZED: { status: 401, message: 'unauthorized' }
}


/**
 * auth0 config
 */

const auth0Config = {

  validateToken: (ctx, req, token, cb) => {

    const authParams = {
      signingSecret: ctx.secrets.AUTH0_SIGNING_SECRET,
      audience: ctx.secrets.AUTH0_AUDIENCE,
      domain: ctx.secrets.AUTH0_DOMAIN
    }

    if (!authParams) {
      return cb({
        code: 400,
        message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
      });
    }

    // Validate Auth0 issued id_token
    let user;
    try {
      user = jwt.verify(token, authParams.signingSecret,
        {
          algorithms: ['HS256'],
          audience: authParams.audience,
          issuer: `https://${authParams.domain}/`
        }
      );
    } catch (e) {
      return cb({
        code: 401,
        message: 'Unauthorized: ' + e.message
      });
    }
    return cb(null, user);

  },
  loginError: (error, ctx, req, res, baseUrl) =>
    sendResponse(res, RESPONSE.UNAUTHORIZED)
}


/**
 * helper functions
 */

const sendResponse = (res, resObj, data, extra, contentType = 'application/json') => {

  resObj.data = data || [];
  resObj.message = resObj.message + (extra ? `: ${extra}` : '');
  res.writeHead(resObj.status, {'Content-Type': contentType});
  res.end(JSON.stringify(resObj));

}

const sendItems = (res, err, db, query={}) => {

  if (err) sendResponse(res, RESPONSE.ERROR, null, err.message);

  db.collection(COLLECTION)
    .find(query, {sort: {'_id': 1}})
    .toArray((err, items) => {
      if (err) sendResponse(res, RESPONSE.ERROR, null, err.message);
      sendResponse(res, RESPONSE.OK, items);
      db.close();
  });
}


/*
 * express app routes
 */

app.get('/', (req, res) => {

  const ctx = req.webtaskContext;
  MongoClient.connect(
    ctx.secrets.MONGO_URI, (err, db) => sendItems(res, err, db)
  );

});

app.post('/', (req, res) => {

  const ctx = req.webtaskContext;
  const newItem = ((item) => {

    if (!item || (!item._id && !item.content)) {
      sendResponse(res, RESPONSE.ERROR, null, 'nothing to add.');
    }

    let _item = item;
    // grab only the stuff we care about, everything else is garbage.
    const {_id, content, from, done, ...garbage} = item;
    Object.keys(_item = {_id, content, from, done: !!done})
          .forEach(key => _item[key] === undefined && delete _item[key]);
    return _item;

  })(req.body.item);

  MongoClient.connect(ctx.secrets.MONGO_URI, (err, db) => {

    if (err) sendResponse(res, RESPONSE.ERROR);

    if (newItem._id) {
      const {_id, ...modifyItem} = newItem;
      db.collection(COLLECTION).findAndModify(
        {_id: Mongo.ObjectID(_id)},
        [['_id', 1]],
        {$set: modifyItem},
        (err, result) => sendItems(res, err, db)
      );
    } else {
      db.collection(COLLECTION).insertOne(
        newItem,
        (err, result) => sendItems(res, err, db)
      );
    }

  });

});

app.delete('/', (req, res) => {

  const ctx = req.webtaskContext;
  const itemToRemove = ((item) => {
    if (!item || !item._id) {
      sendResponse(res, RESPONSE.ERROR, null, 'nothing to delete.');
    }
    return {_id: item._id};
  })(req.body.item);

  MongoClient.connect(ctx.secrets.MONGO_URI, (err, db) => {
    db.collection(COLLECTION).findAndRemove(
      {_id: Mongo.ObjectID(itemToRemove._id)},
      (err, result) => sendItems(res, err, db)
    );
  });

});


module.exports = Webtask.fromExpress(app).auth0(auth0Config);
