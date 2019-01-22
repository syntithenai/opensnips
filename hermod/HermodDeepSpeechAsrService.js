var HermodService = require('./HermodService')

var stream = require('stream') 
var Readable = stream.Readable;
var Writable = stream.Writable;
var PassThrough = stream.PassThrough;
var WaveFile = require('wavefile')
var VAD= require('node-vad')


const config = require('./config');
const Ds = require('deepspeech');
const MemoryStream = require('memory-stream');
const Wav = require('node-wav');
const Duplex = require('stream').Duplex;
const util = require('util');


class HermodDeepSpeechAsrService extends HermodService  {
    constructor(props) {
        super(props);
        let that = this;
        this.callbackIds = [];
		this.listening = {};
		this.silent = {};
		this.messageCount = 0;
		
		this.mqttStreams = {};
		this.silenceStreams = {};
		this.wordBreakStreams = {};
		this.asrStreams = {};
		this.asrBuffers = {};
		this.vadSilent = {};
		this.inWordBreak = {};
		
        let eventFunctions = {
        // SESSION
            'hermod/#/asr/start' : function(topic,siteId,payload) {
				// TODO access control check siteId against props siteId or siteIds
				that.listening[siteId] = true;
				that.startMqttListener(siteId)
		    },
		    'hermod/#/asr/stop' : function(topic,siteId,payload) {
				console.log('stop hotword')
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
		
		var asrDetector = new Writable()
		asrDetector._write = function(buffer,encoding,cb) {
			console.log(['write asr',buffer])
			console.log(buffer);
			cb(); //It is important to callback, so that our stream can process the next chunk. 
		}
		
		var through = new PassThrough

		// mqtt to stream - pushed to when audio packet arrives
		this.mqttStreams[siteId] = new Readable()
		this.mqttStreams[siteId]._read = () => {} // _read is required but you can noop it
        this.mqttStreams[siteId].pipe(through)	
        
       	this.vadSilent[siteId] = false;
        this.inWordBreak[siteId] = false;
	
        
		const silenceDetector = VAD.createStream({
			mode: VAD.Mode.NORMAL,
			audioFrequency: 16000,
			debounceTime: 1000
		});

		silenceDetector.on("data", function(data) {
			//console.log('silence data')
				//console.log(data)		
			if (that.vadSilent[siteId] !== data.speech.state) {
				if (!data.speech.state) console.log('end utterance '+siteId)
				if (data.speech.state) console.log('start utterance '+siteId)
				// NOW SEND THE WHOLE BUFFER TO ASR ENGINE
				//that.stt(that.asrStreams[siteId]);
				that.asrStreams[siteId].pipe(asrDetector)
				//console.log('silence data')
				//console.log(data.speech.state)		
			}
			that.vadSilent[siteId] = data.speech.state;
		});
		
		const wordBreakDetector = VAD.createStream({
			mode: VAD.Mode.NORMAL,
			audioFrequency: 16000,
			debounceTime: 5
		});

		wordBreakDetector.on("data", function(data) {
			//console.log('silence data')
				//console.log(data)		
			if (that.inWordBreak[siteId] !== data.speech.state) {
				if (!data.speech.state) console.log('end word '+siteId)
		//		if (data.speech.state) console.log('start utterance')
				//console.log('silence data')
				//console.log(data.speech.state)		
			}
			that.inWordBreak[siteId] = data.speech.state;
		});

        
        // mqtt to stream - pushed to when audio packet arrives
		this.silenceStreams[siteId] = new Readable()
		this.silenceStreams[siteId]._read = () => {} // _read is required but you can noop it
        this.silenceStreams[siteId].pipe(silenceDetector)	
        // mqtt to stream - pushed to when audio packet arrives
		this.wordBreakStreams[siteId] = new Readable()
		this.wordBreakStreams[siteId]._read = () => {} // _read is required but you can noop it
        this.wordBreakStreams[siteId].pipe(wordBreakDetector)	
        // mqtt to stream - pushed to when audio packet arrives
		this.asrStreams[siteId] = new Readable()
		this.asrStreams[siteId]._read = () => {} // _read is required but you can noop it
        //this.asrStreams[siteId].pipe(wordBreakDetector)	
	}
	
	stopMqttListener(siteId) {
		let that = this;
		if (this.callbackIds) {
			this.callbackIds.map(function(callbackId) {
				that.manager.removeCallbackById(callbackId)
				delete that.mqttStreams[siteId]
				delete that.listening[siteId]
				delete that.silent[siteId]
				delete that.silenceStreams[siteId]
				delete that.wordBreakStreams[siteId]
				delete that.asrStreams[siteId]
			})
		}
	}
	
	onAudioMessage(topic,siteId,buffer) {
		//console.log(['audio message',buffer.length])
		//console.log(this.mqttStream)
		if (this.mqttStreams.hasOwnProperty(siteId)) {
			// add wav header to first packet
			if (this.messageCount == 0) {
				let wav = new WaveFile();
				console.log(buffer)
				wav.fromScratch(1, 16000, '16', buffer);
				this.mqttStreams[siteId].push(wav.toBuffer())
				this.asrStreams[siteId].push(wav.toBuffer())
			} else {
				this.mqttStreams[siteId].push(buffer)
				this.asrStreams[siteId].push(buffer)
			}
			this.silenceStreams[siteId].push(buffer)
			this.wordBreakStreams[siteId].push(buffer)
			
			this.messageCount++;	
		}
	}	
}     
module.exports=HermodDeepSpeechAsrService


	//stt(audioStream) {
		
		//const BEAM_WIDTH = config.BEAM_WIDTH;
		//const LM_ALPHA = config.LM_ALPHA;
		//const LM_BETA = config.LM_BETA;
		//const N_FEATURES = config.N_FEATURES;
		//const N_CONTEXT = config.N_CONTEXT;

		//function totalTime(hrtimeValue) {
		  //return (hrtimeValue[0] + hrtimeValue[1] / 1000000000).toPrecision(4);
		//}

		//var audioBuffer = audioStream.toBuffer();

		//console.error('Loading model from file %s', args['model']);
		//const model_load_start = process.hrtime();
		//var model = new Ds.Model(args['model'], N_FEATURES, N_CONTEXT, args['alphabet'], BEAM_WIDTH);
		//const model_load_end = process.hrtime(model_load_start);
		//console.error('Loaded model in %ds.', totalTime(model_load_end));

		//if (args['lm'] && args['trie']) {
			//console.error('Loading language model from files %s %s', args['lm'], args['trie']);
			//const lm_load_start = process.hrtime();
			//model.enable	//stt(audioStream) {
		
		//const BEAM_WIDTH = config.BEAM_WIDTH;
		//const LM_ALPHA = config.LM_ALPHA;
		//const LM_BETA = config.LM_BETA;
		//const N_FEATURES = config.N_FEATURES;
		//const N_CONTEXT = config.N_CONTEXT;

		//function totalTime(hrtimeValue) {
		  //return (hrtimeValue[0] + hrtimeValue[1] / 1000000000).toPrecision(4);
		//}

		//var audioBuffer = audioStream.toBuffer();

		//console.error('Loading model from file %s', args['model']);
		//const model_load_start = process.hrtime();
		//var model = new Ds.Model(args['model'], N_FEATURES, N_CONTEXT, args['alphabet'], BEAM_WIDTH);
		//const model_load_end = process.hrtime(model_load_start);
		//console.error('Loaded model in %ds.', totalTime(model_load_end));

		//if (args['lm'] && args['trie']) {
			//console.error('Loading language model from files %s %s', args['lm'], args['trie']);
			//const lm_load_start = process.hrtime();
			//model.enableDecoderWithLM(args['alphabet'], args['lm'], args['trie'],
									  //LM_ALPHA, LM_BETA);
			//const lm_load_end = process.hrtime(lm_load_start);
				//console.error('Loaded language model in %ds.', totalTime(lm_load_end));
		//}

		//const inference_start = process.hrtime();
		//console.error('Running inference.');
		//const audioLength = (audioBuffer.length / 2) * ( 1 / 16000);

		//// We take half of the buffer_size because buffer is a char* while
		//// LocalDsSTT() expected a short*
		//console.log(model.stt(audioBuffer.slice(0, audioBuffer.length / 2), 16000));
		//const inference_stop = process.hrtime(inference_start);
		//console.error('Inference took %ds for %ds audio file.', totalTime(inference_stop), audioLength.toPrecision(4));
	//}DecoderWithLM(args['alphabet'], args['lm'], args['trie'],
									  //LM_ALPHA, LM_BETA);
			//const lm_load_end = process.hrtime(lm_load_start);
				//console.error('Loaded language model in %ds.', totalTime(lm_load_end));
		//}

		//const inference_start = process.hrtime();
		//console.error('Running inference.');
		//const audioLength = (audioBuffer.length / 2) * ( 1 / 16000);

		//// We take half of the buffer_size because buffer is a char* while
		//// LocalDsSTT() expected a short*
		//console.log(model.stt(audioBuffer.slice(0, audioBuffer.length / 2), 16000));
		//const inference_stop = process.hrtime(inference_start);
		//console.error('Inference took %ds for %ds audio file.', totalTime(inference_stop), audioLength.toPrecision(4));
	//}
