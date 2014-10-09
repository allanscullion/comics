var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var nodemailer = require('nodemailer');
var fs = require('fs');
var randomstring = require('randomstring');

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
	var u = comic.url + '/' + moment(dt).format(comic.dtformat)
	console.log("Scraping: " + u);

	request(u, function(err, resp, body) {
	    if (err)
	        throw err;

	    $ = cheerio.load(body);

	    var img_url = $(comic.divclass).find('img');

	    if (img_url.length > 0) {
			var full_url = comic.isRelative == true ? comic.url + img_url.attr('src') : img_url.attr('src');
			console.log("Found image: " + full_url);

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
		var mailOptions = {
		    from: smtpauth.sender, // sender address
		    bcc: comic.bcc,
		    subject: "[Daily Comic] - " + subjecttext, // Subject line
		    text: subjecttext, // text body
		    html: "<h2>" + subjecttext + "</h2><img src='cid:" + rand_cid + "' />", // html body
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

//
// Override the date if supplied on the command line
//
if (process.argv.length > 2)
	dt = moment(process.argv[2]);

load_json("./comics.json", function(err, comics) {

	//
	// Loop over the GoComic targets, downloading and emailing each targetfile
	//
	for (var i = 0, l = comics.length; i < l; i++) {
	
		var filename = comics[i].targetfile + moment(dt).format('YYYY-MM-DD') + comics[i].extension;
		get_comic(comics[i], dt, filename);
	}
});
