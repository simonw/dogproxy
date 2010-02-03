var port = 8009;

// Requries http://github.com/danwrong/restler
var sys = require('sys'), 
    http = require('http'),
    url_mod = require('url'),
    rest = require('./lib/restler')
;

var in_flight = {};

http.createServer(function (req, res) {
    var bits = url_mod.parse(req.url, true);
    if (!bits.query || !bits.query.url) {
        res.sendHeader(500, {'Content-Type': 'text/plain'});
        res.sendBody('Error - no URL specified');
        res.finish();
        return;
    }
    var url = bits.query.url;
    sys.puts('Request for ' + url);
    function complete(status, content_type, body) {
        res.sendHeader(status, {'Content-Type': content_type||'text/plain'});
        res.sendBody(body);
        res.finish();
    }
    if (in_flight[url]) {
        in_flight[url].push(complete);
        sys.puts('... already in flight, adding to queue')
    } else {
        in_flight[url] = [complete];
        sys.puts('... kicking off backend HTTP fetch')
        function done(body, response) {
            var status = response.statusCode;
            var content_type = response['content-type'];
            if (!in_flight[url]) {
                return;
            }
            sys.puts(
                'Fetched ' + url + ', alerting ' + in_flight[url].length + 
                ' waiting clients'
            );
            in_flight[url].forEach(function(callback) {
                callback(status, content_type, body);
            });
            delete in_flight[url];
        }
        rest.get(url).addListener('complete',done).addListener('error',done);
    }
}).listen(port);

sys.puts('Server running at http://127.0.0.1:' + port + '/');
