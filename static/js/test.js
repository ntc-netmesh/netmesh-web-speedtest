function myLog(msg){
    $('#log').append('<br>' + $('<div/>').text(msg.log + ', state: ' + msg.state).html());
}

function displayResults(msg){
    ul = msg.results.ul / (1024*1024);      // TODO: add a switch for units
    dl = msg.results.dl / (1024*1024);
    rtt = msg.results.rtt * 1000;
    $('#ul').text(ul + ' Mbps');
    $('#dl').text(dl + ' Mbps');
    $('#rtt').text(rtt + ' ms' );
}

$(document).ready(function() {

            namespace = '/speedtest';
            //  http[s]://<domain>:<port>[/<namespace>]
            const socket = io(namespace);  // Create socket and connect to the server.
//            var multiSocket[10] = io(namespace);

            // default values, should be changeable in form
            var mySettings = {
                pingTestCount: 20,
                dlTestCount: 10,
                ulTestCount: 5,
                challengeCount: 1,
                dlSize: 512*1024, //in MB
                ulSize: 512*1024, //in MB
            };
            var dlBinBlob = new Uint8Array(mySettings.dlSize);
            var ulBinBlob = new Uint8Array(mySettings.ulSize);
            var myHash = new Uint8Array(512);

            // Handler for start test button
            $('form#emit').submit(function(event) {
                socket.emit('start', {settings:mySettings});
                $("#speedtest-button").attr("disabled", true);
                $('#log').append('<br>' + $('<div/>').text(socket.id).html());

                return false;
            });

            // Event handler for server sent data.
            socket.on('my_response', function(msg, cb) {
                if (cb) {
                    cb(socket.id);
                }
                switch(msg.state){
                    case 3: {  // DL state
                        dlBinBlob = msg.bin;
                        myHash = sha512.hex(dlBinBlob);
                        socket.emit('next', {state: msg.state, hash:myHash});
                        break;
                    }
                    case 4:{  // get UL file state
                        ulBinBlob = msg.bin;
                        socket.emit('next', {state: msg.state});
                        break;
                    }
                    case 5: {  // commence UL state
                        socket.emit('next', {state: msg.state, bin: ulBinBlob});
                        break;
                    }
                    case 100: {  // Results state
                        displayResults(msg);
                        $("#speedtest-button").attr("disabled", false);
                        break;
                    }
                    case -99: {  // Error State
                        break;
                    }
                    default:{  // fallback for all other events
                        socket.emit('next', {'state': msg.state});

                        break;
                    }
                }
                myLog(msg);
            });
});