function myLog(msg){
    $('#log').append('<br>' + $('<div/>').text(msg.log + ', state: ' + msg.state).html());
}

function displayResults(msg){
    ul = msg.results.ul / (1024*1034);      // TODO: add a switch for units
    dl = msg.results.dl / (1024*1034);
    $('#ul').text(ul + ' Mbps');
    $('#dl').text(dl + ' Mbps');
    $('#rtt').text(msg.results.rtt + ' ms' );
}

$(document).ready(function() {

            namespace = '/speedtest';

            //     http[s]://<domain>:<port>[/<namespace>]
            var socket = io(namespace);  // Create socket and connect to the server.
            var binblob = 0;

            // Handler for start test button
            $('form#emit').submit(function(event) {
                socket.emit('start');
                $("#speedtest-button").attr("disabled", true);
                return false;
            });

            // Event handler for server sent data.
            socket.on('my_response', function(msg, cb) {
                switch(msg.state){
                    case 0: {
                        socket.emit('next', {'state': msg.state});
                        myLog(msg);
                        break;
                    }
                    case 1: {
                        socket.emit('next', {'state': msg.state});
                        myLog(msg);
                        break;
                    }
                    case 2: {
                        socket.emit('next', {'state': msg.state});
                        myLog(msg);
                        break;
                    }
                    case 3: {
                        binblob = msg.bin;
                        // TODO: some error handling routine if download fails (i.e. size mismatch)
                        socket.emit('next', {'state': msg.state});
                        myLog(msg);
                        break;
                    }
                    case 4: {
                        socket.emit('next', {'state': msg.state, bin: binblob});
                        myLog(msg);
                        break;
                    }
                    case 5: {
                        socket.emit('next', {'state': msg.state});
                        myLog(msg);
                        break;
                    }
                    case 100: {  // Results state
                        myLog(msg);
                        displayResults(msg);
                        $("#speedtest-button").attr("disabled", false);
                        break;
                    }
                    default:{

                    }
                }
            });
});