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
	krs.forms.leaseBalanceComplete = function(response, data) {
		krs.getAccountInfo();
	};

    function setLeaseBalanceHelp(period) {
        var days = Math.round(period / 1440);
        $("#lease_balance_help").html($.t("lease_balance_help_var", {
            "blocks": String(period).escapeHTML(),
            "days": String(Math.round(days)).escapeHTML()
        }));
    }

	$("#lease_balance_modal").on("show.bs.modal", function() {
        var leaseBalancePeriod = $("#lease_balance_period");
        leaseBalancePeriod.attr('min', 1440);
        leaseBalancePeriod.attr('max', krs.constants.MAX_UNSIGNED_SHORT_JAVA);
		setLeaseBalanceHelp(krs.constants.MAX_UNSIGNED_SHORT_JAVA);
	});

    $("#lease_balance_period").on("change", function() {
		if (this.value > krs.constants.MAX_UNSIGNED_SHORT_JAVA) {
			$("#lease_balance_help").html($.t("error_lease_balance_period"));
		} else {
            setLeaseBalanceHelp(this.value);
        }
	});

	return krs;
}(krs || {}, jQuery));