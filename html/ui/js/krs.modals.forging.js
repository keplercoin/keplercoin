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
var krs = (function(krs, $) {
	krs.forms.startForgingComplete = function(response, data) {
		if ("deadline" in response) {
            setForgingIndicatorStatus(krs.constants.FORGING);
			forgingIndicator.find("span").html($.t(krs.constants.FORGING)).attr("data-i18n", "forging");
			krs.forgingStatus = krs.constants.FORGING;
            krs.isAccountForging = true;
			$.growl($.t("success_start_forging"), {
				type: "success"
			});
		} else {
            krs.isAccountForging = false;
			$.growl($.t("error_start_forging"), {
				type: 'danger'
			});
		}
	};

	krs.forms.stopForgingComplete = function(response, data) {
		if ($("#stop_forging_modal").find(".show_logout").css("display") == "inline") {
			krs.logout();
			return;
		}
        if (response.foundAndStopped || (response.stopped && response.stopped > 0)) {
            krs.isAccountForging = false;
            if (!response.forgersCount || response.forgersCount == 0) {
                setForgingIndicatorStatus(krs.constants.NOT_FORGING);
                forgingIndicator.find("span").html($.t(krs.constants.NOT_FORGING)).attr("data-i18n", "forging");
            }
            $.growl($.t("success_stop_forging"), {
				type: 'success'
			});
		} else {
			$.growl($.t("error_stop_forging"), {
				type: 'danger'
			});
		}
	};

	var forgingIndicator = $("#forging_indicator");
	forgingIndicator.click(function(e) {
		e.preventDefault();

		if (krs.downloadingBlockchain) {
			$.growl($.t("error_forging_blockchain_downloading"), {
				"type": "danger"
			});
		} else if (krs.state.isScanning) {
			$.growl($.t("error_forging_blockchain_rescanning"), {
				"type": "danger"
			});
		} else if (!krs.accountInfo.publicKey) {
			$.growl($.t("error_forging_no_public_key"), {
				"type": "danger"
			});
		} else if (krs.accountInfo.effectiveBalancekpl == 0) {
			if (krs.lastBlockHeight >= krs.accountInfo.currentLeasingHeightFrom && krs.lastBlockHeight <= krs.accountInfo.currentLeasingHeightTo) {
				$.growl($.t("error_forging_lease"), {
					"type": "danger"
				});
			} else {
				$.growl($.t("error_forging_effective_balance"), {
					"type": "danger"
				});
			}
		} else if (krs.isAccountForging) {
			$("#stop_forging_modal").modal("show");
		} else {
			$("#start_forging_modal").modal("show");
		}
	});

	forgingIndicator.hover(
		function() {
            krs.updateForgingStatus();
        }
	);

    krs.getForgingTooltip = function(data) {
        if (!data || data.account == krs.accountInfo.account) {
            krs.isAccountForging = true;
            return $.t("forging_tooltip", {"balance": krs.accountInfo.effectiveBalancekpl});
        }
        return $.t("forging_another_account_tooltip", {"accountRS": data.accountRS });
    };

    krs.updateForgingTooltip = function(tooltip) {
        $("#forging_indicator").attr('title', tooltip).tooltip('fixTitle');
    };

    function setForgingIndicatorStatus(status) {
        var forgingIndicator = $("#forging_indicator");
        forgingIndicator.removeClass(krs.constants.FORGING);
        forgingIndicator.removeClass(krs.constants.NOT_FORGING);
        forgingIndicator.removeClass(krs.constants.UNKNOWN);
        forgingIndicator.addClass(status);
        return forgingIndicator;
    }

    krs.updateForgingStatus = function(secretPhrase) {
        var status = krs.forgingStatus;
        var tooltip = $("#forging_indicator").attr('title');
        if (!krs.accountInfo.publicKey) {
            status = krs.constants.NOT_FORGING;
            tooltip = $.t("error_forging_no_public_key");
        } else if (krs.isLeased) {
            status = krs.constants.NOT_FORGING;
            tooltip = $.t("error_forging_lease");
        } else if (krs.accountInfo.effectiveBalancekpl == 0) {
            status = krs.constants.NOT_FORGING;
            tooltip = $.t("error_forging_effective_balance");
        } else if (krs.downloadingBlockchain) {
            status = krs.constants.NOT_FORGING;
            tooltip = $.t("error_forging_blockchain_downloading");
        } else if (krs.state.isScanning) {
            status = krs.constants.NOT_FORGING;
            tooltip = $.t("error_forging_blockchain_rescanning");
        } else if (krs.needsAdminPassword && krs.getAdminPassword() == "" && (!secretPhrase || !krs.isLocalHost)) {
            // do not change forging status
        } else {
            var params = {};
            if (krs.needsAdminPassword && krs.getAdminPassword() != "") {
                params["adminPassword"] = krs.getAdminPassword();
            }
            if (secretPhrase && krs.needsAdminPassword && krs.getAdminPassword() == "") {
                params["secretPhrase"] = secretPhrase;
            }
            krs.sendRequest("getForging", params, function (response) {
                krs.isAccountForging = false;
                if ("account" in response) {
                    status = krs.constants.FORGING;
                    tooltip = krs.getForgingTooltip(response);
                    krs.isAccountForging = true;
                } else if ("generators" in response) {
                    if (response.generators.length == 0) {
                        status = krs.constants.NOT_FORGING;
                        tooltip = $.t("not_forging_not_started_tooltip");
                    } else {
                        status = krs.constants.FORGING;
                        if (response.generators.length == 1) {
                            tooltip = krs.getForgingTooltip(response.generators[0]);
                        } else {
                            tooltip = $.t("forging_more_than_one_tooltip", { "generators": response.generators.length });
                            for (var i=0; i< response.generators.length; i++) {
                                if (response.generators[i].account == krs.accountInfo.account) {
                                    krs.isAccountForging = true;
                                }
                            }
                            if (krs.isAccountForging) {
                                tooltip += ", " + $.t("forging_current_account_true");
                            } else {
                                tooltip += ", " + $.t("forging_current_account_false");
                            }
                        }
                    }
                } else {
                    status = krs.constants.UNKNOWN;
                    tooltip = response.errorDescription.escapeHTML();
                }
            }, false);
        }
        var forgingIndicator = setForgingIndicatorStatus(status);
        if (status == krs.constants.NOT_FORGING) {
            krs.isAccountForging = false;
        }
        forgingIndicator.find("span").html($.t(status)).attr("data-i18n", status);
        forgingIndicator.show();
        krs.forgingStatus = status;
        krs.updateForgingTooltip(tooltip);
    };

	return krs;
}(krs || {}, jQuery));