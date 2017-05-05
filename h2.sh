#!/bin/sh
java -cp lib/h2*.jar org.h2.tools.Console -url jdbc:h2:./kpl_db/kpl -user sa -password sa
