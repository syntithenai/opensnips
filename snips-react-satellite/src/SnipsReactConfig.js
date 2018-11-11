import React, { Component } from 'react'
import SnipsReactComponent from './SnipsReactComponent'

export default class SnipsReactConfig extends SnipsReactComponent  {

    constructor(props) {
        super(props);
        if (!props.siteId || props.siteId.length === 0) {
            throw "Config must be configured with a siteId property";
        }
        this.state.config={}
        
        let that = this;
        let eventFunctions = {
       
        }
        
        this.logger = this.connectToLogger(props.logger,eventFunctions);
    }  
    
    componentDidMount() {
    };
   
    render() {
        return <b></b>
    };

  
}

