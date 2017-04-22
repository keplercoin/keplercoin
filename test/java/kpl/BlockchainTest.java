/******************************************************************************
 * Copyright © 2013-2016 The kpl Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * kpl software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

package kpl;

import kpl.util.Logger;
import kpl.util.Time;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;

import java.util.Properties;

public abstract class BlockchainTest extends AbstractBlockchainTest {

    protected static Tester FORGY;
    protected static Tester ALICE;
    protected static Tester BOB;
    protected static Tester CHUCK;
    protected static Tester DAVE;

    protected static int baseHeight;

    protected static String forgerSecretPhrase = "aSykrgKGZNlSVOMDxkZZgbTvQqJPGtsBggb";
    protected static final String forgerAccountId = "KPL-9KZM-KNYY-QBXZ-5TD8V";
    protected static String secretPhrase1 = "hope peace happen touch easy pretend worthless talk them indeed wheel state";
    protected static String secretPhrase2 = "rshw9abtpsa2";
    protected static String secretPhrase3 = "eOdBVLMgySFvyiTy8xMuRXDTr45oTzB7L5J";
    protected static String secretPhrase4 = "t9G2ymCmDsQij7VtYinqrbGCOAtDDA3WiNr";

    private static final String aliceSecretPhrase = "hope peace happen touch easy pretend worthless talk them indeed wheel state";
    private static final String bobSecretPhrase2 = "rshw9abtpsa2";
    private static final String chuckSecretPhrase = "eOdBVLMgySFvyiTy8xMuRXDTr45oTzB7L5J";
    private static final String daveSecretPhrase = "t9G2ymCmDsQij7VtYinqrbGCOAtDDA3WiNr";

    protected static boolean iskplInitted = false;
    protected static boolean needShutdownAfterClass = false;

    public static void initkpl() {
        if (!iskplInitted) {
            Properties properties = ManualForgingTest.newTestProperties();
            properties.setProperty("kpl.isTestnet", "true");
            properties.setProperty("kpl.isOffline", "true");
            properties.setProperty("kpl.enableFakeForging", "true");
            properties.setProperty("kpl.fakeForgingAccount", forgerAccountId);
            properties.setProperty("kpl.timeMultiplier", "1");
            properties.setProperty("kpl.testnetGuaranteedBalanceConfirmations", "1");
            properties.setProperty("kpl.testnetLeasingDelay", "1");
            properties.setProperty("kpl.disableProcessTransactionsThread", "true");
            properties.setProperty("kpl.deleteFinishedShufflings", "false");
            AbstractForgingTest.init(properties);
            iskplInitted = true;
        }
    }
    
    @BeforeClass
    public static void init() {
        needShutdownAfterClass = !iskplInitted;
        initkpl();
        
        Kpl.setTime(new Time.CounterTime(Kpl.getEpochTime()));
        baseHeight = blockchain.getHeight();
        Logger.logMessage("baseHeight: " + baseHeight);
        FORGY = new Tester(forgerSecretPhrase);
        ALICE = new Tester(aliceSecretPhrase);
        BOB = new Tester(bobSecretPhrase2);
        CHUCK = new Tester(chuckSecretPhrase);
        DAVE = new Tester(daveSecretPhrase);
    }

    @AfterClass
    public static void shutdown() {
        if (needShutdownAfterClass) {
            Kpl.shutdown();
        }
    }

    @After
    public void destroy() {
        TransactionProcessorImpl.getInstance().clearUnconfirmedTransactions();
        blockchainProcessor.popOffTo(baseHeight);
        shutdown();
    }

    public static void generateBlock() {
        try {
            blockchainProcessor.generateBlock(forgerSecretPhrase, Kpl.getEpochTime());
        } catch (BlockchainProcessor.BlockNotAcceptedException e) {
            e.printStackTrace();
            Assert.fail();
        }
    }

    public static void generateBlocks(int howMany) {
        for (int i = 0; i < howMany; i++) {
            generateBlock();
        }
    }
}
