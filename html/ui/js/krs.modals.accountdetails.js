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
    var accountDetailsModal = $("#account_details_modal");
    accountDetailsModal.on("show.bs.modal", function(e) {
        krs.sendRequestQRCode("#account_details_modal_qr_code", krs.accountRS, 125, 125);
		$("#account_details_modal_balance").show();

        var accountBalanceWarning = $("#account_balance_warning");
        if (krs.accountInfo.errorCode && krs.accountInfo.errorCode != 5) {
			$("#account_balance_table").hide();
			accountBalanceWarning.html(String(krs.accountInfo.errorDescription).escapeHTML()).show();
		} else {
			accountBalanceWarning.hide();
            var accountBalancePublicKey = $("#account_balance_public_key");
            if (krs.accountInfo.errorCode && krs.accountInfo.errorCode == 5) {
				$("#account_balance_balance, #account_balance_unconfirmed_balance, #account_balance_effective_balance, #account_balance_guaranteed_balance, #account_balance_forged_balance").html("0 KPL");
				accountBalancePublicKey.html(String(krs.publicKey).escapeHTML());
				$("#account_balance_account_rs").html(krs.getAccountLink(krs, "account", undefined, undefined, true));
				$("#account_balance_account").html(String(krs.account).escapeHTML());
			} else {
				$("#account_balance_balance").html(krs.formatAmount(new BigInteger(krs.accountInfo.balanceNQT)) + " KPL");
				$("#account_balance_unconfirmed_balance").html(krs.formatAmount(new BigInteger(krs.accountInfo.unconfirmedBalanceNQT)) + " KPL");
				$("#account_balance_effective_balance").html(krs.formatAmount(krs.accountInfo.effectiveBalancekpl) + " KPL");
				$("#account_balance_guaranteed_balance").html(krs.formatAmount(new BigInteger(krs.accountInfo.guaranteedBalanceNQT)) + " KPL");
				$("#account_balance_forged_balance").html(krs.formatAmount(new BigInteger(krs.accountInfo.forgedBalanceNQT)) + " KPL");

				accountBalancePublicKey.html(String(krs.accountInfo.publicKey).escapeHTML());
				$("#account_balance_account_rs").html(krs.getAccountLink(krs.accountInfo, "account", undefined, undefined, true));
				$("#account_balance_account").html(String(krs.account).escapeHTML());

				if (!krs.accountInfo.publicKey) {
					accountBalancePublicKey.html("/");
                    var warning = krs.publicKey != 'undefined' ? $.t("public_key_not_announced_warning", { "public_key": krs.publicKey }) : $.t("no_public_key_warning");
					accountBalanceWarning.html(warning + " " + $.t("public_key_actions")).show();
				}
			}
		}

		var $invoker = $(e.relatedTarget);
		var tab = $invoker.data("detailstab");
		if (tab) {
			_showTab(tab)
		}
	});

	function _showTab(tab){
		var tabListItem = $("#account_details_modal li[data-tab=" + tab + "]");
		tabListItem.siblings().removeClass("active");
		tabListItem.addClass("active");

		$(".account_details_modal_content").hide();

		var content = $("#account_details_modal_" + tab);

		content.show();
	}

	accountDetailsModal.find("ul.nav li").click(function(e) {
		e.preventDefault();

		var tab = $(this).data("tab");

		_showTab(tab);
	});

	accountDetailsModal.on("hidden.bs.modal", function() {
		$(this).find(".account_details_modal_content").hide();
		$(this).find("ul.nav li.active").removeClass("active");
		$("#account_details_balance_nav").addClass("active");
		$("#account_details_modal_qr_code").empty();
	});

	return krs;
}(krs || {}, jQuery));