import requests

devices = {"esp1":"192.168.244.131"}

def getTemp(device):
    r = requests.get("http://"+devices[device]+"/sensor/temperature")
    return r.json()['value']

def getHumidity(device):
    r = requests.get("http://"+devices[device]+"/sensor/humidity")
    return r.json()['value']

