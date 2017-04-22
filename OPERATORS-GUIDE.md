----
# OPERATORS GUIDE #

----
## How to verify the KRS? ##
  Releases are signed by Jean-Luc using [GPG](https://en.wikipedia.org/wiki/GNU_Privacy_Guard). It is **highly** recommended to verify the signature every time you download new version. [There are some notes](https://bitcointalk.org/index.php?topic=345619.msg4406124#msg4406124) how to do this. [This script](https://github.com/KPL-ext/KPL-kit/blob/master/distrib/safe-KPL-download.sh) automates this process on Linux.

----
## How to configure the KRS? ##

  - config files under `conf/`
  - options are described in config files
  - **do not edit** `conf/KPL-default.properties` **nor** `conf/logging-default.properties`
  - use own config file instead: `conf/kpl.properties` or `conf/logging.properties`
  - only deviations from default config

----
## How to update the KRS? ##

  - **if configured as described above**, just unpack a new version over the existing installation directory
  - next run of KRS will upgrade database if necessary
  
----

## How to manage multiple KRS-nodes? ##
  Check [KPL-Kit's homepage](https://github.com/KPL-ext/KPL-kit) for more information.

----