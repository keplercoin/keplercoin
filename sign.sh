#!/bin/sh
java -cp "classes:lib/*:conf" kpl.tools.SignTransactionJSON $@
exit $?
