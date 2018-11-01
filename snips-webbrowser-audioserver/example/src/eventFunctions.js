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
                    resolve(session);
                });                
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
                    resolve(session) ;
                });
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
                    resolve(session) ;
                });
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
           return new Promise(function(resolve,reject) {
               that.updateSession(payload,function(session) {
                    if (session) {
                        if (!session.tts) session.tts=[];
                        session.tts.push(payload);
                        that.updateSessionStatus(payload.siteId,session)
                        resolve(session) ;                        
                    }
                });
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
                    resolve(session) ;
                })
                console.log(['START ASR']);
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
                    resolve(session) ;
                })
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
                    resolve(session) ;
                });
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
                        session.sessionId = payload.sessionId;
                        that.updateSessionStatus(payload.siteId,session)                        
                    }
                    resolve(session) ;
                });
            });
        },
        'hermes/dialogueManager/sessionEnded': function(payload) {
            let that = this;
            return new Promise(function(resolve,reject) {
                that.updateSession(payload,function(session) {
                    if (session) {
                        session.ended = true;
                        session.endtimestamp = new Date().getTime()
                        that.updateSessionStatus(payload.siteId,session)
                    }
                    resolve(session) ;
                });
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
                    resolve(session) ;
                });
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
                    resolve(session) ;
                });
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
        }
}

export default eventFunctions;
