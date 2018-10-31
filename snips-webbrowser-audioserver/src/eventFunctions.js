let eventFunctions = {

 /* Hotword */
        'hermes/hotword/toggleOn':function(payload) {
            let that = this;
            let hotwordListening = that.state.hotwordListening;
            hotwordListening[payload.siteId] = true;
            that.setState({hotwordListening:hotwordListening});
                this.updateSession(payload,function(session) {
                session.hotword = true;
                session.hotwordDetected = false;
                that.updateSessionStatus(payload.siteId,session);
                return session;
            });
        },
        'hermes/hotword/toggleOff':function(payload) {
            let that = this;
            let hotwordListening = that.state.hotwordListening;
            hotwordListening[payload.siteId] = false;
            that.setState({hotwordListening:hotwordListening});
            this.updateSession(payload,function(session) {
                session.hotword = false;
                that.updateSessionStatus(payload.siteId,session);
                return session;
            });
            
        },
        'hermes/hotword/#/detected':function(payload) {
            let that = this;
            this.updateSession(payload,function(session) {
                session.hotwordDetected = true;
                that.updateSessionStatus(payload.siteId,session);
                return session;
            });
        },
        
        /* NLU */
        'hermes/nlu/query':function(payload) {
           
        },    
        'hermes/nlu/partialQuery':function(payload) {
          
        },
        'hermes/nlu/intentParsed': function(payload) {
            
        },
        'hermes/nlu/intentNotRecognized': function(payload) {
            
        },
        'hermes/nlu/slotParsed': function(payload) {
            
        },
        'hermes/error/nlu': function(payload) {
            
        },
        
        /* TTS */
        'hermes/tts/say': function(payload) {
           let that = this;
           this.updateSession(payload,function(session) {
                if (!session.tts) session.tts=[];
                session.tts.push(payload);
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        },
        
        'hermes/tts/sayFinished': function(payload) {
            
        },
        
        'hermes/asr/toggleOn': function(payload) {
            
        },
        'hermes/asr/toggleOff': function(payload) {
            
        },
        'hermes/asr/startListening': function(payload) {
            let that = this;
            this.resetAudioBuffer(payload.siteId);
            let audioListening = this.state.audioListening;
            audioListening[payload.siteId] = true;
            this.setState({audioListening:audioListening})
            this.updateSession(function(session) {
                that.updateSessionStatus(payload.siteId,session);
                return session;
            })
            console.log(['START ASR']);
        },
        'hermes/asr/stopListening': function(payload) {
            let that = this;
            let audioListening = this.state.audioListening;
            audioListening[payload.siteId] = false;
            this.setState({audioListening:audioListening});
            this.updateSession(function(session) {
                that.updateSessionStatus(payload.siteId,session);
                return session;
            })
            console.log(['STOP ASR']);
        },
        'hermes/asr/textCaptured': function(payload) {
            let that = this;
            console.log(['ASR CAPTURE']);
            this.updateSession(payload,function(session) {
                if (!session.asr) session.asr=[];
                session.asr.push(payload);
                console.log(['ASR OUTPUT']);
                that.logAudioBuffer(payload);
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        },
        
        'hermes/asr/partialTextCaptured': function(payload) {
           
        },

        'hermes/dialogueManager/startSession': function(payload) {
            
        },
        'hermes/dialogueManager/continueSession': function(payload) {
            
        },
        'hermes/dialogueManager/endSession': function(payload) {
            
        },
        'hermes/dialogueManager/sessionStarted': function(payload) {
            let that = this;
            this.updateSession(payload,function(session) {
                session.started = true;
                session.queued = true;
                session.sessionId = payload.sessionId;
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        },
        'hermes/dialogueManager/sessionEnded': function(payload) {
            let that = this;
            this.updateSession(payload,function(session) {
                session.ended = true;
                session.endtimestamp = new Date().getTime()
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        },
        'hermes/dialogueManager/sessionQueued': function(payload) {
            let that = this;
            this.updateSession(payload,function(session) {
                session.queued = true;
                session.queuedtimestamp = new Date().getTime()
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        },
        'hermes/intent/#':function(payload) {
            let that = this; 
            this.updateSession(payload,function(session) {
                if (!session.intents) session.intents=[];
                session.intents.push(payload);
                that.updateSessionStatus(payload.siteId,session)
                return session;
            });
        }, 
        

        /* Feedback *
         */
        'hermes/feedback/sound/toggleOn': function(payload) {
            
        },
        'hermes/feedback/sound/toggleOff': function(payload) {
            
        }
}

export default eventFunctions;
