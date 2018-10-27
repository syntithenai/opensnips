/* global window */
/* global Paho */


import React, { Component } from 'react'
import PropTypes from 'prop-types'
//import Paho from  './mqttws31.min'
import styles from './styles.css'

console.log(Paho)
let hark = require('hark');
console.log(hark)

export default class SnipsMicrophone extends Component {
  static propTypes = {
    text: PropTypes.string
  }
   

    constructor(props) {
        super(props);
        this.sensitivities = new Float32Array([1]);

        this.keywordIDs = {
        'ok lamp': new Uint8Array([
            0xac, 0x24, 0x75, 0x21, 0x14, 0x3d, 0x2a, 0xe7, 0x0a, 0x85, 0x75, 0x4c,
            0x48, 0x31, 0x5b, 0x44, 0x4b, 0xb6, 0xe8, 0xc3, 0x77, 0x30, 0xd5, 0xac,
            0xca, 0x54, 0x06, 0x29, 0xbd, 0x15, 0xca, 0x90, 0x55, 0x81, 0xae, 0x21,
            0x6a, 0x04, 0x1e, 0x5a, 0x9d, 0x64, 0x83, 0x0c, 0x04, 0x03, 0x6b, 0xe8,
            0x22, 0x2e, 0x19, 0xbf, 0x7e, 0x2b, 0x4d, 0x8c, 0x50, 0x27, 0xb6, 0x11,
            0xf3, 0x17, 0xc3, 0xf9, 0xe3, 0x69, 0x19, 0x26, 0xbe, 0x0d, 0xad, 0x78,
            0x74, 0x61, 0x4b, 0xb8, 0xde, 0x83, 0x1c, 0xb9, 0xa1, 0x06, 0x27, 0x77,
            0x03, 0xb2, 0x24, 0x82])};
        this.state={recording:false,messages:[],lastIntent:'',lastTts:'',lastTranscript:'',showMessage:false,activated:false,speaking:false}
        this.recording = false;
        this.siteId = this.props.sitedId ? this.props.sitedId : 'browser'; //+parseInt(Math.random()*100000000,10);
        this.clientId = this.props.clientId ? this.props.clientId :  'client'+parseInt(Math.random()*100000000,10);
        this.hotwordId = this.props.hotwordId ? this.props.hotwordId : 'default';
        this.sessionId = "";
        this.context = null;
        this.messageTimeout = null;
        this.mqttClient = null;
        this.speakingTimeout = null;
        //this.hark = require('hark');

        this.hotwordManager =  null; //new PicovoiceAudioManager(); //!this.props.disableHotword ? new PicovoiceAudioManager() : null; 
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
        
    };
 
    startRecording = function() {
     //   console.log('START');
        this.recording = true;
      this.setState({speaking:true,recording : true,lastIntent:'',lastTts:'',lastTranscript:'',showMessage:false});
      let message = new Paho.MQTT.Message(JSON.stringify({siteId:this.siteId,modelId:this.hotwordId,modelType:'universal'}));
      message.destinationName = "hermes/hotword/"+this.hotwordId+"/detected";
      this.mqttClient.send(message);
    }

    stopRecording = function() {
       // console.log('STOP');
        this.recording = false;
        this.setState({recording : false});
      let message = new Paho.MQTT.Message(JSON.stringify({sessionId:this.sessionId}));
      message.destinationName = "hermes/dialogueManager/endSession";
      try {
          this.mqttClient.send(message);
      } catch (e) {
          // not connected
      }
      
    }
    
    componentDidMount() {
        if (localStorage.getItem('snipsmicrophone_enabled') === 'true') {
            this.activate(false);
        }
       // this.hotwordManager =  new PicovoiceAudioManager(); 
                  
    }
    
    activate(start = true) {
        let that = this;
        // mqtt server
    // Create a client instance
        console.log(['CONNECT',this.mqttServer, Number(this.mqttPort), this.clientId]);
        localStorage.setItem('snipsmicrophone_enabled','true');
        this.mqttClient = new Paho.MQTT.Client(this.mqttServer, Number(this.mqttPort), this.clientId);
        // set callback handlers
        this.mqttClient.onConnectionLost = this.onConnectionLost;
        this.mqttClient.onMessageArrived = this.onMessageArrived;

        // connect the client
        this.mqttClient.connect({onSuccess:this.onConnect});
       if (start) { 
         setTimeout(function() {
            that.startRecording();
        },500);  
       }  
    };
    
