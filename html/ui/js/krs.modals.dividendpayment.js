/******************************************************************************
 * Copyright © 2013-2016 The KPL Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * KPL software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 * @depends {krs.modals.js}
 */
var krs = (function(krs, $, undefined) {

    krs.forms.dividendPayment = function($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        data.asset = krs.getCurrentAsset().asset;
        if (!data.amountKPLPerShare) {
            return {
                "error": $.t("error_amount_per_share_required")
            }
        } else {
            data.amountNQTPerQNT = krs.calculatePricePerWholeQNT(
                krs.convertToNQT(data.amountKPLPerShare),
                krs.getCurrentAsset().decimals);
        }
        if (!/^\d+$/.test(data.height)) {
            return {
                "error": $.t("error_invalid_dividend_height")
            }
        }
        var isDividendHeightBeforeAssetHeight;
        krs.sendRequest("getTransaction", { transaction: data.asset }, function(response) {
            if (response.height > data.height) {
                isDividendHeightBeforeAssetHeight = true;
            }
        }, false);
        if (isDividendHeightBeforeAssetHeight) {
            return {
                "error": $.t("dividend_height_asset_height")
            };
        }
        delete data.amountKPLPerShare;
        return {
            "data": data
        };
    };

    $("#dividend_payment_modal").on("hidden.bs.modal", function() {
        $(this).find(".dividend_payment_info").first().hide();
    });

    $("#dividend_payment_amount_per_share").keydown(function(e) {
        var decimals = krs.getCurrentAsset().decimals;
        var charCode = !e.charCode ? e.which : e.charCode;
        if (krs.isControlKey(charCode) || e.ctrlKey || e.metaKey) {
            return;
        }
        return krs.validateDecimals(8-decimals, charCode, $(this).val(), e);
   	});

    $("#dividend_payment_amount_per_share, #dividend_payment_height").on("blur", function() {
        var $modal = $(this).closest(".modal");
        var amountKPLPerShare = $modal.find("#dividend_payment_amount_per_share").val();
        var height = $modal.find("#dividend_payment_height").val();
        var $callout = $modal.find(".dividend_payment_info").first();
        var classes = "callout-info callout-danger callout-warning";
        if (amountKPLPerShare && /^\d+$/.test(height)) {
            krs.getAssetAccounts(krs.getCurrentAsset().asset, height,
                function (response) {
                    var accountAssets = response.accountAssets;
                    var qualifiedDividendRecipients = accountAssets.filter(
                        function(accountAsset) {
                            return accountAsset.accountRS !== krs.getCurrentAsset().accountRS
                                && accountAsset.accountRS !== krs.constants.GENESIS_RS;
                        });
                    var totalQuantityQNT = new BigInteger("0");
                    qualifiedDividendRecipients.forEach(
                        function (accountAsset) {
                            totalQuantityQNT = totalQuantityQNT.add(new BigInteger(accountAsset.quantityQNT));
                        }
                    );
                    var priceNQT = new BigInteger(krs.calculatePricePerWholeQNT(krs.convertToNQT(amountKPLPerShare), krs.getCurrentAsset().decimals));
                    var totalKPL = krs.calculateOrderTotal(totalQuantityQNT, priceNQT);
                    $callout.html($.t("dividend_payment_info_preview_success",
                            {
                                "amountKPL": totalKPL,
                                "totalQuantity": krs.formatQuantity(totalQuantityQNT, krs.getCurrentAsset().decimals),
                                "recipientCount": qualifiedDividendRecipients.length
                            })
                    );
                    $callout.removeClass(classes).addClass("callout-info").show();
                },
                function (response) {
                    var displayString;
                    if (response.errorCode == 4 || response.errorCode == 8) {
                        displayString = $.t("error_invalid_dividend_height");
                    } else {
                        displayString = $.t("dividend_payment_info_preview_error", {"errorCode": response.errorCode});
                    }
                    $callout.html(displayString);
                    $callout.removeClass(classes).addClass("callout-warning").show();
                }
            );
        }
    });

    return krs;
}(krs || {}, jQuery));
