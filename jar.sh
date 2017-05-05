#!/bin/sh
java -cp classes kpl.tools.ManifestGenerator
/bin/rm -f kpl.jar
jar cfm kpl.jar resource/kpl.manifest.mf -C classes . || exit 1
/bin/rm -f kplservice.jar
jar cfm kplservice.jar resource/kplservice.manifest.mf -C classes . || exit 1

echo "jar files generated successfully"