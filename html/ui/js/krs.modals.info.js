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
	var krsModal = $("#krs_modal");
    krsModal.on("show.bs.modal", function() {
		if (krs.fetchingModalData) {
			return;
		}

		krs.fetchingModalData = true;

		krs.sendRequest("getState", {
			"includeCounts": true,
            "adminPassword": krs.getAdminPassword()
		}, function(state) {
			for (var key in state) {
				if (!state.hasOwnProperty(key)) {
					continue;
				}
				var el = $("#krs_node_state_" + key);
				if (el.length) {
					if (key.indexOf("number") != -1) {
						el.html(krs.formatAmount(state[key]));
					} else if (key.indexOf("Memory") != -1) {
						el.html(krs.formatVolume(state[key]));
					} else if (key == "time") {
						el.html(krs.formatTimestamp(state[key]));
					} else {
						el.html(String(state[key]).escapeHTML());
					}
				}
			}

			$("#krs_update_explanation").show();
			$("#krs_modal_state").show();

			krs.fetchingModalData = false;
		});
	});

	krsModal.on("hide.bs.modal", function() {
		$("body").off("dragover.krs, drop.krs");

		$("#krs_update_drop_zone, #krs_update_result, #krs_update_hashes, #krs_update_hash_progress").hide();

		$(this).find("ul.nav li.active").removeClass("active");
		$("#krs_modal_state_nav").addClass("active");

		$(".krs_modal_content").hide();
	});

	krsModal.find("ul.nav li").click(function(e) {
		e.preventDefault();

		var tab = $(this).data("tab");

		$(this).siblings().removeClass("active");
		$(this).addClass("active");

		$(".krs_modal_content").hide();

		var content = $("#krs_modal_" + tab);

		content.show();
	});

	return krs;
}(krs || {}, jQuery));