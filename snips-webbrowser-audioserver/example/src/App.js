import React, { Component } from 'react'

import SnipsMicrophone from 'snips-webbrowser-audioserver'

export default class App extends Component {
    
   alertMe() {
       //alert('weeek');
   }; 
    
  render () {
    
    let eventFunctions = {'hermes/dialogueManager/sessionStarted':this.alertMe}
      
    return (
      <div>
        <SnipsMicrophone remoteOptions={[{name:'bedroom',label:'Bedroom Pi'}]} dmqttServer="192.168.1.100" debug={true} text='Moderdddddn React component module' eventCallbackFunctions = {eventFunctions} />
      </div>
    )
  }
}
