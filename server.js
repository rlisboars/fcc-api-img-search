require('dotenv').config();
const express = require('express');
const request = require('request');
const dbClient = require('mongodb').MongoClient;
const queryString = require('querystring');
const port = process.env.PORT || 8080;
const dbURL = process.env.DBURI;
const imageAPI = process.env.IMGAPI;

const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.render('index', { url: req.protocol + '://' + req.get('host') });
});

app.get('/api/imgsearch/:search', (req, res) => {
    res.contentType('application/json');
    const offset = req.query.offset;
    const search = queryString.escape(req.params.search);
    const urlAPI = imageAPI+"q="+search+"&image_type=all&page="+offset

    if(typeof offset === 'undefined') {
        res.end(JSON.stringify({ error : "missing offset parameter" }));
        return;
    }
    request(urlAPI, (err, resImg, body) => {
        if (resImg.statusCode != 200) {
            res.end(JSON.stringify({ error: "Error when connecting to images API" }));
            return;
        }
        const result = JSON.parse(body);
        const hits = result.hits;
        let searchResult = [];
        if (hits.length == 0) {
            res.end(JSON.stringify({ error: "No results found" }));
        }
        hits.forEach((hit) => {
             searchResult.push({
                tags: hit.tags,
                previewURL: hit.previewURL,
                webformatURL: hit.webformatURL,
                pageURL: hit.pageURL
            });
        });
        saveSearch(req.params.search, new Date(Date.now()));
        res.end(JSON.stringify(searchResult));
    });
});

app.get('/api/latest', (req, res) => {
    res.contentType('application/json');
    dbClient.connect(dbURL, (err, db) => {
        if (err) {
            return res.end(JSON.stringify({ error: 'Error connecting to database' }));
        }
        var collection = db.collection('img-searches');
        collection.find({},{ _id: false }).limit(10).sort({ _id: -1}).toArray((err, logs) => {
            res.end(JSON.stringify(logs));
        });
    });
});

function saveSearch(therm, date) {
    dbClient.connect(dbURL, (err, db) => {
        if (err) {
            return console.log(err.message);
        } 
        var collection = db.collection('img-searches');
        collection.insert({ therm: therm, date: date }, (err, result) => {
            if (err) {
                db.close();
                return console.log(err.message);
            }
            db.close();
        });
    });
};

app.listen(port, () => {
    console.log('Server started on port '+ port);
});