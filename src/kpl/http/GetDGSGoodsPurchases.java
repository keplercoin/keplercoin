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

package kpl.http;

import kpl.DigitalGoodsStore;
import kpl.kplException;
import kpl.db.DbIterator;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;

public final class GetDGSGoodsPurchases extends APIServlet.APIRequestHandler {

    static final GetDGSGoodsPurchases instance = new GetDGSGoodsPurchases();

    private GetDGSGoodsPurchases() {
        super(new APITag[] {APITag.DGS}, "goods", "buyer", "firstIndex", "lastIndex", "withPublicFeedbacksOnly", "completed");
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest req) throws kplException {

        long goodsId = ParameterParser.getUnsignedLong(req, "goods", true);
        long buyerId = ParameterParser.getAccountId(req, "buyer", false);
        int firstIndex = ParameterParser.getFirstIndex(req);
        int lastIndex = ParameterParser.getLastIndex(req);
        final boolean withPublicFeedbacksOnly = "true".equalsIgnoreCase(req.getParameter("withPublicFeedbacksOnly"));
        final boolean completed = "true".equalsIgnoreCase(req.getParameter("completed"));


        JSONObject response = new JSONObject();
        JSONArray purchasesJSON = new JSONArray();
        response.put("purchases", purchasesJSON);

        try (DbIterator<DigitalGoodsStore.Purchase> iterator = DigitalGoodsStore.Purchase.getGoodsPurchases(goodsId,
                buyerId, withPublicFeedbacksOnly, completed, firstIndex, lastIndex)) {
            while(iterator.hasNext()) {
                purchasesJSON.add(JSONData.purchase(iterator.next()));
            }
        }
        return response;
    }

}