    deactivate() {
        console.log(['deactivate',this.mqttClient]);
        localStorage.setItem('snipsmicrophone_enabled','false');
        if (this.mqttClient) {
            this.mqttClient.disconnect();
            delete this.mqttClient;
        }
    };

    // called when the client connects
    onConnect() {
        console.log('connected');
        this.setState({'activated':true});
      this.mqttClient.subscribe("hermes/dialogueManager/#",{});
      this.mqttClient.subscribe("hermes/intent/#",{});
      this.mqttClient.subscribe("hermes/tts/#",{});
      this.mqttClient.subscribe("hermes/audioServer/"+this.siteId+"/#",{});
      this.mqttClient.subscribe("hermes/hotword/#",{});
      this.mqttClient.subscribe("hermes/asr/#",{});
      
      this.startRecorder();
    }
    
    /** WAV encoding functions */
    startRecorder() {
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
            var options = {};
            console.log('start speech events');
            var speechEvents = hark(e, options);

            speechEvents.on('speaking', function() {
              console.log('speaking');
              if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
              that.setState({speaking:true});
            });

            speechEvents.on('stopped_speaking', function() {
              console.log('stopped_speaking');
              if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
              this.speakingTimeout = setTimeout(function() {
                  that.setState({speaking:false});
              },1000);
              
            });
          let audioContext = window.AudioContext || window.webkitAudioContext;
          that.context = new audioContext();
          console.log('CREATE CONTEXT',that.context);
          let audioInput = that.context.createMediaStreamSource(e);
          var bufferSize = 256;
          let recorder = that.context.createScriptProcessor(bufferSize, 1, 1);

          recorder.onaudioprocess = function(e){
            if(!that.recording || !that.state.speaking) return;
            var left = e.inputBuffer.getChannelData(0);
            that.sendAudioBuffer(e.inputBuffer,that.context.sampleRate); 
          }

          audioInput.connect(recorder)
          recorder.connect(that.context.destination); 
          let message = new Paho.MQTT.Message(JSON.stringify({siteId:that.siteId}));
          message.destinationName = "hermes/hotword/toggleOn";
          try {
              that.mqttClient.send(message);
          } catch (e) {
              console.log(e);
              // not connected
          }
        }
    };

    // called when the client loses its connection, reconnect after 5s
    onConnectionLost(responseObject) {
        let that = this;
      if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
        console.log(responseObject);
        setTimeout(function() {
          that.mqttClient.connect({onSuccess:that.onConnect});  
        },5000)
      }
    }
    
    playSound(bytes) {
        var buffer = new Uint8Array( bytes.length );
        buffer.set( new Uint8Array(bytes), 0 );
        let audioContext = window.AudioContext || window.webkitAudioContext;
        let context = new audioContext();
         
        context.decodeAudioData(buffer.buffer, function(audioBuffer) {
            var source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect( context.destination );
            source.start(0);
        });
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
      // console.log('HOTWORD CALLBACK',e);
    };

    // called when a message arrives
    onMessageArrived(message) {
        let parts = message.destinationName ? message.destinationName.split("/") : [];
        console.log('CONTEXT',this.context);
          
        let mainTopic = parts.slice(0,-1).join("/");
        var audio = message.payloadBytes;
        let payload = {};
        try {
          payload = JSON.parse(message.payloadString);  
        } catch (e) {
        }
        if (this.debug) {
            console.log(['PARTS',parts]);
          console.log(['MESSAGE',message.destinationName,this.sessionId,mainTopic,audio.length,payload,message]);
        }
        if (parts[0] === "hermes" && parts[1] === "asr"  && parts[2] === "textCaptured" ) {
            //this.setState({lastTranscript : payload.text});
            this.flashState('lastTranscript',payload.text);
        } else if (parts[0] === "hermes" && parts[1] === "intent" ) {
            this.flashState('lastIntent', parts[2] + ":" + JSON.stringify(payload.slots));
            //this.setState({lastIntent : parts[3] + ":" + JSON.stringify(payload.slots)});
        } else if (parts[0] === "hermes" && parts[1] === "tts"  && parts[2] === "say") {
           if (payload.siteId && payload.siteId === this.siteId) {
               this.flashState('lastTts',payload.text);
               //this.setState({lastTts : payload.text});
               var msg = new window.SpeechSynthesisUtterance(payload.text);
               if (payload.lang) {
                    msg.lang = payload.lang;
               }
               console.log('SPEAKNOW',msg,window.speechSynthesis);
               window.speechSynthesis.speak(msg);
                //mainTopic == "hermes/audioServer/"+this.siteId+"/playBytes"
                console.log(['tts']);
                // send finished
                let message = new Paho.MQTT.Message(JSON.stringify({id:payload.id,sessionId:payload.sessionId}));
                message.destinationName = "hermes/tts/sayFinished";
                this.mqttClient.send(message);                      
           }
        } else if (parts[0] === "hermes" && parts[1] === "audioServer"  && parts[2] === this.siteId && parts[3] === "playBytes") {
            //mainTopic == "hermes/audioServer/"+this.siteId+"/playBytes"
            console.log(['playbytes',audio]);
            this.playSound(audio);
            let newSessionId = parts.length  > 0 ? parts[parts.length-1] : '';
            if (parts.length > 3 && parts[4] && parts[4].length > 0) newSessionId = parts[4];
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:this.siteId,id:newSessionId}));
            message.destinationName = "hermes/audioServer/"+this.siteId+"/playFinished";
            this.mqttClient.send(message);       
        } else if (message.destinationName === "hermes/dialogueManager/sessionStarted") {
             this.sessionId=payload.sessionId;
        } else if (message.destinationName === "hermes/dialogueManager/sessionEnded") {
           this.recording = false;
           this.setState({recording : false});
        } else if (message.destinationName === "hermes/asr/startListening") {
            this.recording = true;
            this.setState({recording : true});
        } else if (message.destinationName === "hermes/asr/stopListening") {
            this.recording = false;
            this.setState({recording : false});
        } else if (!this.props.disableHotword && message.destinationName === "hermes/hotword/toggleOn" ) {
              console.log(['start hotword',payload.siteId,this.siteId]);
              if (payload.siteId === this.siteId ) {
                  if (this.hotwordManager === null) {
                      this.hotwordManager =  new PicovoiceAudioManager();
                      this.hotwordManager.start(Porcupine.create(Object.values(this.keywordIDs), this.sensitivities), this.hotwordCallback, function(e) {
                        console.log(['hotword error',e]);
                      });
                  } else {
                      this.hotwordManager.continueProcessing();
                  }
              }
              
        } else if (!this.props.disableHotword && message.destinationName == "hermes/hotword/toggleOff"  ) {
             console.log(['stop hotword',payload.siteId,this.siteId]);
             if (payload.siteId === this.siteId ) {
                console.log('stop hotword');
                this.hotwordManager.pauseProcessing();
                //delete this.hotwordManager;
            }
        }
    };
    
     //audioManager = new PicovoiceAudioManager();
        //audioManager.start(Porcupine.create(Object.values(keywordIDs), sensitivities), processCallback, audioManagerErrorCallback);
    //audioManager.stop();

    sendAudioBuffer(buffer,sampleRate) {
        //console.log('send buffer',this.context);
        let that = this;
        if (buffer) {
           this.reSample(buffer,16000,function(result) {
               let wav = that.audioBufferToWav(result) ; //new WaveFile().fromScratch(1,16000,"16",result);
                let message = new Paho.MQTT.Message(wav);
                message.destinationName = "hermes/audioServer/"+that.siteId+"/audioFrame";
                that.mqttClient.send(message);            
            },sampleRate);
        }
        
    };


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
    
    /** WAV encoding functions */
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
 CSS SPEECH BUBBLE LAYOUT
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


  render() {
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
    if (this.state.recording) status = 3;
    //if (this.state.sending) status = 3;
   // console.log(status);
    let borderColor='black'
    let borderWidth = 2;
    if (status==3) {
        borderColor = (this.state.speaking) ? 'darkgreen' : (this.props.borderColor ? this.props.borderColor : 'green');
        buttonStyle.backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : 'lightgreen';
        if (this.state.speaking) borderWidth = 3;
    } else if (status==2) {
        borderColor = (this.state.speaking) ? 'darkorange' : (this.props.borderColor ? this.props.borderColor : 'orange')
        buttonStyle.backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : 'lightorange';
        if (this.state.speaking) borderWidth = 3;
    } else if (status==1) {
        borderColor = (this.state.speaking) ? 'orangered' : (this.props.borderColor ? this.props.borderColor : 'red');
        buttonStyle.backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : 'pink';
        if (this.state.speaking) borderWidth = 3;
    } else {
        borderColor = this.props.borderColor ? this.props.borderColor : 'black';
        buttonStyle.backgroundColor = this.props.backgroundColor ? this.props.backgroundColor : 'lightgrey';
    }
    if (!buttonStyle.padding) buttonStyle.padding = '0.5em';
    if (!buttonStyle.margin) buttonStyle.margin = '0.5em';
   // console.log(borderColor);
    //if (!buttonStyle.border) 
    buttonStyle.border = borderWidth + 'px solid '+borderColor;
    if (!buttonStyle.borderRadius) buttonStyle.borderRadius = '100px';
    
    let micOnIcon = <svg style={buttonStyle}  aria-hidden="true" data-prefix="fas" data-icon="microphone" className="svg-inline--fa fa-microphone fa-w-11" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path fill="currentColor" d="M176 352c53.02 0 96-42.98 96-96V96c0-53.02-42.98-96-96-96S80 42.98 80 96v160c0 53.02 42.98 96 96 96zm160-160h-16c-8.84 0-16 7.16-16 16v48c0 74.8-64.49 134.82-140.79 127.38C96.71 376.89 48 317.11 48 250.3V208c0-8.84-7.16-16-16-16H16c-8.84 0-16 7.16-16 16v40.16c0 89.64 63.97 169.55 152 181.69V464H96c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16h-56v-33.77C285.71 418.47 352 344.9 352 256v-48c0-8.84-7.16-16-16-16z"></path></svg>

    let micOffIcon = <svg style={buttonStyle}  aria-hidden="true" data-prefix="fas" data-icon="microphone-slash" className="svg-inline--fa fa-microphone-slash fa-w-20" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="currentColor" d="M633.82 458.1l-157.8-121.96C488.61 312.13 496 285.01 496 256v-48c0-8.84-7.16-16-16-16h-16c-8.84 0-16 7.16-16 16v48c0 17.92-3.96 34.8-10.72 50.2l-26.55-20.52c3.1-9.4 5.28-19.22 5.28-29.67V96c0-53.02-42.98-96-96-96s-96 42.98-96 96v45.36L45.47 3.37C38.49-2.05 28.43-.8 23.01 6.18L3.37 31.45C-2.05 38.42-.8 48.47 6.18 53.9l588.36 454.73c6.98 5.43 17.03 4.17 22.46-2.81l19.64-25.27c5.41-6.97 4.16-17.02-2.82-22.45zM400 464h-56v-33.77c11.66-1.6 22.85-4.54 33.67-8.31l-50.11-38.73c-6.71.4-13.41.87-20.35.2-55.85-5.45-98.74-48.63-111.18-101.85L144 241.31v6.85c0 89.64 63.97 169.55 152 181.69V464h-56c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16z"></path></svg>

    
    let warning='';
    if (this.state.speaking) warning='eek'
    return (
      <div onTouchStart={this.showConfig}  onTouchEnd={this.clearConfigTimer}   onMouseDown={this.showConfig} onMouseUp={this.clearConfigTimer} onContextMenu={this.showConfigNow} >
      {warning}
       {this.state.showConfig && <div style={{width:'90%' ,border: '2px solid black',borderRadius:'10px'}}>
           <button style={{float:'right'}} onClick={this.hideConfig}>X</button>
           <h1>Microphone Configuration</h1>
           <button onClick={this.deactivate}>Disable</button>
        </div>}
       {!this.state.showConfig && <div>
        {(!this.state.activated) && <span  onClick={this.activate}>{micOnIcon}</span>} 
        {(this.state.activated && this.state.recording) && <span  onClick={this.stopRecording}>{micOffIcon}</span>} 
        {(this.state.activated && !this.state.recording) && <span  onClick={this.startRecording}>{micOnIcon}</span>} 
        {(this.state.showMessage ) && <div style={{padding:'1em', borderRadius:'20px',backgroundColor:'skyblue',margin:'5%',width:'90%',top:'1.7em',color:'black',border:'2px solid blue'}} >
                {this.state.lastTranscript && <div style={{fontStyle:'italic'}}>{this.state.lastTranscript}</div>}
                {this.state.lastIntent && <div>{this.state.lastIntent}</div>}
                {this.state.lastTts && <div>{this.state.lastTts}</div>}
            </div>}
   
        </div>} 
        
        
      </div>
    )
  }
}
  //<style dangerouslySetInnerHTML={{
          //__html: [
             //this.bubbleCSS(speechBubbleSettings)].join('\n')
          //}}>
        //</style>
