#!/bin/sh
if [ -x jre/bin/java ]; then
    JAVA=./jre/bin/java
else
    JAVA=java
fi
${JAVA} -cp classes:lib/*:conf:addons/classes -Dkpl.runtime.mode=desktop -Dkpl.runtime.dirProvider=kpl.env.DefaultDirProvider kpl.Kpl
