import React, { Component } from 'react'

import SnipsMicrophone from 'snips-webbrowser-audioserver'

export default class App extends Component {
  render () {
    return (
      <div>
        <SnipsMicrophone remoteOptions={[{name:'bedroom',label:'Bedroom Pi'}]} dmqttServer="192.168.1.100" debug={true} text='Moderdddddn React component module' />
      </div>
    )
  }
}
