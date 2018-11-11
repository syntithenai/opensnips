import React, { Component } from 'react'
import SnipsReactComponent from './SnipsReactComponent'

export default class SnipsReactTts extends SnipsReactComponent  {

    constructor(props) {
        super(props);
        if (!props.siteId || props.siteId.length === 0) {
            throw "TTS Server must be configured with a siteId property";
        }
        this.state.config={}
        
        let that = this;
        let eventFunctions = {
        // SESSION
            'hermes/tts/say' : function(payload) {
                //console.log(['SAY EVENT',payload.siteId,that.props.siteId]);
                if (payload.siteId && payload.siteId.length > 0 && payload.siteId === that.props.siteId) {
                    if (payload.text && payload.text.length > 0 ) {
                        that.say(payload.text);
                    }
                    that.sendMqtt('hermes/tts/sayFinished',{id:payload.id,sessionId:payload.sessionId});    
            
                }
            }
        }
        
        this.logger = this.connectToLogger(props.logger,eventFunctions);
    }  
    
    componentDidMount() {
        this.initSpeechSynthesis();
    };
    
  

   /**
     * Synthesise speech from text and send to to audio output
     */ 
    say(text) {
        if (this.state.config && this.state.config.enablevoice !== "no") {
            let voice = this.state.config.ttsvoice ? this.state.config.ttsvoice : 'default';
           // console.log(['SPEAK',voice,text,this.state.config.ttsvoice,this.state.config.voicevolume,this.state.config.voicerate,this.state.config.voicepitch]);
            
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
                    if (voiceItem.name === voice) msg.voice = voiceItem;
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
                //console.log(voice);
                    voiceOptions.push({'name':voice.name,label:voice.name});
                });
                voiceOptions.push({'name':'default',label:'Browser Generated'});
                that.setState({voices:voiceOptions});
                //console.log(['VOICES a',voiceOptions]);
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
            //console.log(['VOICES b',voiceOptions]);
        }
        //console.log(['LOADE VOICES',this.state.voices]);
    };

    render() {
        return <b></b>
    };

  
}

