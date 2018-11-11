/* global window */

import React, { Component } from 'react'

export default class SnipsReactFlatLogger extends Component {

    constructor(props) {
        super(props);
        this.state = {showLogMessages:{}}
        this.toggleMessageExpansion = this.toggleMessageExpansion.bind(this);
        this.isLogMessageExpanded = this.isLogMessageExpanded.bind(this);
        
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
    
    isLogMessageExpanded(key) {
        if (this.state.showLogMessages.hasOwnProperty(key) && this.state.showLogMessages[key]) {
            return true;
        }
        return false;
    };
    
   
    render() {
        //console.log(['RENDER SITES',this.props.sites]);
        let that = this;
        if (this.props.messages) {
            let logs = that.props.messages.map(function(val,key) {
             //   console.log(['LOG',val,key,session.sessionId,val.sessionId]);
                    return <div key={key} >
                        <button onClick={(e) => that.toggleMessageExpansion(e,key)} >+</button> 
                         &nbsp;&nbsp;{val.text}
                        {that.isLogMessageExpanded(key) && <pre>{val.payload}</pre>}
                    </div>                            
               
            });
            return  <div >{logs}</div>
        }
        //
    }
}
