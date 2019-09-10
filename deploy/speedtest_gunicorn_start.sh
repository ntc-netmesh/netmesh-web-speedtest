#!/bin/bash

NAME="nm-speedtest"                                # Name of the application
FLASKDIR=/var/www/netmesh-web-speedtest
SOCKFILE=/var/www/netmesh-web-speedtest/speedtest.sock  # we will communicte using this unix socket
USER=www-data                                       # the user to run as
GROUP=www-data                                      # the group to run as
NUM_WORKERS=1        # how many worker processes should Gunicorn spawn, Usually  2* CPU + 1
TIMEOUT=60

echo "Starting $NAME as `whoami`"
cd $FLASKDIR

# Create the run directory if it doesn't exist
RUNDIR=$(dirname $SOCKFILE)
test -d $RUNDIR || mkdir -p $RUNDIR

# Start your Unicorn
# Programs meant to be run under supervisor should not daemonize themselves (do not use --daemon)
exec gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
  --user=$USER --group=$GROUP \
  --log-level=debug \
  --log-file=- \
  --workers $NUM_WORKERS --timeout=$TIMEOUT app:app

