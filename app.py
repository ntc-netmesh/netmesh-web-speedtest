#!/usr/bin/env python
import sys
import time
import uuid
from os import urandom
from threading import Lock
import requests
import json
import hashlib
from math import ceil

from flask import Flask, render_template, request
from flask_socketio import SocketIO, Namespace, emit, disconnect

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = 'gevent'

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
allowed_origin = ["http://localhost:8000", "http://localhost:5000"]
socketio = SocketIO(app, async_mode=async_mode, cors_allowed_origins=allowed_origin)

thread = None
thread_lock = Lock()

db = {}  # TODO: do we need this to be on a real database?


def remove_sid(sid):
    db.pop(sid, None)


def submit(request, result):
    # make POST to results server
    submit_url = "http://localhost:8000/api/submit/speedtest"
    data = {
        "test_id": uuid.uuid4(),
        "sid": request.sid,
        "ip_address": request.remote_addr,
        "rtt": result["rtt"],
        "ul": result["ul"],
        "dl": result["dl"],
    }
    data_json = json.dumps(data, default=str)

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": str(len(data_json))
    }
    try:
        r = requests.post(url=submit_url,
                          data=data_json,
                          headers=headers)
    except Exception as e:
        print("Exiting due to error %s, status code %s: %s" % (e, r.status_code, r.text))

    print("%s %s", r.text, r.status_code)
    return


def drop_outliers(myList):
    """ Drops top 10% highest and bottom 10% values in the list"""
    origLen = len(myList)
    dropValue = ceil(origLen * 0.10)
    myList.sort()
    return myList[dropValue:(origLen - dropValue)]


def get_dl_speed(sid):
    dlTimes = db[sid]['dlTimes']
    # dlTimes = drop_outliers(dlTimes)
    dlTimesAve = sum(dlTimes) / len(dlTimes)
    dlSpeed = db[sid]['settings']['dlSize'] / (dlTimesAve - db[sid]['oneWayTime'])
    return dlSpeed


def get_ul_speed(sid):
    ulTimes = db[sid]['ulTimes']
    # ulTimes = drop_outliers(ulTimes)
    ulTimesAve = sum(ulTimes) / len(ulTimes)
    ulSpeed = db[sid]['settings']['ulSize'] / (ulTimesAve - db[sid]['oneWayTime'])
    return ulSpeed


def get_rtt(pingTimes):
    # pingTimes = drop_outliers(pingTimes)
    pingAve = sum(pingTimes) / len(pingTimes)
    pingMin = min(pingTimes)
    pingMax = max(pingTimes)
    return [pingAve, pingMin, pingMax]


def get_time_PING_stop(socketID):
    timeNOW = time.time()
    sid = socketID.split("#")[1]
    db[sid]['pingTimes'].append(timeNOW - db[sid]['pingStart'])


def get_time_DL_stop(socketID):
    timeNOW = time.time()
    sid = socketID.split("#")[1]
    db[sid]['dlTimes'].append(timeNOW - db[sid]['dlStart'])


def get_time_UL_start(socketID):
    timeNOW = time.time()
    sid = socketID.split("#")[1]
    db[sid]['ulStart'] = timeNOW


def emit_result(sid):
    msg = {
        'log': 'Partial Results sent',
        'results': db[sid]['result'],
        'state': 100
    }
    emit('my_response', msg)


@app.route('/')
def index():
    return render_template('index-pretty.html', async_mode=socketio.async_mode)


