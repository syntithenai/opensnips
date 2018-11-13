import React, { Component } from 'react'

import SnipsReactHotwordServer from './SnipsReactHotwordServer'
import SnipsReactMicrophone from './SnipsReactMicrophone'
import SnipsReactTts from './SnipsReactTts'
import SnipsReactSpeaker from './SnipsReactSpeaker'
import SnipsReactAppServer from './SnipsReactAppServer'
import SnipsReactConfig from './SnipsReactConfig'


export default class SnipsReactSatellite extends Component  {

    constructor(props) {
        super(props);
        this.siteId = props.siteId ? props.siteId : 'browser_'+parseInt(Math.random()*100000000,10);
        
        this.state = {showConfig:false,config:{}};
        this.setLogData = this.setLogData.bind(this);
        this.setConfig = this.setConfig.bind(this);
        this.showConfig = this.showConfig.bind(this);
        this.hideConfig = this.hideConfig.bind(this);
        this.logger = props.logger ? props.logger : new SnipsLogger(Object.assign({logAudio:false,setLogData:this.setLogData },props));
        let configString = localStorage.getItem(this.appendUserId('snipsmicrophone_config',props.user));
        let config = null;
        try {
            config = JSON.parse(configString)
        } catch(e) {
        }
        if (config) {
            this.state.config = config;
        } else {
            // default config
            let newConfig = this.getDefaultConfig();
            this.state.config = newConfig;
            localStorage.setItem(this.appendUserId('snipsmicrophone_config',this.props.user),JSON.stringify(newConfig));
        }
    }  
    
        
    appendUserId(text,user) {
        if (user && user._id) {
            return text+"_"+user._id;
        } else {
            return text;
        }
    };
    
    componentDidMount() {
        
    };
    
    // force update
    setLogData(sites,messages,sessionStatus,sessionStatusText,hotwordListening,audioListening) {
        this.setState(this.state);
    };
    
    setConfig(config) {
        this.setState({config:config});
    };
    
    showConfig() {
        this.setState({showConfig:true});
    };
    
    hideConfig() {
        this.setState({showConfig:false});
    };

     getDefaultConfig() {
        //console.log(['GDC',this.state]);
        return  {
            inputvolume:'70',
            outputvolume:'70',
            voicevolume:'70',
            ttsvoice: 'default', //this.state.voices && this.state.voices.length > 0 ? this.state.voices[0].name :
            voicerate:'50',
            voicepitch:'50',
            hotword:'browser:oklamp',
            hotwordsensitivity:'50',
            enabletts:'yes',
            enableaudio:'yes',
            enablenotifications:'yes'
        };
    };

//  
    render() {
        let position=this.props.position ? this.props.position  : 'top left'
        return <div id ="snipsreactsatellite" >
            <SnipsReactHotwordServer {...this.props}  logger={this.logger} siteId={this.siteId}  config={this.state.config} />
            <SnipsReactMicrophone {...this.props} position={position} logger={this.logger} siteId={this.siteId} config={this.state.config} showConfig={this.showConfig} hideConfig={this.hideConfig} />
            <SnipsReactTts {...this.props} logger={this.logger} siteId={this.siteId} config={this.state.config}  />
            <SnipsReactSpeaker {...this.props} logger={this.logger} siteId={this.siteId}  config={this.state.config} />
            {this.props.intents && <SnipsReactAppServer  {...this.props} logger={this.logger} siteId={this.siteId}  config={this.state.config}  />}
            <div style={{width:'100%',clear:'both'}}>&nbsp;</div>
          {this.state.showConfig && <SnipsReactConfig  {...this.props}  setConfig={this.setConfig} configurationChange={this.setConfig} hideConfig={this.hideConfig} config={this.state.config} />}
            
        </div>
    };

  
}

