import React, { Component } from 'react'

import SnipsReactHotwordServer from 'snips-react-satellite'
import SnipsReactMicrophone from 'snips-react-satellite'
import SnipsReactTts from 'snips-react-satellite'
import SnipsReactSpeaker from 'snips-react-satellite'
import SnipsReactAppServer from 'snips-react-satellite'


export default class SnipsReactSatellite extends Component  {

    constructor(props) {
        super(props);
        this.siteId = props.siteId ? props.siteId : 'browser_'+parseInt(Math.random()*100000000,10);
        
        this.state.config={}
        this.setLogData = this.setLogData.bind(this);
        this.logger = props.logger ? props.logger : new SnipsLogger({logAudio:false,setLogData:this.setLogData });
    }  
    
    componentDidMount() {
    };
    
    // force update
    setLogData(sites,messages,sessionStatus,sessionStatusText,hotwordListening,audioListening) {
        this.setState({ state: this.state });
    };


    render() {
        let position=this.props.position ? this.props.position  : 'top left'
        return <div id ="snipssatellite" >
            <SnipsReactHotwordServer toggleOn={true} logger={this.logger} siteId={this.siteId} config={this.props.config} />
            <SnipsReactMicrophone position={position} logger={this.logger} siteId={this.siteId} config={this.props.config} />
            <SnipsReactTts logger={this.logger} siteId={this.siteId}  config={this.props.config}/>
            <SnipsReactSpeaker logger={this.logger} siteId={this.siteId}  config={this.props.config}/>
            {this.props.intents && <SnipsReactAppServer logger={this.logger} intents={this.props.intents}  config={this.props.config} />}
            <SnipsReactConfig logger={this.logger} siteId={this.siteId} config={this.props.config} />
        </div>
    };

  
}

