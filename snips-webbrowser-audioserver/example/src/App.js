import React, { Component } from 'react'

import {SnipsReactSpeaker,SnipsReactMicrophone,SnipsReactAppServer,SnipsReactPorcupineHotwordServer,SnipsLogger,SnipsReactLogger,SnipsReactFlatLogger,SnipsReactTts} from 'snips-webbrowser-audioserver'


export default class App extends Component {
    
    constructor(props) {
        super(props);
        this.state={}
        this.siteId='stevebrowser'+parseInt(Math.random()*100000000,10);
        this.setLogData = this.setLogData.bind(this);
        this.logger = new SnipsLogger({logAudio:false,setLogData:this.setLogData });
        this.intents = {'searchWeatherForecast':this.forecast}
    
    };

/**
 *  INTENT example
 */
   forecast(slots) {
       let that = this;
       return new Promise(function(resolve,reject) {
           // alert('forecast');
           console.log('forecast');
           console.log(slots);
           that.say('weather is eek');
            resolve();
       });
   }; 
   
   // bring logger data into this.state
   setLogData(sites,messages,sessionStatus,sessionStatusText,hotwordListening,audioListening) {
        //       console.log(['SET setLogData',sites]);  //this.setState({sites:sites,messages:messages,sessionStatus:sessionStatus,sessionStatusText:sessionStatusText,hotwordListening:hotwordListening,audioListening:audioListening});
        this.setState({ state: this.state });
   };
   
 
  render () {
    return (
        <div>
            <SnipsReactMicrophone logger={this.logger} siteId={this.siteId}  />
            <SnipsReactTts logger={this.logger} siteId={this.siteId}  />
            <SnipsReactSpeaker logger={this.logger} siteId={this.siteId}  />
            <SnipsReactAppServer logger={this.logger} intents={this.intents}  />
            
             <br/><br/><br/><br/><br/><br/><br/>
             <hr/>
            <SnipsReactLogger logger={this.logger} {...this.logger.state} siteId={null}/>
            <hr/>
            <SnipsReactFlatLogger logger={this.logger} {...this.logger.state} siteId={null}/>
            
        </div>
    )
  }
}
