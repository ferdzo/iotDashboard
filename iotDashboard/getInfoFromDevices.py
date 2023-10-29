import requests

devices = {"livingroom":"192.168.1.56"}

def getTemp(device):
    r = requests.get("http://"+devices[device]+"/sensor/temperature")
    return r.json()['value']

def getHumidity(device):
    r = requests.get("http://"+devices[device]+"/sensor/humidity")
    return r.json()['value']

