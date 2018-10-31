/* global window */
/* global Paho */

/**
 * This component requires the loading of scripts globally via script tags.
 * Note also the global statements at the top of this file to enable these elements for React.
 * The npm version of paho-mqtt threw errors so local.
 * There are also libraries for hotword and speech generation with associated worker scripts.
 * All these externals scripts are stored in the example/public folder.
 * Beyond my ken right now to sort these elements out as proper npm packages ;)
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Resources from './resources'
import AudioMeter from './AudioMeter.react'
import SnipsLogger from './SnipsLogger'
let hark = require('hark');

export default class SnipsMicrophone extends Component {

    constructor(props) {
        super(props);
        this.sensitivities = new Float32Array([1]);

        this.keywordIDs = Resources.keywordIDs;
        this.state={recording:false,messages:[],lastIntent:'',lastTts:'',lastTranscript:'',showMessage:false,activated:false,speaking:false,showConfig:false,connected:false,config:{},logs:{}}
        this.recording = false;
        this.siteId = this.props.sitedId ? this.props.sitedId : 'browser'; //+parseInt(Math.random()*100000000,10);
        this.clientId = this.props.clientId ? this.props.clientId :  'client'+parseInt(Math.random()*100000000,10);
        this.hotwordId = this.props.hotwordId ? this.props.hotwordId : 'default';
        this.sessionId = "";
        this.context = null;
        this.inputGainNodes = [];
        this.messageTimeout = null;
        this.mqttClient = null;
        this.speakingTimeout = null;
        this.failCount=0;
        this.hotwordManager =  null;
        this.speechEvents =  null;
        this.audioBuffer = [];
        this.debug = this.props.debug ? true : false;
        // default mqtt server localhost
        this.mqttServer = this.props.mqttServer && this.props.mqttServer.length > 0 ? this.props.mqttServer : 'localhost'
        // default websockets port
        this.mqttPort = this.props.mqttPort && this.props.mqttPort.length > 0 ? this.props.mqttPort : '9001'
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.onConnect = this.onConnect.bind(this);
        this.startRecorder = this.startRecorder.bind(this);
        this.onConnectionLost = this.onConnectionLost.bind(this);
        this.onMessageArrived = this.onMessageArrived.bind(this);
        this.sendAudioBuffer = this.sendAudioBuffer.bind(this);
        this.audioBufferToWav = this.audioBufferToWav.bind(this);
        this.reSample = this.reSample.bind(this);
        this.encodeWAV = this.encodeWAV.bind(this);
        this.interleave = this.interleave.bind(this);
        this.playSound = this.playSound.bind(this);
        this.cssRule = this.cssRule.bind(this);
        this.getPointerLength = this.getPointerLength.bind(this);
        this.bubbleCSS = this.bubbleCSS.bind(this);
        this.flashState = this.flashState.bind(this);
        this.showConfig = this.showConfig.bind(this);
        this.showConfigNow = this.showConfigNow.bind(this);
        this.hideConfig = this.hideConfig.bind(this);
        this.clearConfigTimer = this.clearConfigTimer.bind(this);
        this.activate = this.activate.bind(this);
        this.deactivate = this.deactivate.bind(this);
        this.hotwordCallback = this.hotwordCallback.bind(this);
        this.logAudio = this.logAudio.bind(this);
        this.logTts = this.logTts.bind(this);
        this.logAsr = this.logAsr.bind(this);
        this.logIntent = this.logIntent.bind(this);
        this.currentLogEntry = this.currentLogEntry.bind(this);
        this.resetConfig = this.resetConfig.bind(this);
    };
 
    /**
     * Lifecycle functions
     */
     
    /**
     * Activate on mount if user has previously enabled.
     */ 
    componentDidMount() {
        this.initSpeechSynthesis.bind(this)();
        let configString = localStorage.getItem('snipsmicrophone_config');
        let config = null;
        try {
            config = JSON.parse(configString)
        } catch(e) {
        }
        console.log(['LOAD CONFIG',config,configString]);
        if (config) {
            // load config
            this.setState({'config':config});
        } else {
            // default config
            let newConfig = this.getDefaultConfig.bind(this)();
            
            this.setState({'config':newConfig});
            localStorage.setItem('snipsmicrophone_config',JSON.stringify(newConfig));
        }
        // if previously activated, restore microphone
        if (localStorage.getItem('snipsmicrophone_enabled') === 'true') {
            this.activate(false);
        }
        
    }
    
    resetConfig(e) {
        e.preventDefault();
        let newConfig = this.getDefaultConfig.bind(this)();        
        this.setState({'config':newConfig});
        localStorage.setItem('snipsmicrophone_config',JSON.stringify(newConfig));
    };
    
    getDefaultConfig() {
        //console.log(['GDC',this.state]);
        return  {
            inputvolume:'70',
            outputvolume:'70',
            voicevolume:'70',
            ttsvoice: 'default', //this.state.voices && this.state.voices.length > 0 ? this.state.voices[0].name :
            voicerate:'50',
            voicepitch:'50',
            remotecontrol:'local',
            hotword:'browser:oklamp',
            silencedetection:'yes',
            silencedetectionsensitivity:'90',
            enabletts:'yes',
            enableaudio:'yes',
            enablenotifications:'yes'
        };
    };
    
    /**
     * Garbage collect mqtt and voice recorders.
     */
    deactivate() {
        console.log(['deactivate',this.mqttClient]);
        localStorage.setItem('snipsmicrophone_enabled','false');
        if (this.mqttClient) {
            this.mqttClient.disconnect();
            delete this.mqttClient;
        }
        this.setState({connected:false,recording:false});
    };

    
    /**
     * Connect to mqtt, start the recorder and optionally start listening
     * Triggered by microphone click or hotword
     */
    activate(start = true) {
        let that = this;
        localStorage.setItem('snipsmicrophone_enabled','true');
        this.mqttConnect.bind(this)(start); 
        if (start) {
            setTimeout(function() {
                that.startRecording();
            },500);  
        }
    };
    
    /**
     * Connect to mqtt server
    */
    mqttConnect() {
        let that = this;
        this.mqttClient = new Paho.MQTT.Client(this.mqttServer, Number(this.mqttPort), this.clientId);
        this.mqttClient.onConnectionLost = this.onConnectionLost;
        this.mqttClient.onMessageArrived = this.onMessageArrived;
        this.mqttClient.connect({onSuccess:this.onConnect});
    };
        
    /**
     * Subscribe to to mqtt channels then start recorder
     */
    onConnect() {
      this.setState({'connected':true});
      this.failCount = 0;
      this.mqttClient.subscribe("hermes/dialogueManager/#",{});
      this.mqttClient.subscribe("hermes/intent/#",{});
      this.mqttClient.subscribe("hermes/tts/#",{});
      this.mqttClient.subscribe("hermes/audioServer/"+this.siteId+"/#",{});
      this.mqttClient.subscribe("hermes/hotword/#",{});
      this.mqttClient.subscribe("hermes/asr/#",{});
      this.startRecorder();
    }
 
    /**
     * When the client loses its connection, reconnect after 5s
     */ 
    onConnectionLost(responseObject) {
        let that = this;
        this.setState({'connected':false,'activated':false});
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:"+responseObject.errorMessage);
            let timeout=1000;
            if (this.failCount > 5) {
                timeout=10000;
            }
            this.failCount++;
            setTimeout(function() {
              that.mqttClient.connect({onSuccess:that.onConnect});  
            },timeout)
        }
    }
    
    /**
     * Bind silence recognition events to set speaking state
     */ 
    bindSpeakingEvents(audioContext,e) {
        console.log(['bindSpeakingEvents'])
        let that = this;
        var options = {audioContext:audioContext};
        options.threshhold = this.getThreshholdFromVolume(this.state.config.silencesensitivity);
        // bind speaking events care of hark
            this.speechEvents = hark(e, options);
            this.speechEvents.on('speaking', function() {
              if (that.state.config.silencedetection !== "no") {
                  console.log('speaking');
                  if (that.speakingTimeout) clearTimeout(that.speakingTimeout);
                  that.setState({speaking:true});
                }
            });
            
            this.speechEvents.on('stopped_speaking', function() {
                if (that.state.config.silencedetection !== "no") {
                  if (that.speakingTimeout) clearTimeout(that.speakingTimeout);
                  that.speakingTimeout = setTimeout(function() {
                      console.log('stop speaking');
                      that.setState({speaking:false});
                  },1000);
                }
              
            });            
        
    };

    getThreshholdFromVolume(volume) {
        return 10 * Math.log((101 - volume )/800);
    };

    configurationChange(e) {
        let that = this;
        console.log(['configurationChange',this,e,e.target.value,e.target.id]);
        let config = this.state.config;
        config[e.target.id] = e.target.value;
        this.setState(config);
        // set silence threshhold directly
        if (e.target.id === "silencesensitivity" && this.speechEvents) {
            this.speechEvents.setThreshold(this.getThreshholdFromVolume(this.state.config.silencesensitivity));
        } else if (e.target.id === "inputvolume" ) {
            // update all input gain nodes
            this.inputGainNodes.map(function(node) {
                console.log(['set gain',node,that.state.config.inputvolume/100]);
                node.gain.value = that.state.config.inputvolume/100;
            });
            
        }
        localStorage.setItem('snipsmicrophone_config',JSON.stringify(config));
    };
    
    addInputGainNode(node) {
        this.inputGainNodes.push(node);
    };

    /**
     * Access the microphone and start streaming mqtt packets
     */ 
    startRecorder() {
        console.log('START RECORDER');
        let that = this;
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

        if (navigator.getUserMedia) {
          navigator.getUserMedia({audio:true}, success, function(e) {
            alert('Error capturing audio.');
          });
        } else alert('getUserMedia not supported in this browser.');

        function success(e) {
           console.log('STARTING');
           let audioContext = window.AudioContext || window.webkitAudioContext;
           let context = new audioContext();
            that.setState({'activated':true});
           
            that.bindSpeakingEvents.bind(that)(context,e);
            // start media streaming mqtt
           console.log(['SET CONTEXT',context]);
          
          let gainNode = context.createGain();
          // initial set volume
          gainNode.gain.value = 0.9; // that.state.config.inputvolume > 0 ? that.state.config.inputvolume/100 : 0.5;
          let audioInput = context.createMediaStreamSource(e);
          var bufferSize = 256;
          let recorder = context.createScriptProcessor(bufferSize, 1, 1);

          recorder.onaudioprocess = function(e){
            if(!that.recording || !that.state.speaking) return;
            var left = e.inputBuffer.getChannelData(0);
            that.sendAudioBuffer(e.inputBuffer,context.sampleRate); 
           // console.log(['send audio',buffer,that.audioBuffer]);
            that.audioBuffer.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            that.recordingLength += bufferSize;
          }
            that.addInputGainNode(gainNode) ;
            audioInput.connect(gainNode)
            gainNode.connect(recorder);
            //audioInput.connect(recorder)
            // TODO, is this required?
            recorder.connect(context.destination); 
            //that.sendHotwordToggleOn.bind(that)(that.siteId);
        }
    };
    /**
     * Synthesise speech from text and send to to audio output
     */ 
    speakAloud(text) {
        if (this.state.config.enablevoice !== "no") {
            let voice = this.state.config.ttsvoice ? this.state.config.ttsvoice : 'default';
            console.log(['SPEAK',voice,text,this.state.config.ttsvoice,this.state.config.voicevolume,this.state.config.voicerate,this.state.config.voicepitch]);
            
            if (voice === "default") {
                // js generated fallback
                speak(text,{
                    amplitude : !isNaN(parseFloat(this.state.config.voicevolume)) ? parseFloat(this.state.config.voicevolume) : 70,
                    pitch: !isNaN(parseFloat(this.state.config.voicepitch)) ? parseFloat(this.state.config.voicepitch) : 50,
                    speed : !isNaN(parseFloat(this.state.config.voicerate)) ? parseFloat(this.state.config.voicerate) * 2.2 : 175
                });
            } else {
                // Create a new instance of SpeechSynthesisUtterance.
                var msg = new SpeechSynthesisUtterance();
                msg.text = text;
                msg.volume = !isNaN(parseFloat(this.state.config.voicevolume)) ? parseFloat(this.state.config.voicevolume) : 50;
                msg.rate = !isNaN(parseFloat(this.state.config.voicerate)) ? parseFloat(this.state.config.voicerate)/100 : 50/100;
                msg.pitch = !isNaN(parseFloat(this.state.config.voicepitch)) ? parseFloat(this.state.config.voicepitch) : 50;
                var voices = speechSynthesis.getVoices();
      
              // Loop through each of the voices.
                voices.forEach(function(voiceItem, i) {
                    if (voiceItem.name === voice)
                    msg.voice = voiceItem;
                    window.speechSynthesis.speak(msg);
                });
            }
            
        }
    }
    
    initSpeechSynthesis() {
        let that = this;
        if ('speechSynthesis' in window) {

            // Fetch the list of voices and populate the voice options.
            function loadVoices() {
              // Fetch the available voices.
                var voices = speechSynthesis.getVoices();
              
              // Loop through each of the voices
                let voiceOptions=[];
                voices.forEach(function(voice, i) {
                // Create a new option element.
                console.log(voice);
                    voiceOptions.push({'name':voice.name,label:voice.name});
                });
                voiceOptions.push({'name':'default',label:'Browser Generated'});
                that.setState({voices:voiceOptions});
                console.log(['VOICES a',voiceOptions]);
            }

            // Execute loadVoices.
            loadVoices();

            // Chrome loads voices asynchronously.
            window.speechSynthesis.onvoiceschanged = function(e) {
              loadVoices();
            };
            
        } else {
            let voiceOptions=[];
            voiceOptions.push({'name':'default',label:'Browser Generated'});
            that.setState({voices:voiceOptions});
            console.log(['VOICES b',voiceOptions]);
        }
        console.log(['LOADE VOICES',this.state.voices]);
    };

        
    /**
     * Send Mqtt message to toggle on hotword
     * Used to forcibly initialise the local hotword server.
     */ 
    sendHotwordToggleOn(siteId) {
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId}));
            message.destinationName = "hermes/hotword/toggleOn";
            that.mqttClient.send(message);
            
        }
    };
    /**
     * Send Mqtt message to fake hotword detection
     */ 
    sendHotwordDetected(hotwordId,siteId) {
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,modelId:hotwordId,modelType:'universal'}));
            message.destinationName = "hermes/hotword/"+hotwordId+"/detected";
            this.mqttClient.send(message);
        }
    }
    
    /**
     * Send Mqtt message to start a voice session
     */     
    sendStartSession(siteId) {
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,init:{type:'action',canBeEnqueued:true,sendIntentNotRecognized:true}}));
            message.destinationName = "hermes/dialogueManager/startSession";
            this.mqttClient.send(message);   
        }
    };
    /**
     * Send Mqtt message to indicate that tts has finished
     */     
    sendSayFinished(id,sessionId) {
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({id:id,sessionId:sessionId}));
            message.destinationName = "hermes/tts/sayFinished";
            this.mqttClient.send(message);   
        }
    };
    
    /**
     * Send Mqtt message to indicate audioserver playback has finished
     */ 
    sendPlayFinished(siteId,sessionId) {
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,id:sessionId}));
            message.destinationName = "hermes/audioServer/"+this.siteId+"/playFinished";
            this.mqttClient.send(message); 
        }
    };

    /**
     * Send Mqtt message to end the session immediately
     */ 
     sendEndSession(siteId,sessionId) {
         let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({sessionId:sessionId}));
            message.destinationName = "hermes/dialogueManager/endSession";
            this.mqttClient.send(message);
            message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId}));
            message.destinationName = "hermes/asr/toggleOff";
            this.mqttClient.send(message);
            message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId}));
            message.destinationName = "hermes/hotword/toggleOn";
            this.mqttClient.send(message);
        }
    };
    
    /**
     * Send Mqtt message to end the session immediately
     */ 
     sendTestSay(e) {
         e.preventDefault();
         let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:this.siteId,text:'This is a test to hear how I speak.'}));
            message.destinationName = "hermes/tts/say";
            this.mqttClient.send(message);
        }
    };

    /**
     * Handle mqtt messages
     * By topic
     *   - asr
     *      - hermes/asr/<>/textCaptured
     *      - hermes/asr/startListening
     *      - hermes/asr/stopListening
     *   - audioserver
     *      - hermes/audioserver/playBytes
     *   - hotword
     *      - hermes/hotword/toggleOff
     *      - hermes/hotword/toggleOff
     *   - tts
     *      - hermes/tts/say
     *   - dialogueManager
     *     - hermes/dialogueManager/sessionStarted
     *     - hermes/dialogueManager/sessionEnded
     * TODO
     *   - intent - app server with debounce
     */ 
   onMessageArrived(message) {
        let parts = message.destinationName ? message.destinationName.split("/") : [];
        let mainTopic = parts.slice(0,-1).join("/");
        var audio = message.payloadBytes;
        let payload = {};
        try {
          payload = JSON.parse(message.payloadString);  
        } catch (e) {
        }
        if (this.debug) {
         // console.log(['MESSAGE',message.destinationName,this.sessionId,mainTopic,audio.length,payload,message]);
        }
        if (parts[0] === "hermes" && parts[1] === "asr"  && parts[2] === "textCaptured" ) {
            this.logAsr(this.sessionId,payload.text) 
            this.flashState('lastTranscript',payload.text);
        } else if (parts[0] === "hermes" && parts[1] === "intent" ) {
            this.flashState('lastIntent', parts[2] + ":" + JSON.stringify(payload.slots));
            this.logIntent(this.sessionId,{intent:parts[2] ,slots: payload.slots}) 
        } else if (parts[0] === "hermes" && parts[1] === "tts"  && parts[2] === "say") {
           if (payload.siteId && payload.siteId === this.siteId) {
               this.logTts(this.sessionId,payload.text) 
               this.flashState('lastTts',payload.text);
               this.speakAloud.bind(this)(payload.text);
               this.sendSayFinished.bind(this)(payload.id,payload.sessionId);
           }
        } else if (parts[0] === "hermes" && parts[1] === "audioServer"  && parts[2] === this.siteId && parts[3] === "playBytes") {
            this.playSound(audio);
            let newSessionId = parts.length  > 0 ? parts[parts.length-1] : '';
            if (parts.length > 3 && parts[4] && parts[4].length > 0) newSessionId = parts[4];
            this.sendPlayFinished.bind(this)(this.siteId,newSessionId);      
            
        } else if (message.destinationName === "hermes/dialogueManager/sessionStarted") {
             this.sessionId=payload.sessionId;
        } else if (message.destinationName === "hermes/dialogueManager/sessionEnded") {
           this.recording = false;
           this.setState({recording : false});
        } else if (message.destinationName === "hermes/asr/startListening") {
            this.audioBuffer = [];
            this.recordingLength = 0;
            this.recording = true;
            this.setState({recording : true});
        } else if (message.destinationName === "hermes/asr/stopListening") {
             console.log(['STOP LISTENING']);
             this.logAudio(this.sessionId,this.audioBuffer) 
        
            this.recording = false;
            this.setState({recording : false});
        } else if (!this.props.disableHotword && message.destinationName === "hermes/hotword/toggleOn" ) {
              this.startHotword.bind(this)(payload.siteId);
        } else if (!this.props.disableHotword && message.destinationName == "hermes/hotword/toggleOff"  ) {
             if (payload.siteId === this.siteId ) {
                 this.stopHotword.bind(this)();
            }
        }
    };
    
    /**
     * Pause the hotword manager
     */ 
    stopHotword() {
        if (this.hotwordManager) this.hotwordManager.pauseProcessing();
    };
    
    /**
     * Create or continue the hotword manager
     */ 
    startHotword(siteId) {
      console.log(['start hotword',siteId,this.siteId]);
      if (siteId === this.siteId ) {
          if (this.hotwordManager === null) {
              this.hotwordManager =  new PicovoiceAudioManager();
              let singleSensitivity = this.state.config.hotwordsensitivity ? this.state.config.hotwordsensitivity/100 : 0.5;
              let sensitivities=new Float32Array([singleSensitivity]);
              this.hotwordManager.start(Porcupine.create(Object.values(this.keywordIDs), sensitivities), this.hotwordCallback, function(e) {
                console.log(['hotword error',e]);
              });
          } else {
              if(this.hotwordManager) this.hotwordManager.continueProcessing();
          }
      }
    };

    /**
     * Enable streaming of the audio input stream
     */ 
    startRecording = function() {
     //   console.log('START');
        this.recording = true;
        this.audioBuffer = [];
        this.recordingLength = 0;
            
      this.setState({speaking:true,recording : true,lastIntent:'',lastTts:'',lastTranscript:'',showMessage:false});
      // ask snips to start listening to our audio stream
      
      this.sendStartSession.bind(this)(this.siteId);
    }

    stopRecording = function() {
       // console.log('STOP');
        console.log(['STOP REC']);
        this.logAudio(this.sessionId,this.audioBuffer) 
        this.recording = false;
        this.setState({recording : false});
        this.sendEndSession.bind(this)(this.siteId,this.sessionId);
      
    }
    
    playSound(bytes) {
        
        if (this.state.config.enableaudio !== "no") {
            var buffer = new Uint8Array( bytes.length );
            buffer.set( new Uint8Array(bytes), 0 );
            let audioContext = window.AudioContext || window.webkitAudioContext;
            let context = new audioContext();
            let gainNode = context.createGain();
            // initial set volume
            gainNode.gain.value = this.state.config.outputvolume > 0 ? this.state.config.outputvolume/100 : 0.5;
          
            context.decodeAudioData(buffer.buffer, function(audioBuffer) {
                var source = context.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(gainNode);
                gainNode.connect( context.destination );
                source.start(0);
            });            
        }
    }
    
   flashState(key,value) {
       let that = this;
       if (key && key.length > 0 && value && value.length > 0) {
           if (this.messageTimeOut) clearTimeout(this.messageTimeOut);
           let newObj = {showMessage:true};
           if (key === "lastTranscript") {
               newObj.lastIntent='';
               newObj.lastTts='';
           }
           newObj[key] = value;
           this.setState(newObj);
           setTimeout(function() {
               that.setState({showMessage:false});
           },that.props.messageTimeout > 0 ? that.props.messageTimeout : 10000);           
       }

   };

    hotwordCallback(e) {
        if (e == 0) {
            this.startRecording();
        }
     };

    
    
    /** WAV encoding functions */

 
    sendAudioBuffer(buffer,sampleRate) {
         let that = this;
         //this.audioBuffer
        if (buffer) {
           this.reSample(buffer,16000,function(result) {
               let wav = that.audioBufferToWav(result) ; //new WaveFile().fromScratch(1,16000,"16",result);
                let message = new Paho.MQTT.Message(wav);
                message.destinationName = "hermes/audioServer/"+that.siteId+"/audioFrame";
                that.mqttClient.send(message);  
                console.log('send audio');          
            },sampleRate);
        }
        
    };

    /** 
     * WAV encoding functions 
     */
     
     
    convertFloat32ToInt16(buffer) {
      let l = buffer.length;
      let buf = new Int16Array(l);
      while (l--) {
        buf[l] = Math.min(1, buffer[l])*0x7FFF;
      }
      return buf.buffer;
    } 
     
    flattenArray(inChannelBuffer, recordingLength) {
        let channelBuffer = this.convertFloat32ToInt16(inChannelBuffer);
        
        var result = new Float32Array(recordingLength);
        var offset = 0;
        for (var i = 0; i < channelBuffer.length; i++) {
            var buffer = channelBuffer[i];
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    } 
     
     
    reSample(audioBuffer, targetSampleRate, onComplete,sampleRateContext) {
        let sampleRate =  !isNaN(sampleRateContext) ? sampleRateContext : 44100;
        var channel = audioBuffer && audioBuffer.numberOfChannels ? audioBuffer.numberOfChannels : 1;
        var samples = audioBuffer.length * targetSampleRate / sampleRate;
        var offlineContext = new OfflineAudioContext(channel, samples, targetSampleRate);
        var bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = audioBuffer;

        bufferSource.connect(offlineContext.destination);
        bufferSource.start(0);
        offlineContext.startRendering().then(function(renderedBuffer){
            onComplete(renderedBuffer);
        }).catch(function(e) {
            console.log(e);
        })
    }
    
    
    audioBufferToWav (buffer, opt) {
      opt = opt || {}

      var numChannels = buffer.numberOfChannels
      var sampleRate = buffer.sampleRate
      var format = opt.float32 ? 3 : 1
      var bitDepth = format === 3 ? 32 : 16

      var result
      if (numChannels === 2) {
        result = this.interleave(buffer.getChannelData(0), buffer.getChannelData(1))
      } else {
        result = buffer.getChannelData(0)
      }

      return this.encodeWAV(result, format, sampleRate, numChannels, bitDepth)
    }

    encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
      var bytesPerSample = bitDepth / 8
      var blockAlign = numChannels * bytesPerSample

      var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
      var view = new DataView(buffer)

      /* RIFF identifier */
      this.writeString(view, 0, 'RIFF')
      /* RIFF chunk length */
      view.setUint32(4, 36 + samples.length * bytesPerSample, true)
      /* RIFF type */
      this.writeString(view, 8, 'WAVE')
      /* format chunk identifier */
      this.writeString(view, 12, 'fmt ')
      /* format chunk length */
      view.setUint32(16, 16, true)
      /* sample format (raw) */
      view.setUint16(20, format, true)
      /* channel count */
      view.setUint16(22, numChannels, true)
      /* sample rate */
      view.setUint32(24, sampleRate, true)
      /* byte rate (sample rate * block align) */
      view.setUint32(28, sampleRate * blockAlign, true)
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, blockAlign, true)
      /* bits per sample */
      view.setUint16(34, bitDepth, true)
      /* data chunk identifier */
      this.writeString(view, 36, 'data')
      /* data chunk length */
      view.setUint32(40, samples.length * bytesPerSample, true)
      if (format === 1) { // Raw PCM
        this.floatTo16BitPCM(view, 44, samples)
      } else {
        this.writeFloat32(view, 44, samples)
      }

      return buffer
    }

    interleave (inputL, inputR) {
      var length = inputL.length + inputR.length
      var result = new Float32Array(length)

      var index = 0
      var inputIndex = 0

      while (index < length) {
        result[index++] = inputL[inputIndex]
        result[index++] = inputR[inputIndex]
        inputIndex++
      }
      return result
    }

    writeFloat32 (output, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 4) {
        output.setFloat32(offset, input[i], true)
      }
    }

    floatTo16BitPCM (output, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      }
    }

    writeString (view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }


    
    /**
     * CSS SPEECH BUBBLE LAYOUT
     * from https://github.com/LeaVerou/bubbly/blob/gh-pages/bubbly.js
    */ 
    bubbleCSS(settings) {
        let selector='.microphone-speechbubble'
        var props = {}, propsBefore = {};
        props['position'] = 'relative';
        props['background'] = settings.color;
        props['border-radius'] = '.4em';
        
        var side = settings.side,
            triangle = settings.triangle,
            isHorizontal = side == 'top' || side == 'bottom',
            opposite = {
                'top': 'bottom',
                'right': 'left',
                'bottom': 'top',
                'left': 'right'
            }[side],
            offset = isHorizontal? 'left' : 'top';
        
        propsBefore['content'] = "''";
        propsBefore['position'] = 'absolute';
        propsBefore[side] = '0';
        propsBefore[offset] = '50%';
        
        propsBefore['width'] = '0';
        propsBefore['height'] = '0';
        
        propsBefore['border'] = this.getPointerLength(settings.size, settings.ems) + ' solid transparent';
        propsBefore['border-' + opposite + '-color'] = settings.color;
        propsBefore['border-' + side] = '0';
        
        if (triangle != 'symmetrical') {
            propsBefore['border-' + (isHorizontal? triangle : (triangle == 'right'? 'top' : 'bottom'))] = '0';
        }
        
        propsBefore['margin-' + offset] = this.getPointerLength(-settings.size/(triangle == 'symmetrical'? 1 : 2)); // to center it
        propsBefore['margin-' + side] = this.getPointerLength(-settings.size, settings.ems); // to put it outside the box
        
        return  this.cssRule(selector, props) + '\n\n' + this.cssRule(selector + ':after', propsBefore);
    }

    getPointerLength(px) {
        return px + 'px';
    }

    cssRule(selector, props) {
        var css = selector + ' {\n';
        
        for (var property in props) {
            let value = props[property];
            css += '	' + property + ': ' + value + ';\n';
        }
      
        
        css += '}';
        
        return css;
    }



    /** 
     * Functions to enable and disable configuration screen 
     * by default using a debounce to implement click and hold to enable config
     **/
    showConfig(e) {
        let that = this;
         this.configTimeout = setTimeout(function() {
             console.log('show now');
            that.setState({showConfig:true});
        },1000);
    }; 
    showConfigNow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({showConfig:true});
        
    }; 
    
    clearConfigTimer() {
        if (this.configTimeout) clearTimeout(this.configTimeout);
    }; 
    
    hideConfig() {
        this.setState({showConfig:false});
    }; 

    
    newLog(sessionId) {
        return  {timestamp : new Date().getTime(), siteId:this.siteId,sessionId:sessionId,hotwordId:this.hotwordId,asr:[],intents:[],audio:[],tts:[]};
    };
    
    startLogEntry(sessionId) {
        let logs = this.state.logs;
        let newLog = this.newLog.bind(this)(sessionId);
        logs[sessionId] = newLog;
        this.setState({logs:logs});
        console.log(['start LOG',newLog]);
        return newLog;
    };
    
    currentLogEntry(sessionId,logs) {
        console.log(['get LOG',sessionId]);
        if (sessionId && sessionId.length) {
            if (logs && logs.hasOwnProperty(sessionId)) {
                console.log(['CURRENT LOG',sessionId,logs[sessionId],logs]);
                return logs[sessionId]
            // create first log entry
            } else  {
                console.log(['new LOG',sessionId]);
                return this.startLogEntry(sessionId); 
            }            
        } else {
            console.log(['INVALID sessionId for log:',sessionId]);
        }
        return logs[0];
    };
    
    logAsr(sessionId,text) {
        let logs = this.state.logs;
        let currentLog = this.currentLogEntry.bind(this)(sessionId,logs);
        currentLog.asr.push(text);
        console.log(['start LOG asr',text,sessionId]);
        this.setState({logs:logs});
        
    };
    
    logIntent(sessionId,intent) {
        let logs = this.state.logs;
        let currentLog = this.currentLogEntry.bind(this)(sessionId,logs);
        currentLog.intents.push(intent);
        console.log(['start LOG intent',intent,sessionId]);
        this.setState({logs:logs});
        
    };
    
    logTts(sessionId,text) {
        if (sessionId && sessionId.length) {
            let logs = this.state.logs;
            let currentLog = this.currentLogEntry.bind(this)(sessionId,logs);
            currentLog.tts.push(text);
            console.log(['start LOG tts',text,sessionId]);
            this.setState({logs:logs});            
        }
        
    };
    
    logAudio(sessionId,audio) {
        let that = this;
        if (false && sessionId && sessionId.length > 0 && audio && audio.length > 0) {
            console.log(['start LOG audio',sessionId,audio]);
            let logs = this.state.logs;
            var finalBuffer = this.flattenArray(audio, this.recordingLength);
            var format =  1
            var bitDepth = format === 16
            // audio to audioBuffer
            let wav = this.encodeWAV (finalBuffer, format, 16000, 1, bitDepth) 
            //this.reSample(audio,16000,function(result) {
                //console.log(['resampled LOG audio',result]);
                //let wav = that.audioBufferToWav(result) ; //new WaveFile().fromScratch(1,16000,"16",result);
            let currentLog = that.currentLogEntry.bind(that)(sessionId,logs);
            console.log(['LOGged AUDIO',wav,currentLog]);
            if (currentLog && currentLog.audio) currentLog.audio.push(wav);
            that.setState({logs:logs});
            audio = [];
        }
    };
    
    
    
    
  render() {
      let that = this;
    const {
      text
    } = this.props
    
    let buttonStyle=this.props.buttonStyle ? this.props.buttonStyle : {};
    let speechBubbleSettings= {};
    let speechBubbleCSS= {};
    
    let size= this.props.size && this.props.size.length > 0 ? this.props.size : '2em';
    //if (size) {
        buttonStyle.width = size
        buttonStyle.height = size
    //}
    // set speech bubble css THEN
    //Object.assign(speechBubbleStyle,this.getBubbleStyle(this.props.speechBubbleAt && this.props.speechBubbleAt.length > 0 ? this.props.speechBubbleAt : 'bottomleft' ))     ;
    
    let position = this.props.position && this.props.position.length > 0 ? this.props.position : 'topright';
    // set mic position and override bubble position
    buttonStyle.position = 'fixed';
    speechBubbleSettings.size ='20'
    if (position === "topleft") {
        buttonStyle.top = 0;
        buttonStyle.left = 0;
        speechBubbleSettings.triangle="top";
        speechBubbleSettings.side="right";
    } else if (position === "topright") {
        buttonStyle.top = 0;
        buttonStyle.right = 0;
        speechBubbleSettings.triangle="bottom";
        speechBubbleSettings.side="left";
    } else if (position === "bottomleft") {
        buttonStyle.bottom = 0;
        buttonStyle.left = 0;
        speechBubbleSettings.triangle="top";
        speechBubbleSettings.side="right";
    } else if (position === "bottomright") {
        buttonStyle.bottom = 0;
        buttonStyle.right = 0;
        speechBubbleSettings.triangle="bottom";
        speechBubbleSettings.side="left";
    }
    speechBubbleSettings.color="blue"
    
    let status = 0;
    if (this.state.activated) status = 1;
    if (this.state.connected) status = 2;
    if (this.state.recording) status = 3;
    //if (this.state.sending) status = 3;
   // console.log(status);
    let borderColor='black'
    let borderWidth = 2;
    if (status==3) {
        borderColor = (this.state.speaking) ? 'darkgreen' : (this.props.borderColor ? this.props.borderColor : 'green');
        buttonStyle.backgroundColor = 'lightgreen';
        if (this.state.speaking) borderWidth = 3;
    } else if (status==1) {
        borderColor = (this.state.speaking) ? 'darkorange' : (this.props.borderColor ? this.props.borderColor : 'orange')
        buttonStyle.backgroundColor = 'lightorange';
        if (this.state.speaking) borderWidth = 3;
    } else if (status==2) {
        borderColor = (this.state.speaking) ? 'orangered' : (this.props.borderColor ? this.props.borderColor : 'red');
        buttonStyle.backgroundColor = 'pink';
        if (this.state.speaking) borderWidth = 3;
    } else {
        borderColor = this.props.borderColor ? this.props.borderColor : 'black';
        buttonStyle.backgroundColor =  'lightgrey';
    }
    if (!buttonStyle.padding) buttonStyle.padding = '0.5em';
    if (!buttonStyle.margin) buttonStyle.margin = '0.5em';
   // console.log(borderColor);
    //if (!buttonStyle.border) 
    buttonStyle.border = borderWidth + 'px solid '+borderColor;
    if (!buttonStyle.borderRadius) buttonStyle.borderRadius = '100px';
    
    
    let micOffIcon =  <svg style={buttonStyle}  aria-hidden="true" data-prefix="fas" data-icon="microphone" className="svg-inline--fa fa-microphone fa-w-11" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path fill="currentColor" d="M176 352c53.02 0 96-42.98 96-96V96c0-53.02-42.98-96-96-96S80 42.98 80 96v160c0 53.02 42.98 96 96 96zm160-160h-16c-8.84 0-16 7.16-16 16v48c0 74.8-64.49 134.82-140.79 127.38C96.71 376.89 48 317.11 48 250.3V208c0-8.84-7.16-16-16-16H16c-8.84 0-16 7.16-16 16v40.16c0 89.64 63.97 169.55 152 181.69V464H96c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16h-56v-33.77C285.71 418.47 352 344.9 352 256v-48c0-8.84-7.16-16-16-16z"></path></svg>

    let micOnIcon = <svg style={buttonStyle}  aria-hidden="true" data-prefix="fas" data-icon="microphone-slash" className="svg-inline--fa fa-microphone-slash fa-w-20" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="currentColor" d="M633.82 458.1l-157.8-121.96C488.61 312.13 496 285.01 496 256v-48c0-8.84-7.16-16-16-16h-16c-8.84 0-16 7.16-16 16v48c0 17.92-3.96 34.8-10.72 50.2l-26.55-20.52c3.1-9.4 5.28-19.22 5.28-29.67V96c0-53.02-42.98-96-96-96s-96 42.98-96 96v45.36L45.47 3.37C38.49-2.05 28.43-.8 23.01 6.18L3.37 31.45C-2.05 38.42-.8 48.47 6.18 53.9l588.36 454.73c6.98 5.43 17.03 4.17 22.46-2.81l19.64-25.27c5.41-6.97 4.16-17.02-2.82-22.45zM400 464h-56v-33.77c11.66-1.6 22.85-4.54 33.67-8.31l-50.11-38.73c-6.71.4-13.41.87-20.35.2-55.85-5.45-98.74-48.63-111.18-101.85L144 241.31v6.85c0 89.64 63.97 169.55 152 181.69V464h-56c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16z"></path></svg>
    
    let resetIcon = 
<svg aria-hidden="true" style={{height:'1.1em'}}  role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M500.333 0h-47.411c-6.853 0-12.314 5.729-11.986 12.574l3.966 82.759C399.416 41.899 331.672 8 256.001 8 119.34 8 7.899 119.526 8 256.187 8.101 393.068 119.096 504 256 504c63.926 0 122.202-24.187 166.178-63.908 5.113-4.618 5.354-12.561.482-17.433l-33.971-33.971c-4.466-4.466-11.64-4.717-16.38-.543C341.308 415.448 300.606 432 256 432c-97.267 0-176-78.716-176-176 0-97.267 78.716-176 176-176 60.892 0 114.506 30.858 146.099 77.8l-101.525-4.865c-6.845-.328-12.574 5.133-12.574 11.986v47.411c0 6.627 5.373 12 12 12h200.333c6.627 0 12-5.373 12-12V12c0-6.627-5.373-12-12-12z"></path></svg>
    
    let stopIcon2=
<svg aria-hidden="true" style={{height:'1.4em'}}  role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M440.5 88.5l-52 52L415 167c9.4 9.4 9.4 24.6 0 33.9l-17.4 17.4c11.8 26.1 18.4 55.1 18.4 85.6 0 114.9-93.1 208-208 208S0 418.9 0 304 93.1 96 208 96c30.5 0 59.5 6.6 85.6 18.4L311 97c9.4-9.4 24.6-9.4 33.9 0l26.5 26.5 52-52 17.1 17zM500 60h-24c-6.6 0-12 5.4-12 12s5.4 12 12 12h24c6.6 0 12-5.4 12-12s-5.4-12-12-12zM440 0c-6.6 0-12 5.4-12 12v24c0 6.6 5.4 12 12 12s12-5.4 12-12V12c0-6.6-5.4-12-12-12zm33.9 55l17-17c4.7-4.7 4.7-12.3 0-17-4.7-4.7-12.3-4.7-17 0l-17 17c-4.7 4.7-4.7 12.3 0 17 4.8 4.7 12.4 4.7 17 0zm-67.8 0c4.7 4.7 12.3 4.7 17 0 4.7-4.7 4.7-12.3 0-17l-17-17c-4.7-4.7-12.3-4.7-17 0-4.7 4.7-4.7 12.3 0 17l17 17zm67.8 34c-4.7-4.7-12.3-4.7-17 0-4.7 4.7-4.7 12.3 0 17l17 17c4.7 4.7 12.3 4.7 17 0 4.7-4.7 4.7-12.3 0-17l-17-17zM112 272c0-35.3 28.7-64 64-64 8.8 0 16-7.2 16-16s-7.2-16-16-16c-52.9 0-96 43.1-96 96 0 8.8 7.2 16 16 16s16-7.2 16-16z"></path></svg>   

    let logItems = Object.keys(this.state.logs).map(function(sessionId,key) {
        let sessionLog = that.state.logs[sessionId];
        let speechItems = sessionLog.asr.map(function(transcript,ikey) {
            let slotValues = [];
            if (sessionLog.intents[ikey]) slotValues = sessionLog.intents[ikey].slots.map(function(slot,skey) {
                return <li key={skey}>{slot.slotName.split('_').join(' ')} {slot.value.value}</li>
            });
            return <div key={ikey}>
            <div style={{marginBottom:'1em',fontWeight:'bold'}}>{transcript}</div>
            <div>
                <span>{sessionLog.intents[ikey] && sessionLog.intents[ikey].intent}</span>
                {slotValues && <ul>{slotValues}</ul>}
            </div>
            <div><i>{sessionLog.tts[ikey]}</i></div>
            <span>AUDIO {ikey}  {sessionLog.audio[ikey] && sessionLog.audio[ikey].length}</span>
            <div ><hr style={{height:'1px', width:'100%'}}/></div>
            
            </div>
        });
        
        return <div key={key} >
            <div ><hr style={{height:'5px', width:'100%'}}/></div>
            <div >{speechItems}</div>
        </div>
    });

    let voiceOptions = this.state.voices && this.state.voices.map(function(voice) {
        return <option key={voice.name} value={voice.name}>{voice.label}</option>
    });
    
    let ro = this.props.remoteOptions ? this.props.remoteOptions : []
    let remoteOptions = ro.map(function(remoteSite) {
        return <option key={remoteSite.name} value={remoteSite.name}>{remoteSite.label}</option>
    });
    remoteOptions.unshift(<option key="local" value="local">Local</option>);
    
  
    let inputStyle={marginBottom:'0.5em',fontSize:'0.9em'};
    let config = this.state.config;
    return (
      <div  >
       {this.state.showConfig && <div style={{minHeight:'25em' ,margin:'2em',marginTop:'10em',padding:'1em',width:'90%' ,border: '2px solid black',borderRadius:'10px',backgroundColor:'white'}}>
           <button style={{float:'right',fontSize:'1.6em',fontWeight:'bold',border: '2px solid black',borderRadius:'50px'}} onClick={this.hideConfig}>X</button>
           
           <div style={{float:'left',marginRight:'2em'}} >
                {(status >= 2) && <span  onClick={this.deactivate}><button className='btn btn-danger' style={{fontSize:'1.5em'}}> {stopIcon2} Disable </button></span>} 
                </div>
           
           <h1 >Microphone Configuration</h1>
            
           <form style={{fontSize:'1.8em'}}>
                
                <div style={{float:'right'}} >
                <AudioMeter  inputvolume={this.state.config.inputvolume} addInputGainNode={this.addInputGainNode.bind(this)}  source={this.source}  style={{float:'right',marginRight:"2em",height:'200',width:'50',dtooLoudColor:"#FF9800",scolor:'#889bd8',border:'1px solid black',backgroundColor:'lightgrey'}} />
                </div>
                <div style={{float:'left', width:'80%'}}>
                    <div className='form-group' >
                        <b style={{marginBottom:'0.8em'}} >Volume&nbsp;&nbsp;&nbsp;</b>
                    </div> 
                    
                    <div className='form-group' >
                        <label htmlFor="inputvolume" >Microphone </label>
                        <input type="range" id="inputvolume" value={config.inputvolume} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'    },inputStyle)} min="0" max="150" ></input>
                    </div> 
                                    
                    <div className='form-group' >
                        <label htmlFor="outputvolume" >Output </label>
                        <input type="range" id="outputvolume" value={config.outputvolume} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'},inputStyle)}  ></input>
                    </div> 
                    <div className='form-group' >
                        <label htmlFor="voicevolume" >Voice </label>
                        <input type="range" id="voicevolume" value={config.voicevolume} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'},inputStyle)}  ></input>
                    </div> 
                </div>
                   <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                </div>
                 <div className='form-group' >
                    <label htmlFor="remotecontrol" >Remote Control </label>
                    <select style={inputStyle} id="remotecontrol" value={config.remotecontrol} onChange={this.configurationChange.bind(this)}  >{remoteOptions}</select>
                </div> 
                
                <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                </div>
                                
                <div className='form-group' >
                    {this.state.speaking && <span style={{float:'right'}}>Speaking</span>}
                    <label htmlFor="silencedetection" >Silence Detection </label>
                    <select style={inputStyle} id="silencedetection"  value={config.silencedetection} onChange={this.configurationChange.bind(this)} ><option value="yes" >Enabled</option><option value="no">Disabled</option></select>
                </div> 
                <div className='form-group' >
                    <label htmlFor="silencesensitivity" >Silence Sensitivity </label>
                    <input type="range" id="silencesensitivity" value={config.silencesensitivity} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'},inputStyle)} min="50" max="100" ></input>
                </div> 
                
                
                <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                </div>
                                
                <div className='form-group' >
                    <label htmlFor="hotword" >Hotword </label>
                    <select style={inputStyle} id="hotword" value={config.hotword} onChange={this.configurationChange.bind(this)}  ><option value="browser:oklamp" >OK Lamp (Browser)</option><option value="server:heysnips" >Hey Snips (Server)</option><option value="disabled" >Disabled</option></select>
                </div> 
                <div className='form-group' >
                    <label htmlFor="hotwordsensitivity" >Hotword Sensitivity </label>
                    <input type="range" id="hotwordsensitivity" value={config.hotwordsensitivity} onChange={this.configurationChange.bind(this)}  style={Object.assign({width:'80%'},inputStyle)}  ></input>
                </div> 
                 
                 <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                </div>
                <div className='form-group' >
                    <b style={{marginBottom:'0.8em'}}>Notifications&nbsp;&nbsp;&nbsp;</b>
                </div> 
                
                <div className='form-inline' >
                    <label htmlFor="enabletts" > Voice </label>
                    <select style={inputStyle} id="enabletts" value={config.enabletts} onChange={this.configurationChange.bind(this)}  ><option value="yes" >Yes</option><option value="no" >No</option></select>
                    <label htmlFor="enableaudio" > Audio </label>
                    <select style={inputStyle}  id="enableaudio" value={config.enableaudio} onChange={this.configurationChange.bind(this)} ><option value="yes" >Yes</option><option value="no" >No</option></select>
                    <label htmlFor="enablenotifications" > Screen </label>
                    <select style={inputStyle}  id="enablenotifications" value={config.enablenotifications} onChange={this.configurationChange.bind(this)}  ><option value="yes" >Yes</option><option value="no" >No</option></select>
                </div> 
               
               
                <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                </div>
                <div className='form-inline' >
                    <label htmlFor="ttsvoice" >Voice </label>
                    <select style={inputStyle}  id="ttsvoice" value={config.ttsvoice} onChange={this.configurationChange.bind(this)}   >{voiceOptions}</select>
                    &nbsp;&nbsp;&nbsp;<button className='btn btn-success' style={{fontSize:'1em'}} onClick={this.sendTestSay.bind(this)}>Test</button>
                </div> 
                <div className='form-group' >
                    <label htmlFor="voicerate" >Rate </label>
                    <input type="range" id="voicerate" value={config.voicerate} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'},inputStyle)}  ></input>
                </div> 
                <div className='form-group' >
                    <label htmlFor="voicepitch" >Pitch </label>
                    <input type="range" id="voicepitch" value={config.voicepitch} onChange={this.configurationChange.bind(this)} style={Object.assign({width:'80%'},inputStyle)}  ></input>
                </div> 
               
               
                 <div className='form-group' >
                    <hr style={{width:'100%'}}/ >
                    <span  onClick={this.resetConfig}><button className='btn btn-danger' style={{fontSize:'1em'}}> {resetIcon} Reset Configuration</button></span>
                    <hr style={{width:'100%'}}/ >
                </div>
                <div className='form-group' >
                    <b>Logs&nbsp;&nbsp;&nbsp;</b>
                    {logItems}
                </div> 
                
                
                <div className='form-group' >
                    <br/>
                    <br/><br/>
                </div> 
                
                
                
           </form>
            
            
        </div>}
       {this.state.config.enablenotifications !== "no" && <div>
        {(!this.state.activated) && <span  onClick={this.activate}>{micOnIcon}</span>} 
        {(this.state.activated && this.state.recording) && <span onTouchStart={this.showConfig}  onTouchEnd={this.clearConfigTimer}   onMouseDown={this.showConfig} onMouseUp={this.clearConfigTimer} onContextMenu={this.showConfigNow} onClick={this.stopRecording}>{micOffIcon}</span>} 
        {(this.state.activated && !this.state.recording) && <span onTouchStart={this.showConfig}  onTouchEnd={this.clearConfigTimer}   onMouseDown={this.showConfig} onMouseUp={this.clearConfigTimer} onContextMenu={this.showConfigNow} onClick={this.startRecording}>{micOnIcon}</span>} 
        {(this.state.showMessage ) && <div style={{padding:'1em', borderRadius:'20px',backgroundColor:'skyblue',margin:'5%',width:'90%',top:'1.7em',color:'black',border:'2px solid blue'}} >
                {this.state.lastTranscript && <div style={{fontStyle:'italic'}}>{this.state.lastTranscript}</div>}
                {this.state.lastIntent && <div>{this.state.lastIntent}</div>}
                {this.state.lastTts && <div>{this.state.lastTts}</div>}
            </div>} 
   
        </div>} 
        <div id="audio"></div>
        <SnipsLogger dmqttServer='mosquitto' />
      </div>
    )
  }
}
 
