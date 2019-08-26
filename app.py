#!/usr/bin/env python
import sys
import time
import uuid
from os import urandom
from threading import Lock
import requests
import json

from flask import Flask, render_template, request
from flask_socketio import SocketIO, Namespace, emit, disconnect

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)

thread = None
thread_lock = Lock()
size = 1024 * 1024 * 5
dummy_bytes = urandom(size)
dummy_data_size = sys.getsizeof(dummy_bytes)  # apparently, sizeof(dummy_bytes) is not exactly equal to size


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


def calculate(sid):
    # sort time deltas, and drop 2 lowest and 2 highest values
    pingTimes = db[sid]['pingTimes']
    ulTimes = db[sid]['ulTimes']
    dlTimes = db[sid]['dlTimes']
    pingTimes.sort()
    ulTimes.sort()
    dlTimes.sort()

    pingTimes = pingTimes[2:8]
    ulTimes = ulTimes[2:8]
    dlTimes = dlTimes[2:8]

    # get average of the remaing deltas
    pingDelta = sum(pingTimes)/len(pingTimes)
    ulDelta = sum(ulTimes)/len(ulTimes)
    dlDelta = sum(dlTimes)/len(dlTimes)

    # get speed simply by using file size divided by the average time
    # ul = round(dummy_data_size / ulDelta / (1024 * 1024), 2)
    # dl = round(dummy_data_size / dlDelta / (1024 * 1024), 2)
    ul = dummy_data_size / ulDelta
    dl = dummy_data_size / dlDelta
    rtt = pingDelta * 1000
    result = {
        'sid': sid,
        'ul': ul,
        'dl': dl,
        'rtt': rtt
    }
    return result


@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)


class MyNamespace(Namespace):
    def on_next(self, message):
        state = message["state"]
        if state == 0:
            self.on_my_ping_1()
        elif state == 1:
            self.on_my_ping_2()
        elif state == 2:
            self.on_my_dl_1()
        elif state == 3:
            self.on_my_dl_2()
        elif state == 4:
            self.on_my_ul_1(message)
        elif state == 5:
            self.on_my_ul_2()
        else: # catch bin for failures
            pass

    def on_disconnect_request(self):
        emit('my_response', {'log': 'Test done... Disconnected!'})
        disconnect()

    def on_connect(self):
        emit('my_response', {'log': 'Connected'})

    def on_start(self):
        db[request.sid] = {
            'ip_address': request.remote_addr,
            'testCount': 0,
            'pingStart': 0,
            'pingStop': 0,
            'dlStart': 0,
            'dlStop': 0,
            'ulStart': 0,
            'ulStop': 0,
            'pingTimes': [],
            'dlTimes': [],
            'ulTimes': []
        }
        print(db)
        emit('my_response', {'log': 'Starting', 'state': 0})

    def on_my_ping_1(self):
        db[request.sid]['pingStart'] = time.time()
        msg = {
            'state': 1,
            'log': 'Ping sent',
        }
        emit('my_response', msg)

    def on_my_ping_2(self):
        db[request.sid]['pingStop'] = time.time()
        db[request.sid]['pingTimes'].append(db[request.sid]['pingStop'] - db[request.sid]['pingStart'])
        msg = {
            'state': 2,
            'log': 'Ping ACK sent',
        }
        emit('my_response', msg)

    def on_disconnect(self):
        print(db)
        remove_sid(request.sid)
        print('Client disconnected %s', request.sid)

    def on_my_dl_1(self):
        db[request.sid]['dlStart'] = time.time()
        msg = {
            'state': 3,
            'log': 'currently on state DL_1',
            'bin': dummy_bytes,
            'binsize': dummy_data_size,
        }
        emit('my_response', msg)

    def on_my_dl_2(self):
        db[request.sid]['dlStop'] = time.time()
        db[request.sid]['dlTimes'].append(db[request.sid]['dlStop'] - db[request.sid]['dlStart'])
        msg = {
            'state': 4,
            'log': 'currently on state DL_2, DL done',
        }
        emit('my_response', msg)
        db[request.sid]['ulStart'] = time.time()

    def on_my_ul_1(self, message):
        recvBinData = message['bin']
        if sys.getsizeof(recvBinData) == dummy_data_size:
            print('Server log: uploaded data for %s OK' % request.sid)
            msg = {
                'state': 5,
                'log': 'currently on state UL-1',
            }
            emit('my_response', msg)
            db[request.sid]['ulStop'] = time.time()
            db[request.sid]['ulTimes'].append(db[request.sid]['ulStop'] - db[request.sid]['ulStart'])
        else:
            msg = {
                'state': -99,
                'log': 'Upload Failed!',
            }
            emit('my_response', msg)

    def on_my_ul_2(self):
        if db[request.sid]['testCount'] < 10:
            db[request.sid]['testCount'] += 1
            msg = {
                'state': 0,
                'log': 'Run another test',
            }
            emit('my_response', msg)
        else:
            db[request.sid]['testCount'] = 0  # reset counter
            self.on_my_results()

        print('Server log: testcount[%s] = %s' % (request.sid, db[request.sid]['testCount']))

    def on_my_results(self):
        results = calculate(request.sid)
        msg = {
            'log': 'Results sent',
            'results': results,
            'state': 100
        }
        emit('my_response', msg)
        submit(request, results)  # ToDO: handle when connection takes too long or RS is unreachable?

    def on_error(self):
        print(request.event["message"])
        print(request.event["args"])


socketio.on_namespace(MyNamespace('/speedtest'))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', debug=True)
