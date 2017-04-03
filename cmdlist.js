'use latest';

const Express = require('express');
const Webtask = require('webtask-tools');
const jwt = require('jsonwebtoken@7.1.9');
const app = new Express();
app.use(require('body-parser').json());

const RESPONSE = {
  OK: {
    status: 200,
    message: 'ok'
  },
  ERROR: {
    status: 400,
    message: 'error'
  },
  UNAUTHORIZED: {
    status: 401,
    message: 'unauthorized'
  }
}

const sendResponse = (res, resObj, extraData, contentType = 'application/json') => {
  resObj.data = extraData || [];
  res.writeHead(resObj.status, {'Content-Type': contentType});
  res.end(JSON.stringify(resObj));
}


/**
 * auth0 config (doesn't work atm)
 */

const auth0Config = {
  validateToken: (ctx, req, token, cb) => {
    const authParams = {
      clientSecret: ctx.secrets.AUTH0_CLIENT_SECRET,
      audience: ctx.secrets.AUTH0_AUDIENCE,
      domain: ctx.secrets.AUTH0_DOMAIN
    }

    console.log('authParams', authParams);
    console.log('token', token);

    if (!authParams) {
      return cb({
        code: 400,
        message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
      });
    }

    // Validate Auth0 issued id_token
    let user;
    try {
      user = jwt.verify(token, authParams.clientSecret,
        {
          algorithms: ['HS256'],
          audience: authParams.clientSecret.audience,
          issuer: `https://${ctx.secrets.AUTH0_DOMAIN}/`
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
  loginError: (error, ctx, req, res, baseUrl) => sendResponse(res, RESPONSE.UNAUTHORIZED)
}


/**
 * express app routes
 */


app.post('/', (req, res) => {
  const ctx = req.webtaskContext;
  const newItem = req.body.item;

  if (newItem) {
    ctx.storage.get((err, data) => {

      if (err) {
        sendResponse(res, RESPONSE.ERROR);
      }
      let list = data || [];
      list.push(newItem);

      ctx.storage.set(list, (err) => {
        if (err) {
          sendResponse(res, RESPONSE.ERROR);
        } else {
          sendResponse(res, RESPONSE.OK, list);
        }
      });

    });
  } else {
    sendResponse(res, RESPONSE.ERROR);
  }
});

app.get('/', (req, res) => {
  const ctx = req.webtaskContext;
  ctx.storage.get((err, data) => {
    if (err) {
      sendResponse(res, RESPONSE.ERROR);
    } else {
      sendResponse(res, RESPONSE.OK, data);
    }
  });
});


module.exports = Webtask.fromExpress(app);
