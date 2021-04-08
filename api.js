const redis = require("redis");
const client = redis.createClient({
 url:"redis://root:nwrNdNNPLanHgwznJAfb@containers-us-west-4.railway.app:7558"
});

client.on('error', err => {
  console.log('Error ' + err);
});

const express = require('express');
const { json } = require('express');
 const Sentry = require('@sentry/node');
 const Tracing = require("@sentry/tracing");
const app = express();
const port = 80;

Sentry.init({
  dsn: "https://2e0b10b296ae4d6bb208345c6e54dd17@o561321.ingest.sentry.io/5698036",
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


app.get('/', async (req, res) => {
    res.setHeader("Location", "https://s.peico.xyz");
    res.status(302).send();             
})
              
  app.get('/favicon.ico', async (req, res) => {
  res.send("favicon.ico");
              })

app.get('/add', async (req, res) => {
            var link = req.query.domain;
            client.get(domain, (err, reply) => {
              console.log(reply)
              if (err){
             res.status(404).send();             
              } else if(reply != null) {
                console.log(reply)
                              res.status(200).send("yep"); 
              } else {
                console.log(123)
                res.status(404).send();             
              }
            });        
            })

app.get('/:tag', async (req, res) => {
            const host = req.headers.host;
            console.log(host);
            var tag = req.params.tag;
            console.log(tag);
            if(tag != undefined || tag != ""){
              client.get(host, (err, reply) => {
                console.log(reply)
                var data = JSON.parse(reply)
                if (err){
                  res.setHeader("Location", "https://s.peico.xyz/fail");
                  res.status(308).send();   
                } else if(reply.includes(tag)) {
                 var url = data[tag][0];
                 var clicks = data[tag][1];
                 var mclicks = data[tag][2];
                 var dclicks = data[tag][3];
                 var ua = req.headers['user-agent'];
                 console.log(ua);
                 var metat = data[tag][4];
                 var metad = data[tag][5];
                 var metai = data[tag][6];
                 var botfollow = data[tag][7];

                if(ua.includes("TelegramBot") || ua.includes("bot") || ua.includes("TwitterBot") || ua.includes("WhatsApp") || ua.includes("facebookexternalhit")  && botfollow === "false"){
                    var content = '';
                    content = content + '<meta property="og:title" content="'+metat+'"/>';
                    content = content + '<meta property="og:description" content="'+metad+'"/>';
                    content = content + '<meta property="og:image" content="'+metai+'"/>';
                    res.status(200).send(content);
                } else {
                 clicks = clicks+1;
                 console.log(clicks);
                 if(ua.match(/iPhone|Android|webOS/)){
                  mclicks = mclicks+1;
                 } else {
                 dclicks = dclicks+1;
                 }
                 data[tag] = [url, clicks, mclicks, dclicks, metat, metad, metai, botfollow];
                 console.log(data)
                 data = JSON.stringify(data);
                 res.setHeader("Location", url);
                 client.set(host, data, (err, reply) => {
                  console.log(err);
                 //res.setHeader('Cache-Control', 's-maxage=3155695200000')
                 res.status(308).send();   
                });
                }} else {
                  res.setHeader("Location", "https://s.peico.xyz/404");
                  res.status(308).send();          
                } 
              }); 
            }
         })



app.listen(port, () => {
  console.log(`App Started!`)
})
