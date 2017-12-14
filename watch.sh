#!/usr/bin/env python
#encoding: utf-8

try:
    import paho.mqtt.client as mqtt
except:
    raise Exception("Please install paho-mqtt: pip install paho-mqtt")
    import sys
    sys.exit(1)

try:
    import simplejson as json
except:
    raise Exception("Please install simplejson: pip install simplejson")
    import sys
    sys.exit(1)

import datetime

def time_now():
    return datetime.datetime.now().strftime('%H:%M:%S.%f')

# MQTT client to connect to the bus
mqtt_client = mqtt.Client()


def on_connect(client, userdata, flags, rc):
    # subscribe to all messages
    mqtt_client.subscribe('#')


# Process a message as it arrives
def on_message(client, userdata, msg):
    parts = msg.topic.split('/')
 #   print(parts)
    if msg.topic.startswith('hermes/audioServer') and  len(parts)>3 and parts[3] == 'audioFrame':
        pass
    else:
        print('[{}] - {}'.format(time_now(), msg.topic))
        if len(msg.payload) > 0 :
            json_payload={}
            try:
                json_payload = json.loads(msg.payload)
                print(json.dumps(json_payload, indent=2, sort_keys=True, ensure_ascii=False, encoding="utf-8"))
            except:
                pass

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect('localhost', 1883)
#mqtt_client.connect('192.168.1.138', 1883)
mqtt_client.loop_forever()
