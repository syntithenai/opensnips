var HermodService = require('./HermodService')

  
const record = require('node-record-lpcm16');
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;

var stream = require('stream') 
var Readable = stream.Readable;
var WaveFile = require('wavefile')

class HermodHotword extends HermodService  {

    constructor(props) {
        super(props);
        let that = this;
        this.callbackIds = [];
		this.listening = {};
		this.silent = {};
		this.messageCount = 0;
		
		this.mqttStreams = {};
		
        let eventFunctions = {
        // SESSION
            'hermod/#/hotword/start' : function(topic,siteId,payload) {
				// TODO access control check siteId against props siteId or siteIds
				that.listening[siteId] = true;
				that.startMqttListener(siteId)
		    },
		    'hermod/#/hotword/stop' : function(topic,siteId,payload) {
				that.listening[siteId] = false;
				that.stopMqttListener(siteId)
		    }
        }
		
        this.manager = this.connectToManager(props.manager,eventFunctions);

    }
    
    startMqttListener(siteId) {
		let that = this;
		// subscribe to audio packets
		// use siteId from start message
		let callbacks = {}
		callbacks['hermod/'+siteId+'/microphone/audio'] = this.onAudioMessage.bind(this)
		this.callbackIds = this.manager.addCallbacks(callbacks)
		

		/**	
		 * Hotword
		 */

		var config = {
			models: [
			{
				file: './node_modules/snowboy/resources/models/snowboy.umdl',
				sensitivity: '0.5',
				hotwords : 'snowboy'
			}
			,
			// jarvis universal model triggers license error
			//{
				//file: './node_modules/snowboy/resources/models/jarvis.umdl',
				//sensitivity: '0.5',
				//hotwords : 'jarvis'
			//}
			//,
			{
				file: './node_modules/snowboy/resources/models/smart_mirror.umdl',
				sensitivity: '0.5',
				hotwords : 'smart_mirror'
			}
			],
			detector: {
				resource: "./node_modules/snowboy/resources/common.res",
				audioGain: 2.0,
				applyFrontend: true
			}
		};
		const Detector = require('snowboy').Detector;
		const Models = require('snowboy').Models;
		var silent = {};
		 // snowboy setup
		var models = new Models();
		//if (typeof this.props.models !== 'object') throw new Exception('Missing hotword configuration for models')
		config.models.map(function(thisModel) {
			models.add(thisModel);
		})

		var detector = new Detector(Object.assign({models:models},config.detector));
		//detector.on('silence', function () {
		  //if (!silent[siteId]) console.log('silence '+siteId);
		  //silent[siteId] = true;
		//});

		//detector.on('sound', function (buffer) {
		  //if (silent[siteId])  console.log(['sound '+siteId,buffer.length]);
		  //silent[siteId] = false;		  // <buffer> contains the last chunk of the audio that triggers the "sound"
		  //// event. It could be written to a wav stream.
		  ////console.log('sound');
		//});

		detector.on('error', function () {
		  console.log('error');
		});

		detector.on('hotword', function (index, hotword, buffer) {
		  console.log(['hotword '+siteId, index, hotword]);
		  that.sendMqtt('hermod/'+siteId+'/hotword/detected',{hotword:hotword});
		});

		// mqtt to stream - pushed to when audio packet arrives
		this.mqttStreams[siteId] = new Readable()
		this.mqttStreams[siteId]._read = () => {} // _read is required but you can noop it
        this.mqttStreams[siteId].pipe(detector)	

	}
	
	stopMqttListener(siteId) {
		let that = this;
		if (this.callbackIds) {
			this.callbackIds.map(function(callbackId) {
				that.manager.removeCallbackById(callbackId)
				delete that.mqttStreams[siteId]
				delete that.listening[siteId]
				delete that.silent[siteId]
			1})
		}
	}
	
	onAudioMessage(topic,siteId,buffer) {
		if (this.mqttStreams.hasOwnProperty(siteId)) {
			// add wav header to first packet
			if (this.messageCount == 0) {
				let wav = new WaveFile();
				wav.fromScratch(1, 16000, '16', buffer);
				this.mqttStreams[siteId].push(wav.toBuffer())
			} else {
				this.mqttStreams[siteId].push(buffer)
			}
			this.messageCount++;
	
		}
	}	

}     
module.exports=HermodHotword
 
