const redis = require("redis");
const client = redis.createClient({
 url:process.env.REDIS_URL,
 user:process.env.REDISUSER,
 password:process.env.REDISPASSWORD
});
const lookup = require('safe-browse-url-lookup')({ apiKey: 'AIzaSyDgjoHEfUjfZeIlUGOFEgCRdNKUmGNSlb8' });
const Limiter = require("ratelimiter");


client.auth(process.env.REDISPASSWORD);

client.on('error', err => {
  console.log('Redis-Error ' + err);
});


const express = require('express');
const { json } = require('express');
 const Sentry = require('@sentry/node');
 const Tracing = require("@sentry/tracing");
const app = express();
const port = process.env.PORT || 8000;

Sentry.init({
  dsn: "https://b83f7f6951c2496fa4cccad12a30ca34@o561321.ingest.sentry.io/5710687",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());
app.use(Sentry.Handlers.errorHandler());

app.use(
    Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all 404 and 500 errors
        if (error.status === 404 || error.status === 403 || error.status === 500) {
          return true;
        }
        return false;
      },
    })
  );

app.get('/', async (req, res) => {
    res.setHeader("Location", "https://s.peico.xyz");
    res.status(302).send();             
})

  app.get('/favicon.ico', async (req, res) => {
  res.send("favicon.ico");
              })

app.get('/add', async (req, res) => {
  var id = req.header("CF-Connecting-IP");
  console.log(req.headers);
  console.log(id);

  var limit = new Limiter({ id: id, db: client });
  limit.get(function(err, limit){
    if (err) throw new Error(err);
   
    res.set('X-RateLimit-Limit', limit.total);
    res.set('X-RateLimit-Remaining', limit.remaining - 1);
    res.set('X-RateLimit-Reset', limit.reset);
   
    // all good
    if (limit.remaining){
      var murl = req.query.url;
      res.setHeader('Access-Control-Allow-Origin', 'https://s.peico.xyz')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
      if (murl != null && murl != undefined) {
          if(murl.includes("peico.xyz")){
           res.status(404).send("You can't shorten a already shortened URL. Error Code 001");
          } else {
          lookup.checkSingle(murl).then(async isMalicious => {
           if(isMalicious){
             res.status(403).send("This URL seems Evil. Error Code 003 ");
           } else {
             var tag = Math.random().toString(36).toUpperCase().substr(3, 5);  
             var arr = [murl, 0,0,0]
             var arrd = JSON.stringify(arr)
             client.set(tag, arrd,  (err, reply)=>{
                 console.log(err)
              if(err === null){
                  res.send(tag);
               } else {
                  res.status(500).send("Opps, something went wrong! Error Code 004");
               } 
          })
          };
     }).catch(err => {
             res.status(502).send("Opps, something went wrong! Error Code 002 ");
     })
  }} else { 
    res.send('<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><br/><b>This is the API endpoint for only Peico Free Basic</b>');
   }
    }
   
    // not good
    var delta = (limit.reset * 1000) - Date.now() | 0;
    var after = limit.reset - (Date.now() / 1000) | 0;
    res.set('Retry-After', after);
    res.send(429, 'Rate limit exceeded, retry in ' + delta);

 
});

            })

app.get('/:tag', async (req, res) => {
            var tag = req.params.tag;
            if(tag != undefined || tag != ""){
              client.get(tag, (err, reply) => {
                console.log(reply)
                var data = JSON.parse(reply)
                if (err){
                  res.setHeader("Location", "https://s.peico.xyz/fail");
                  res.status(308).send();   
                } else if(reply != null) {
                 var url = data[0];
                 var clicks = data[1];
                 var mclicks = data[2];
                 var dclicks = data[3];
                 clicks = clicks+1;
                 console.log(clicks);
                 var ua = req.headers['user-agent'];
                 if(ua.match(/iPhone|Android|webOS/)){
                 mclicks = mclicks+1;
                 } else {
                 dclicks = dclicks+1;
                 }
                 data = [url, clicks, mclicks, dclicks];
                 console.log(data)
                 data = JSON.stringify(data);
                 res.setHeader("Location", url);
                 client.set(tag, data, (err, reply) => {
                  console.log(err);
                 //res.setHeader('Cache-Control', 's-maxage=3155695200000')
                 res.status(308).send();   
                });
                } else {
                  res.setHeader("Location", "https://s.peico.xyz/404");
                  res.status(308).send();       
                } 
              }); 
            }
         })



app.listen(port, () => {
  console.log(`App Started!`)
})
