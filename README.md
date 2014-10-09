# Get Comics

*	Scrape daily comic images from popular sites (e.g.: gocomics, dilbert)
*	Creates an archive of daily comics
*	Emails each comic to a list of BCC recipients

## Installation

    npm install
    cp comics.json.example comics.json
    cp smtpauth.json.example smtpauth.json

You have to edit `comics.json` and `smtpauth.json` before running.

## Dependencies

See: `package.json`

NB: This package has been tested with [nodemailer][nodemailer] 0.6.3. Later versions do not work. Not sure why.

## Usage

To fetch today's comics:

    node getcomics.js

To fetch historical comics:

    node getcomics.js YYYY-MM-DD
    eg: node getcomics.js 2014-04-01

## Defining the Comics to download

The file `comics.json` defines a list of comics to download. For example:

    [
        {
            "comictype": "dilbert",
            "divclass": ".STR_Image",
            "isRelative": true,
            "dtformat": "YYYY-MM-DD",
            "subject": "Dilbert",
            "bcc": "me@myemail.com",
            "url": "http://www.dilbert.com",
            "targetfile": "/home/myusername/Dropbox/Comics/dilbert/dilbert.",
            "extension": ".gif"
        },
        {
            "comictype": "gocomic",
            "divclass": ".feature_item",
            "isRelative": false,
            "dtformat": "YYYY\/MM\/DD",
            "subject": "Calvin and Hobbes",
            "bcc": "me@myemail.com",
            "url": "http://www.gocomics.com/calvinandhobbes",
            "targetfile": "/home/myusername/Dropbox/Comics/calvinandhobbes/calvinandhobbes.",
            "extension": ".gif"
        }
    ]

Description of attributes in `comics.json`:

    comictype:  "Deprecated"
    divclass: "The name of the <div> tag containing the image file"
    isRelative: "Is the image url relative?""
    dtformat: "Format applied to the url when fetching historical data (ie: http://www.dilbert.com/2014-04-01 would require YYYY-MM-DD)""
    subject: "Subject line of email"
    bcc: "Target recipients"
    url: "Base url of comic site"
    targetfile: "Full path and filename (minus extension) of the target download (NB: folder must exist)""
    extension: "Extension of the downloaded file"

NB: The file will be saved using the pattern targetfile+YYYY-MM-DD+extension (eg: /path/dilbert.2014-04-01.gif)

## Defining SMTP Authorisation

`getcomics.js` uses `nodemailer` to send daily comic emails.

You must define your sender email and `nodemailer` transport attributes in the file `smtpauth.json`. For example:

    {
        "sender": "My Name <me@myemail.com>",
        "transport": {
            "service": "Gmail",
            "auth": {
                "XOAuth2": {
                    "user": "me@myemail.com",
                    "clientId": "myclientid",
                    "clientSecret": "myclientsecret",
                    "refreshToken": "myrefreshtoken"
                }
            }
        }
    }

Please refer to the [nodemailer][nodemailer] documentation for transport examples. If you are interested, the following [link][oauth] gives an excellent tutorial on configuring OAuth for Gmail.

## TODO

*   Add a switch to disable email sending
*   Test newer versions of `nodemailer`

[nodemailer]: https://github.com/andris9/Nodemailer
[oauth]: http://masashi-k.blogspot.co.uk/2013/06/sending-mail-with-gmail-using-xoauth2.html
