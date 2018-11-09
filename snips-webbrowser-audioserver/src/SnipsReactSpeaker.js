import React, { Component } from 'react'
import SnipsReactComponent from './SnipsReactComponent'

export default class SnipsReactSpeaker extends SnipsReactComponent  {

    constructor(props) {
        super(props);
        console.log(['SPEAKER CONSTR']);
        let that = this;
        
        if (!props.siteId || props.siteId.length === 0) {
            throw "Speaker must be configured with a siteId property";
        }
        this.state.config={}
        this.playSound = this.playSound.bind(this);
        this.setVolume = this.setVolume.bind(this);
        this.gainNode = null;
        this.state = {volume:.5}
        
        let eventFunctions = {
        // SESSION
            'hermes/audioServer/#/playBytes' : function(destination,siteId,id,session,audio) {
                console.log(['PLAY AUDIO EVENT',siteId,that.props.siteId,session]);
                if (siteId && siteId.length > 0 && siteId === that.props.siteId) {
                    that.playSound(audio);            
                    that.sendMqtt("hermes/audioServer/"+siteId+"/playFinished",{id:id,siteId:siteId,sessionId:session ? session.sessionId : null});                
                }
            },
            'hermes/hotword/#/detected': function(payload,session) {
                // quarter volume for 10 seconds
            }
        }
        
        this.logger = this.connectToLogger(props.logger,eventFunctions);
    }  
   
   
    setVolume(volume) {
        console.log(['SET VOLUME']);
        this.setState({volume:volume});
        //this.gainNode.gain.value = this.state.volume;
    };
    
    playSound(bytes) {
        let that = this;
        console.log(['PLAY SOUND']);
        //return;
        var buffer = new Uint8Array( bytes.length );
        buffer.set( new Uint8Array(bytes), 0 );
        let audioContext = window.AudioContext || window.webkitAudioContext;
        let context = new audioContext();
        let gainNode = context.createGain();
        // initial set volume
        gainNode.gain.value = this.state.volume;
        context.decodeAudioData(buffer.buffer, function(audioBuffer) {
            var source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(that.gainNode);
            gainNode.connect( context.destination );
            source.start(0);
        });            
   
    }
    
    
    
    render() {
        return <span id="snipsreactspeaker" >SPEAKER</span>
    };
}
