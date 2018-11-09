let eventFunctions = {

 /* Hotword */
        'hermes/hotword/toggleOn':function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                let hotwordListening = that.state.hotwordListening;
                hotwordListening[payload.siteId] = true;
                that.setState({hotwordListening:hotwordListening});
                that.updateSession(payload,function(session) {
                        if (session) {
                            session.hotword = true;
                            session.hotwordDetected = false;
                            that.updateSessionStatus(payload.siteId,session);
                        }
                        return session;                        
                });             
                resolve();   
            });
        },
        'hermes/hotword/toggleOff':function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                let hotwordListening = that.state.hotwordListening;
                hotwordListening[payload.siteId] = false;
                that.setState({hotwordListening:hotwordListening});
                that.updateSession(payload,function(session) {
                    if (session) {
                        session.hotword = false;
                        that.updateSessionStatus(payload.siteId,session);
                    }
                    return session;
                });
                resolve() ;
            });
        },
        'hermes/hotword/#/detected':function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        session.hotwordDetected = true;
                        that.updateSessionStatus(payload.siteId,session);
                    }
                    return session ;
                });
                resolve();
            });
        },
        
        /* NLU */
        'hermes/nlu/query':function(payload) {
           return new Promise(function(resolve,reject) {
               resolve();
            });
        },    
        'hermes/nlu/partialQuery':function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/nlu/intentParsed': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/nlu/intentNotRecognized': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/nlu/slotParsed': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/error/nlu': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        
        /* TTS */
        'hermes/tts/say': function(payload) {
           let that = this;
           console.log(['LOG TTS']);
           return new Promise(function(resolve,reject) {
               that.updateSession(payload,function(session) {
                    if (session) {
                        if (!session.tts) session.tts=[];
                        session.tts.push(payload);
                        that.updateSessionStatus(payload.siteId,session)
                    }
                    return session;
                });
                resolve();
            });
        },
        
        'hermes/tts/sayFinished': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        
        'hermes/asr/toggleOn': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/asr/toggleOff': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/asr/startListening': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                that.resetAudioBuffer(payload.siteId);
                let audioListening = that.state.audioListening;
                audioListening[payload.siteId] = true;
                that.setState({audioListening:audioListening})
                that.updateSession(payload,function(session) {
                    if (session && payload) that.updateSessionStatus(payload.siteId,session);
                    return session;
                })
                resolve() ;
               // console.log(['START ASR']);
            });
        },
        'hermes/asr/stopListening': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                let audioListening = that.state.audioListening;
                audioListening[payload.siteId] = false;
                that.setState({audioListening:audioListening});
                that.updateSession(payload,function(session) {
                    if (session) {
                        that.logAudioBuffer(payload);
                        that.updateSessionStatus(payload.siteId,session);                        
                    }
                    return session ;
                })
                resolve() ;
               // console.log(['STOP ASR']);
            });
        },
        'hermes/asr/textCaptured': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                //console.log(['ASR CAPTURE']);
                that.updateSession(payload,function(session) {
                    if (session) {
                        if (!session.asr) session.asr=[];
                        session.asr.push(payload);
                    }
                   return session ;
                });
                 resolve();
            });
        },
        
        'hermes/asr/partialTextCaptured': function(payload) {
           return new Promise(function(resolve,reject) {
               resolve();
            });
        },

        'hermes/dialogueManager/startSession': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/dialogueManager/continueSession': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/dialogueManager/endSession': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/dialogueManager/sessionStarted': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        session.started = true;
                        session.queued = true;
                        session.starttimestamp =  new Date().getTime()                      
                        session.sessionId = payload.sessionId;
                        session.siteId = payload.siteId;
                        that.updateSessionStatus(payload.siteId,session)  
                        that.lastSessionId[payload.siteId] = payload.sessionId;
                    }
                    return session;
                });
                resolve();
            });
        },
        'hermes/dialogueManager/sessionEnded': function(payload) {
            let that = this;
           // console.log(['SESSION ENDED',payload]);
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        if (session.termination && session.termination.reason && session.termination.reason === "nominal") {
                            session.success = true;
                        }
                        session.ended = true;
                        session.endtimestamp = new Date().getTime()
                        that.updateSessionStatus(payload.siteId,session)
                    }
                    return session;
                });
                resolve();
            });
        },
        'hermes/dialogueManager/sessionQueued': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        session.queued = true;
                        session.queuedtimestamp = new Date().getTime()
                        that.updateSessionStatus(payload.siteId,session)                        
                    }
                    return session;
                });
                resolve();
            });
        },
        'hermes/intent/#':function(payload) {
            let that = this; 
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        if (!session.intents) session.intents=[];
                        session.intents.push(payload);
                        that.updateSessionStatus(payload.siteId,session)
                    }
                    return session;
                });
                resolve();
            });
        }, 
        

        /* Feedback *
         */
        'hermes/feedback/sound/toggleOn': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/feedback/sound/toggleOff': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/audioServer/#/playBytes': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/audioServer/#/playFinished': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        },
        'hermes/audioServer/#/audioFrame': function(payload) {
            return new Promise(function(resolve,reject) {
               resolve();
            });
        }

}

export default eventFunctions;
