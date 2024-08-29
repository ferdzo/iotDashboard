import paho.mqtt.subscribe as subscribe

msg = subscribe.simple("esptest-01/sensor/tempreature/state", hostname="localhost")
print("%s %s" % (msg.topic, msg.payload))