class MyNamespace(Namespace):

    def on_next(self, message):
        time_now = time.time()
        state = message["state"]
        if state == 1:
            self.ping_start()
        elif state == 2:
            self.ping_end()
        elif state == 3:
            self.start_DL()
        elif state == 4:
            self.verify_DL(message)
        elif state == 5:
            self.trigger_UL()
        elif state == 6:
            self.received_UL(message, time_now)
        elif state == -99:  # catch bin for failures
            self.on_error()
        else:
            pass

    def on_connect(self):
        msg = {
            'log': 'Connected',
            'state': 0,
        }
        emit('my_response', msg)

    def on_disconnect_request(self):
        emit('my_response', {'log': 'Test done... Disconnected!'})
        disconnect()

    def on_disconnect(self):
        remove_sid(request.sid)
        print('Client disconnected %s', request.sid)

    def on_start(self, message):
        db[request.sid] = {
            'settings': message['settings'],
            'ip_address': request.remote_addr,
            'testCount': 0,
            'pingStart': 0,
            'dlStart': 0,
            'ulStart': 0,
            'pingTimes': [],
            'dlTimes': [],
            'ulTimes': [],
            'oneWayTime': 0,
            'digest': b'0',
            'result': {
                'ul': 0,
                'dl': 0,
                'rttAve': 0,
                'rttMin': 0,
                'rttMax': 0,
            }
        }
        msg = {
            'log': 'Starting',
            'state': 1,
        }
        emit('my_response', msg)

    def ping_start(self):  # Starting ping test
        msg = {
            'state': 2,
            'log': 'Ping sent',
        }
        db[request.sid]['pingStart'] = time.time()
        emit('my_response', msg, callback=get_time_PING_stop)

    def ping_end(self):

        # check if we need to repeat ping test ...
        if db[request.sid]['testCount'] < db[request.sid]['settings']['pingTestCount']:
            db[request.sid]['testCount'] += 1
            self.ping_start()

        # ... or proceed to next test
        else:
            # send result first
            [db[request.sid]['result']['rttAve'], db[request.sid]['result']['rttMin'],
             db[request.sid]['result']['rttMax']] = get_rtt(db[request.sid]['pingTimes'])
            db[request.sid]['oneWayTime'] = db[request.sid]['result']['rttAve'] / 2
            msg = {
                'log': 'Partial Results sent',
                'results': db[request.sid]['result'],
                'state': 100
            }
            emit('my_response', msg)

            db[request.sid]['testCount'] = 0
            self.start_DL()

    def start_DL(self):  # start DL test

        # prepare payload and digest
        challenge = urandom(db[request.sid]['settings']['dlSize'])
        last32bytes = challenge[-32:]
        # db[request.sid]['digest'] = hashlib.sha512(challenge).hexdigest()
        db[request.sid]['digest'] = last32bytes

        msg = {
            'state': 4,
            'log': 'currently on state DL_1',
            'bin': challenge,
        }
        db[request.sid]['dlStart'] = time.time()
        emit('my_response', msg, callback=get_time_DL_stop)

    def verify_DL(self, message):

        # check if hash is correct
        # If client failed to give correct hash, server triggers disconnect
        if message['hash'] != db[request.sid]['digest']:
            msg = {
                'state': -99,
                'log': 'Verification failed!',
            }
            emit('my_response', msg)
            self.on_disconnect_request()

        #  Client computed hash correctly so let's proceed to next state
        else:
            #  send intermediate results
            db[request.sid]['result']['dl'] = get_dl_speed(request.sid)
            emit_result(request.sid)

            # check if we repeat test again
            if db[request.sid]['testCount'] < db[request.sid]['settings']['dlTestCount']:
                db[request.sid]['testCount'] += 1
                self.start_DL()
            else:
                db[request.sid]['testCount'] = 0
                self.transition_UL()

    def transition_UL(self):
        # prepare payload that will be used for UL test
        ulPayload = urandom(db[request.sid]['settings']['ulSize'])
        db[request.sid]['digest'] = hashlib.sha512(ulPayload).hexdigest()
        msg = {
            'state': 5,
            'log': 'Upload Start!',
            'bin': ulPayload
        }
        emit('my_response', msg)

    def trigger_UL(self):
        msg = {
            'state': 6,
            'log': 'Upload Start!',
        }
        emit('my_response', msg, callback=get_time_UL_start)

    def received_UL(self, message, clockStopped):
        db[request.sid]['ulTimes'].append(clockStopped - db[request.sid]['ulStart'])
        recvBinData = message['bin']

        # validate payload
        if db[request.sid]['digest'] != hashlib.sha512(recvBinData).hexdigest():
            msg = {
                'state': -99,
                'log': 'Verification failed!',
            }
            emit('my_response', msg)
            self.on_disconnect_request()

        else:
            # send intermediate results
            db[request.sid]['result']['ul'] = get_ul_speed(request.sid)
            emit_result(request.sid)

            # check if we still need to do another round
            if db[request.sid]['testCount'] < db[request.sid]['settings']['ulTestCount']:
                db[request.sid]['testCount'] += 1
                self.transition_UL()

            else:
                db[request.sid]['testCount'] = 0
                self.on_complete()

    def on_complete(self):
        msg = {
            'log': 'Test Completed!',
            'state': 101
        }
        emit('my_response', msg)
        print(db)
        # submit(request, results)  # ToDO: handle when connection takes too long or RS is unreachable?

    def on_error(self):
        print(request.event["message"])
        print(request.event["args"])
        msg = {
            'state': -99,
            'log': 'An unexpected event happened, terminating!',
        }
        emit('my_response', msg)
        self.on_disconnect_request()

    def on_servertoclient(self):
        emit('my_response', {'data': 'connected'})


socketio.on_namespace(MyNamespace('/speedtest'))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', debug=True)
