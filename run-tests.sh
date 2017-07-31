#!/bin/sh
CP=conf/:classes/:lib/*:testlib/*
SP=src/java/:test/java/

if [ $# -eq 0 ]; then
TESTS="kpl.crypto.Curve25519Test kpl.crypto.ReedSolomonTest kpl.peer.HallmarkTest kpl.TokenTest kpl.FakeForgingTest
kpl.FastForgingTest kpl.ManualForgingTest"
else
TESTS=$@
fi

/bin/rm -f kpl.jar
/bin/rm -rf classes
/bin/mkdir -p classes/

javac -encoding utf8 -sourcepath ${SP} -classpath ${CP} -d classes/ src/java/kpl/*.java src/java/kpl/*/*.java test/java/kpl/*.java test/java/kpl/*/*.java || exit 1

for TEST in ${TESTS} ; do
java -classpath ${CP} org.junit.runner.JUnitCore ${TEST} ;
done



