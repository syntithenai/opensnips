#from rasa_core.dispatcher import Dispatcher
from rasa_core.actions.action import Action
import json

class SnipsMqttAction(Action):
    """An action to engage the Snips Hermes MQTT protocol

    Both, name and utter template, need to be specified using
    the `name` method."""

    def __init__(self, name):
        self._name = name

    def run(self, dispatcher, tracker, domain):
        
        try :
            print("ReUN SNIPS ACTION {}".format(self._name))
            
            """Simple run implementation uttering a (hopefully defined) template."""
            #if name in utter_templates:
                #actions.append(UtterAction(name))        
            print('RUNNING')
            response=''
            print('RUNNING {}'.format(domain))
            if self._name in domain.templates:
                 responseJSON = dispatcher.retrieve_template(self.name(),filled_slots=tracker.current_slot_values())
                 response = responseJSON['text']
                 #client.publish('hermes/tts/say',
                        #payload = json.dumps({"lang":self.lang,"sessionId": sessionId, "text": text, "siteId": siteId,"id":theId}), 
                        #qos=0,
                        #retain=False)
            client = domain.core_server.client
            print('RUNNING')
            sessionId = domain.core_server.sessionId
            print('RUNNING')
            siteId = domain.core_server.siteId
            print('RUNNING {} {} {}'.format(siteId,sessionId,client))
            if self._name.startswith('ask_'):
                print ('send - {}'.format(response))
                client.publish('hermes/dialogue/continueSession',json.dumps({"text":response,"sessionId": sessionId,  "siteId": siteId}))
            elif self._name.startswith('askslot_'):
                slot = intentNameParts[2]
                client.publish('hermes/dialogue/continueSession',json.dumps({"text":response,"sessionId": sessionId,  "siteId": siteId, "slot": slot}))
            elif self._name.startswith('choose_'):
                allowedIntents = intentNameInnerParts[2:]
                client.publish('hermes/dialogue/continueSession',json.dumps({"text":response,"sessionId": sessionId,  "siteId": siteId,"intentFilter":",".join(allowedIntents)}))
            elif self._name.startswith('capture_'):
                slot = intentNameParts[2]
                client.publish('hermes/dialogue/continueSession',json.dumps({"text":response,"sessionId": sessionId,  "siteId": siteId, "slot": slot, "capture": "text"}))
            elif self._name.startswith('say_'):
                client.publish('hermes/dialogue/endSession',json.dumps({"sessionId": sessionId,  "siteId": siteId}))
            return []
        except Exception as e:
            print("ERROR: {}".format(e))

    def name(self):
        return self._name

    def __str__(self):
        return "SnipsMqttAction('{}')".format(self.name())
        
        

