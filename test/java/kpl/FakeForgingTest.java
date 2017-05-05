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

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import java.util.Properties;

public class FakeForgingTest extends AbstractForgingTest {

    @Before
    public void init() {
        Properties properties = AbstractForgingTest.newTestProperties();
        properties.setProperty("kpl.disableGenerateBlocksThread", "false");
        properties.setProperty("kpl.enableFakeForging", "true");
        properties.setProperty("kpl.timeMultiplier", "1");
        AbstractForgingTest.init(properties);
        Assert.assertTrue("kpl.fakeForgingAccount must be defined in kpl.properties", Kpl.getStringProperty("kpl.fakeForgingAccount") != null);
    }

    @Test
    public void fakeForgingTest() {
        forgeTo(startHeight + 10, testForgingSecretPhrase);
    }

    @After
    public void destroy() {
        AbstractForgingTest.shutdown();
    }

}
