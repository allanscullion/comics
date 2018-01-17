var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var nodemailer = require('nodemailer');
var fs = require('fs');
var randomstring = require('randomstring');
var encoder = require('node-html-encoder').Encoder;

function load_json(filename, callback) {

    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            callback(err, null);
            return;
        }
 
        data = JSON.parse(data);
        callback(null, data);
    });
}

///
/// Download a file from uri...
/// ... Save it to filename...
/// ... Call callback
///
function download(uri, filename, callback) {

    request.head(uri, function(err, res, body) {
        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);

        var r = request(uri).pipe(fs.createWriteStream(filename));
        r.on('close', callback);
    });
};


///
/// Get a Comic
///
function get_comic(comic, dt, filename, callback) {
    var u = comic.url

    if (comic.dtformat != null)
        u = comic.url + '/' + moment(dt).format(comic.dtformat)

    console.log("Scraping: " + u);

    request(u, function(err, resp, body) {
        if (err)
            throw err;

        $ = cheerio.load(body);

        var img_url = $(comic.divclass).find('img');

        if (img_url.length > 0) {
            var full_url = comic.isRelative == true ? comic.url + img_url.attr('src') : img_url.attr('src');
            var enc = new encoder('entity');
            comic.title = enc.htmlEncode(img_url.attr('title'));

            //
            // Sometimes they leave off the http: part of the URL
            //
            if (full_url[0] == '/')
                full_url = 'http:' + full_url;

            console.log("Found image: " + full_url);
            console.log("Title: " + comic.title);

            download(full_url, filename, function() {
                console.log("Downloaded: " + filename);
                email_file(comic, dt, filename);
            });
        } 
        else {
            console.log("Image not found in " + u);
        }
    });
}

///
/// Email the comic
///
function email_file(comic, dt, comicfile) {
    load_json("./smtpauth.json", function(err, smtpauth) {
        if (err) {
            console.log("Failed loading SMTP Authorisation file - " + err);
            return;
        }

        console.log("Emailing file: " + comicfile);

        //
        // create reusable transport method (opens pool of SMTP connections)
        //
        // With thanks to http://masashi-k.blogspot.co.uk/2013/06/sending-mail-with-gmail-using-xoauth2.html
        //
        var smtpTransport = nodemailer.createTransport("SMTP", smtpauth.transport); 

        //
        // Generate a unique CID for the image
        //
        var rand_cid = randomstring.generate(32);
        var subjecttext = comic.subject + " - " + moment(dt).format('YYYY-MM-DD');
        //
        // setup e-mail data with unicode symbols
        //
        var title = comic.title == undefined ? "" : comic.title;
        var mailOptions = {
            from: smtpauth.sender, // sender address
            bcc: comic.bcc,
            subject: "[Daily Comic] - " + subjecttext, // Subject line
            text: subjecttext, // text body
            html: "<h2>" + subjecttext + "</h2><img src='cid:" + rand_cid + "' title='" + title + "' /><p>" + title + "</p>", // html body
            attachments: [{
                filename: comicfile.substr(comicfile.lastIndexOf("/") + 1),
                filePath: comicfile,
                cid: rand_cid //same cid value as in the html img src
            }]
        }

        //
        // send mail with defined transport object
        //
        smtpTransport.sendMail(mailOptions, function(error, response) {
            if (error) {
                console.log(error);
            } else {
                console.log("Message sent: " + response.message);
            }

            smtpTransport.close();
        });
    });
}

//
// Get today's date
//
var dt = new moment();
var historic = false;
var comics_file = "comics.json"

if (process.argv.length > 2) {

    //
    // Override the date if supplied on the command line
    //
    if (process.argv.length > 3) {
        dt = moment(process.argv[3]);
        historic = true;
    }

    comics_file = process.argv[2];

    load_json(comics_file, function(err, comics) {

        if (err) {
            console.log(err);
        } else {

            //
            // Loop over the Comic targets, downloading and emailing each targetfile
            //
            for (var i = 0, l = comics.length; i < l; i++) {

                if (historic) {
                    if (comics[i].historic == false) {
                        console.log('Error: Comic ' + comics[i].subject + ' does not support historic fetching');
                        continue;
                    }
                }

                //
                // Get the day of week
                //
                var dow = moment(dt).format('E');

                // Assume the comic is published seven days a week
                var dowmask = 127;

                // Override the published days bitmask if defined
                if (comics[i].published != null)
                    dowmask = comics[i].published;

                // Do we publish on this day?
                if (dowmask & (1 << (dow - 1))) {
                    var filename = comics[i].targetfile + moment(dt).format('YYYY-MM-DD') + comics[i].extension;
                    get_comic(comics[i], dt, filename);
                }
            }
        }
    });
} else {
    console.log("usage: node getcomics.js <comics.json> <date>");
}
