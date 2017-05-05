#!/bin/sh
if [ -e ~/.kpl/kpl.pid ]; then
    PID=`cat ~/.kpl/kpl.pid`
    ps -p $PID > /dev/null
    STATUS=$?
    if [ $STATUS -eq 0 ]; then
        echo "kpl server already running"
        exit 1
    fi
fi
mkdir -p ~/.kpl/
DIR=`dirname "$0"`
cd "${DIR}"
if [ -x jre/bin/java ]; then
    JAVA=./jre/bin/java
else
    JAVA=java
fi
nohup ${JAVA} -cp classes:lib/*:conf:addons/classes -Dkpl.runtime.mode=desktop kpl.Kpl > /dev/null 2>&1 &
echo $! > ~/.kpl/kpl.pid
cd - > /dev/null
