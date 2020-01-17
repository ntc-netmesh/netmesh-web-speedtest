require.config({ 
	baseUrl: "static/scripts",
	paths: {
		lib: 'lib',
		app: 'app',
	},
	waitSeconds: 0
});

require([
	//"lib/socket.io",
	"app/gauge",
	"app/ui",
	"app/form",
	"app/main",
],    		
function () {
	var socket = null;
	// TODO: get server list from python server
	let serverList = [{nickname:'DOST-ASTI', url:'http://localhost:5000'},
					  {nickname:'ABC', url:'555.666.777.888'},
					  {nickname:'DEF', url:'999.AAA.BBB.CCC'},
					  {nickname:'GHI', url:'DDD.EEE.FFF.000'}];

	// Dashboard layout
	Dashboard.Init("dashboard", 480, 480);							// canvas ID, width, height
	let speedGauge = new DualGauge({id:'speed', 					// ID, linear scale by default
							rect:new Rect(100,100,380,380), 			// x,y,width,height
							colors:['Cyan','Orange'],				// creates gradient, choose only colors with 'dark' versions
							range:[0,25,10,5],						// minValue(always 0), maxValue, majorTick, minorTick
							text:['DOWNLOAD','UPLOAD','Mbps'],		// speed0, speed1, units
							showPeak:true});
	let pingGauge = new PieGauge({id:'latency', 					// ID, log scale by default
							rect:new Rect(100,100,380,380), 			// x,y,width,height
							colors:['Green'],						// creates gradient, choose only colors with 'dark' versions
							range:[-1,3,1,0.5],						// minValue, maxValue, majorTick, minorTick: in log scale
							text:['PING','ms']});					// speed0, units
	let textColors = ['Khaki', 'White'];
	let IpLabel = new Label({id:'ipaddr',
							rect:new Rect(20,10,400,40),			// x,y,width,height
							colors:textColors,						// label, text
							height: 25,
							label:'IP: ',
							text:''});
	let serverLabel = new Label({id:'server',
							rect:new Rect(260,10,400,40),
							colors:textColors,
							height: 25,
							label:'SERVER: ', offset:40,			// x-offset from label if needed
							text:'Checking connection to server...'});
	let serverIP = new Label({id:'serverIP',
							rect:new Rect(340,35,400,40),
							colors:textColors,
							height: 25,
							label:'', 			// x-offset from label if needed
							text:''});
	let buttonColors = ['rgba(0,0,0,0)', 'DarkKhaki', 'DarkKhaki'];		// button base, hover, click
	let labelColors = ['Khaki', 'Black', 'Red'];						// text base, hover, click
	let goButton = new Button({id:'GO',
							rect:new Rect(0,90,120,120),	// x,y,width,height
							colors:buttonColors,
							textcolors:labelColors,
							label:['START', 'WAIT'],			// if two labels, toggle button
							tooltip:'Start speed test',
							onClick:goButtonHandler});
	let multiButton = new Button({id:'Single',
							rect:new Rect(20,220,80,80),
							colors:buttonColors,
							textcolors:labelColors,
							label:['Single', 'Multi'],
							tooltip:'Select single or multi stream',
							onClick:multiButtonHandler});
	let serverButton = new Button({id:'Server',
							rect:new Rect(20,310,80,80),
							colors:buttonColors,
							textcolors:labelColors,
							tooltip:'Select server',
							onClick:serverButtonHandler});
	let aboutButton = new Button({id:'About',
							rect:new Rect(20,400,80,80),
							colors:buttonColors,
							textcolors:labelColors,
							onClick:aboutButtonHandler});		// no onClick, nothing happens
	let serverForm = null;
	let aboutBox = null;

	let mySettings = {
                pingTestCount: 20,
                dlTestCount: 5,
                ulTestCount: 5,
                challengeCount: 1,
                dlSize: 512*1024, //in bytes
                ulSize: 512*1024, //in bytes
            };

	// button click handlers
	const WDTIMEOUT = 10;
	let watchdog = false;
	function goButtonHandler() {
		console.log ('Go button clicked!');
		speedGauge.reset();
		pingGauge.reset();

		if (socket) {
			goButton.enable = false;
			multiButton.enable = false;
			serverButton.enable = false;
			socket.emit('start', {settings:mySettings});

			// Optional: start watchdog
			watchdog = true;
			setTimeout(() => {
				if (watchdog == true) {
					testEnd(false, `Server not responding or connection lost.`);
				};
			}, WDTIMEOUT*1000);
		}
		else {
			testEnd(false, `Server connection failure.`);
		}
	}
	function multiButtonHandler() {
		console.log ('Multi button clicked!');
		// TODO: toggle single and multi stream
	}
	function serverButtonHandler() {
		console.log ('Server button clicked!');
		goButton.enable = false;
		multiButton.enable = false;
		serverButton.enable = false;

		serverForm = new ServerForm({id:'Select server', 
						list:serverList, 
						callback:serverChanged,
						filter:searchChanged,
						onClose:closeServer});
	}
	function aboutButtonHandler() {
		console.log ('About button clicked!');
		aboutButton.enable = false;
		aboutBox = new AboutBox({id:'About',
						message:'This is a sample message',
						onClose:closeAbout});
	}
	// Form callbacks
	function serverChanged(ev) {
		//console.log(ev);
		let selectedServer = serverForm.selectedServer;
		serverLabel.text = selectedServer;
//		serverIP.label = getServerUrl(selectedServer);
		//close form
		console.log (`Server changed to: ${serverIP.label}`);
		serverForm.parent.removeChild(serverForm.newForm);
		// reenable buttons
		goButton.enable = true;
		multiButton.enable = true;
		serverButton.reset();
		
		// TODO: reestablish new socket connection
		connectToServer(selectedServer);
	}
	function getServerUrl(name) {
		for (let l of serverList) {
			if (l.nickname == name) return (l.url + '/speedtest');
		}
		return '/speedtest';
	}
	function searchChanged() {
		let opts = [];
		for (let l of serverList) {
			if (l.nickname.toLowerCase().includes(serverForm.filterString.toLowerCase())) {
				opts.push(l.nickname);
			}
		}
		serverForm.updateOptions(opts);
	}
	function closeServer() {
		goButton.enable = true;
		multiButton.enable = true;
		serverButton.reset();
		serverForm.parent.removeChild(serverForm.newForm);
	}
	function closeAbout() {
		aboutButton.reset();
		aboutBox.parent.removeChild(aboutBox.newForm);
	}
	function testEnd(status=true, msg='') {
		goButton.reset();
		multiButton.enable = true;
		serverButton.enable = true;
		watchdog = false;
		setTimeout(() => {
            if (status) {
                speedGauge.end = true;
                pingGauge.end = true;
            }
		    if (msg) alert(msg);
	    }, 250); // <- delays by 250ms
    }

	// socket connection and message handler
	function connectToServer(servername) {
		let url = getServerUrl(servername);
		console.log(url);
		socket = io(url, { forceNew: true });	//<- this should be new server url
		// TODO: if unable to establish connection, drop socket

		var dlBinBlob = new Uint8Array(mySettings.dlSize);
        var ulBinBlob = new Uint8Array(mySettings.ulSize);
        var last32bytes = new Uint8Array(32);

        socket.on('my_response', function(msg, cb) {
                if (cb) {
                    cb(socket.id);
                }
                watchdog = false;
                switch(msg.state){
                    case 4: {  // DL state
                        dlBinBlob = msg.bin;
                        last32bytes = dlBinBlob.slice(-32)
                        socket.emit('next', {state: msg.state, hash:last32bytes});
                        break;
                    }
                    case 5:{  // get UL file state
                        ulBinBlob = msg.bin;
                        socket.emit('next', {state: msg.state});
                        break;
                    }
                    case 6: {  // commence UL state
                        socket.emit('next', {state: msg.state, bin: ulBinBlob});
                        break;
                    }
                    case 100: {  // Results state
                        speedGauge.speed0 = parseFloat(msg.results.dl*8)/(1024*1024);	// to Mbps
                        pingGauge.ping = Math.log(parseFloat(msg.results.rttAve*1000))/Math.LN10;
                        speedGauge.speed1 = parseFloat(msg.results.ul*8)/(1024*1024);	// to Mbps
                        break;
                    }
                    case 101: { // Test
                        testEnd(true, msg='Test has completed!');
                        socket.disconnect();
                        break;
                    }
                    case -99: {  // Error State
                        testEnd(true, msg="Test error. ")
                        break;
                    }
                    default:{  // fallback for all other events
                        socket.emit('next', {state: msg.state});
                        break;
                    }
                }
            });
	}

	// code will execute from here
	try {
		aboutButton.enable = true;
		console.log('at connect, check server ping here')

        let promises = [];
        for (let server of serverList) {
            let p = new Promise((resolve, reject) => {
                let wdt = true;
                let tempsocket = io(server.url + '/pingpong');   // add a setTimeout delay if you want
                let start = (new Date).getTime();

                tempsocket.on('pong', (ev) => {
                    wdt = false;
                    promise_watchdog = false;
                    latency = (new Date).getTime() - start;
                    tempsocket.disconnect();
                    resolve({s:server, l:latency});  // or resolve(ev);
                });

                setTimeout(() => {
                    if (wdt == true) {
                        tempsocket.disconnect();
                        resolve(Number.MAX_VALUE); // a very large dummy value
                   }
               }, 2000);
            })
            promises.push(p);
        }

        Promise.all(promises)
            .then(values => {
                // process values here
                min = Number.MAX_VALUE;  // initialize to an arbitrarily large number
		        nearest_server = null;

                for (let item of values){
                    if (item.l <= min){
                        nearest_server = item.s;
                        min = item.l;
                    }
                }

                setTimeout(() => {
                    if (nearest_server != null){
                        serverLabel.text = nearest_server.nickname;
                        goButton.enable = true;
                        multiButton.enable = true;
                        serverButton.enable = true;
                        connectToServer(nearest_server.nickname);
                    }
                    else {
                        serverLabel.text = 'Server connection failed.'
                        goButton.enable = false;
                        multiButton.enable = false;
                        serverButton.enable = false;
                        testEnd(false, `Server connection failure. Please reload the page to try again.`);
                    }
                }, 1000);
            })
            .catch(error => { // <- optional
                console.error(error.message)
             });

	}
	catch(e) {
		socket = null;
	}
});
