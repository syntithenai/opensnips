import React, { Component } from 'react'

import SnipsMicrophone from 'snips-webbrowser-audioserver'
import SnipsAppServer from './SnipsAppServer'
import SnipsLogger from './SnipsLogger'

export default class App extends Component {
    
   alertMe() {
       //alert('weeek');
   }; 

   forecast() {
       return new Promise(function(resolve,reject) {
            alert('forecast');
            resolve();
       });
   }; 
    
  render () {
    
    let eventFunctions = {'hermes/dialogueManager/sessionStarted':this.alertMe}
    let intents = {'searchWeatherForecast':this.forecast}
      
    return (
      <div>
        <SnipsMicrophone remoteOptions={[{name:'bedroom',label:'Bedroom Pi'}]} dmqttServer="192.168.1.100" debug={true} text='Moderdddddn React component module' eventCallbackFunctions = {eventFunctions} />
        <SnipsAppServer intents={intents} />
        
        <SnipsLogger siteId="browser" eventCallbackFunctions = {this.props.eventCallbackFunctions}/>
          
          
      </div>
    )
  }
}
