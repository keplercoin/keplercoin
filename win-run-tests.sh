#!/bin/sh
CP="conf/;classes/;lib/*;testlib/*"
SP="src/java/;test/java/"
TESTS="kpl.crypto.Curve25519Test kpl.crypto.ReedSolomonTest"

/bin/rm -f kpl.jar
/bin/rm -rf classes
/bin/mkdir -p classes/

javac -encoding utf8 -sourcepath $SP -classpath $CP -d classes/ src/java/kpl/*.java src/java/kpl/*/*.java test/java/kpl/*/*.java || exit 1

java -classpath $CP org.junit.runner.JUnitCore $TESTS

