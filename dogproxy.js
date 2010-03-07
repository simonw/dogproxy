var port = 8009;

// Requries http://github.com/danwrong/restler
var sys = require('sys'), 
    http = require('http'),
    url_mod = require('url'),
    events = require('events'),
    rest = require('./lib/restler')
;

var in_flight = new events.EventEmitter();

http.createServer(function (req, res) {
    var bits = url_mod.parse(req.url, true);
    if (!bits.query || !bits.query.url) {
        res.sendHeader(500, {'Content-Type': 'text/plain'});
        res.write('Error - no URL specified');
        res.close();
        return;
    }
    var url = bits.query.url;
    sys.puts('Request for ' + url);
    function complete(status, content_type, body) {
        res.sendHeader(status, {'Content-Type': content_type||'text/plain'});
        res.write(body);
        res.close();
    }
    if (in_flight.listeners(url).length > 0) {
        in_flight.addListener(url, complete);
        sys.puts('... already in flight, adding to queue')
    } else {
        in_flight.addListener(url, complete);
        sys.puts('... kicking off backend HTTP fetch')
        function done(body, response) {
            var status = response.statusCode;
            var content_type = response['content-type'];
            sys.puts(
                'Fetched ' + url + ', alerting ' + in_flight.listeners(url).length + 
                ' waiting clients'
            );
            in_flight.emit(url, status, content_type, body);
            in_flight.listeners(url).length = 0;
        }
        rest.get(url).addListener('complete',done).addListener('error',done);
    }
}).listen(port);

sys.puts('Server running at http://127.0.0.1:' + port + '/');
