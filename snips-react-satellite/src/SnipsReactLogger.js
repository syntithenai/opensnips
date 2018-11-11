/* global window */

import React, { Component } from 'react'

export default class SnipsReactLogger extends Component {

    constructor(props) {
        super(props);
        this.state = {showLogMessages:{},showLog:{}}
        this.toggleMessageExpansion = this.toggleMessageExpansion.bind(this);
        this.isLogMessageExpanded = this.isLogMessageExpanded.bind(this);
        this.isLogExpanded = this.isLogExpanded.bind(this);
        this.toggleLogExpansion = this.toggleLogExpansion.bind(this);
    };

    componentDidMount() {
       // console.log(' logger mount');
    }; 

       
    toggleMessageExpansion(e,key) {
        let showLogMessages = this.state.showLogMessages;
        if (this.isLogMessageExpanded(key)) {
            showLogMessages[key] = false;
        } else {
            showLogMessages[key] = true;
        }
       // console.log(['TOGGLE',showLogMessages]);
        this.setState({showLogMessages:showLogMessages});
    };
    
    toggleLogExpansion(e,key) {
        let showLog = this.state.showLog;
        if (this.isLogExpanded(key)) {
            showLog[key] = false;
        } else {
            showLog[key] = true;
        }
       console.log(['TOGGLE',showLog]);
        this.setState({showLog:showLog});
    };
    
    isLogMessageExpanded(key) {
        if (this.state.showLogMessages.hasOwnProperty(key) && this.state.showLogMessages[key]) {
            return true;
        }
        return false;
    };
    
    isLogExpanded(key) {
        if (this.state.showLog.hasOwnProperty(key) && this.state.showLog[key]) {
            return true;
        }
        return false;
    };
   
    render() {
        //console.log(['RENDER SITES',this.props.sites]);
        let that = this;
        if (this.props.sites) {
            let sitesRendered = Object.keys(this.props.sites).map(function(siteKeyIn) {
                let siteKey = siteKeyIn && siteKeyIn.length > 0 ? siteKeyIn : 'unknownSite';
                let site = that.props.sites[siteKey];
                let sessions = Object.values(site);
                sessions.sort(function(a,b) {
                    if (a.starttimestamp < b.starttimestamp) return 1;
                    else return -1;
                });
                if (!that.props.siteId || (that.props.siteId && siteKey === that.props.siteId)) {
                    let sessionsRendered = sessions.map(function(session,sessionLoopKey) {
                        //let session = that.props.sites[siteKey][sessionKey];
                        //if () {
                        if (session)  {
                           // console.log(['RENDER LOGS',that.props.messages]);
                            let logs = that.props.messages.map(function(val,key) {
                             //   console.log(['LOG',val,key,session.sessionId,val.sessionId]);
                                if (val.sessionId === session.sessionId) {
                                    return <div key={key} >
                                        <button onClick={(e) => that.toggleMessageExpansion(e,key)} >+</button> 
                                         &nbsp;&nbsp;{val.text}
                                        {that.isLogMessageExpanded(key) && <pre>{val.payload}</pre>}
                                    </div>                            
                                }
                                return [];
                            });
                            
                            //let sessionStatus = that.props.sessionStatus[session.sessionId];
                            //let statusColors=['lightgrey','lightblue','lightgreen','lightorange','lightgreen','lightred'];
                            //let statusTexts=['starting','hotword','listening','queued','started','transcribed','interpreted','ended'];
                            let statusText= that.props.sessionStatusText[session.sessionId];
                            //let statusColor= statusColors[sessionStatus];
                            let sessionClass = 'session-'+statusText;
                            let sessionStyle = {margin:'1em', padding:'1em', border: '2px solid black',borderRadius:'10px'};
                            //console.log(sessionStyle);
                            let sessionItems = [];
                            if (session.asr) sessionItems = session.asr.map(function(transcript,ikey) {
                                let slotValues = [];
                                
                                if (session.intents && session.intents.length > ikey && session.intents[ikey]) slotValues = session.intents[ikey].slots.map(function(slot,skey) {
                                    return <li key={skey}>{slot.slotName.split('_').join(' ')} {slot.value.value}</li>
                                });
                                return <div key={ikey}>
                                {session.audio && session.audio.length > ikey && session.audio[ikey]  && session.audio[ikey].length > 0 && <audio src={session.audio[ikey]} controls={true} style={{float:'right'}}/>}
                                <div style={{marginBottom:'1em',fontWeight:'bold'}}>
                                    {transcript.text} 
                                </div>
                               {session.tts && session.tts.length > 0 && <div ><hr style={{height:'1px', width:'100%'}}/>                               <div><i>{session.tts && session.tts.length > ikey && session.tts[ikey] && session.tts[ikey].text}</i></div></div>
                               }
                                
                                
                                <div ><hr style={{height:'1px', width:'100%'}}/></div>
                                <div>
                                    {slotValues && <ul>{slotValues}</ul>}
                                </div>
                                
                                
                                </div>
                            });
                            //<span>{session.intents && session.intents.length > ikey && session.intents[ikey] && JSON.stringify(session.intents[ikey])}</span>
                            if (session.started && session.sessionId) {
                                return <div className={sessionClass} style={sessionStyle}  key={sessionLoopKey} >
                                    <button style={{display:'inline',paddingRight:'0.5em'}} onClick={(e) => that.toggleLogExpansion(e,session.sessionId)} >+</button> 
                                    <h4 style={{marginLeft:'1em',display:'inline',clear:'right'}}>{session.sessionId} {that.props.sessionStatusText[session.sessionId]} </h4>
                                    <hr style={{height:'1px', width:'100%'}}/>
                                    <div >{sessionItems}</div>
                                    <hr style={{height:'1px', width:'100%'}}/>
                                    {that.isLogExpanded(session.sessionId) && <div >{logs}</div>}
                                </div>
                            }   
                            //
                                                  
                        }
                        return [];
                    });
                    let activityStyle={padding:'0.2em',borderRadius:'5px',float:'right',marginRight:'4em'};
                    return <div style={{margin:'1em',padding:'1em', border: '2px solid black',borderRadius:'10px'}} key={siteKey}>
                        {siteKey} 
                        {that.props.hotwordListening[siteKey] && <b style={Object.assign({backgroundColor:'lightpink',border:'1px solid red'},activityStyle)} >Hotword</b>}
                        {that.props.audioListening[siteKey] && <b style={Object.assign({backgroundColor:'lightgreen',border:'1px solid green'},activityStyle)}>Listening</b>}
                        <div>{sessionsRendered}</div>
                    </div>
                }
                return ;
            });
            return <b>
             {sitesRendered}
            <br/>
            </b>;
            
        } else {
            return []
        }
        //
    }
}
