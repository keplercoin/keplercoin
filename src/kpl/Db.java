/******************************************************************************



 ******************************************************************************/

package kpl;

import kpl.db.BasicDb;
import kpl.db.TransactionalDb;

public final class Db {

    public static final String PREFIX = Constants.isTestnet ? "kpl.testDb" : "kpl.db";
    public static final TransactionalDb db = new TransactionalDb(new BasicDb.DbProperties()
            .maxCacheSize(Kpl.getIntProperty("kpl.dbCacheKB"))
            .dbUrl(Kpl.getStringProperty(PREFIX + "Url"))
            .dbType(Kpl.getStringProperty(PREFIX + "Type"))
            .dbDir(Kpl.getStringProperty(PREFIX + "Dir"))
            .dbParams(Kpl.getStringProperty(PREFIX + "Params"))
            .dbUsername(Kpl.getStringProperty(PREFIX + "Username"))
            .dbPassword(Kpl.getStringProperty(PREFIX + "Password", null, true))
            .maxConnections(Kpl.getIntProperty("kpl.maxDbConnections"))
            .loginTimeout(Kpl.getIntProperty("kpl.dbLoginTimeout"))
            .defaultLockTimeout(Kpl.getIntProperty("kpl.dbDefaultLockTimeout") * 1000)
            .maxMemoryRows(Kpl.getIntProperty("kpl.dbMaxMemoryRows"))
    );

    static void init() {
        db.init(new kplDbVersion());
    }

    static void shutdown() {
        db.shutdown();
    }

    private Db() {} // never

}
