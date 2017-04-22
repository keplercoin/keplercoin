#!/bin/sh
if [ -e ~/.kpl/kpl.pid ]; then
    PID=`cat ~/.kpl/kpl.pid`
    ps -p $PID > /dev/null
    STATUS=$?
    echo "stopping"
    while [ $STATUS -eq 0 ]; do
        kill `cat ~/.kpl/kpl.pid` > /dev/null
        sleep 5
        ps -p $PID > /dev/null
        STATUS=$?
    done
    rm -f ~/.kpl/kpl.pid
    echo "kpl server stopped"
fi

