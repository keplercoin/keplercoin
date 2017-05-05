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
	$("#hash_modal").on("show.bs.modal", function(e) {
		$("#hash_calculation_output").html("").hide();
		$("#hash_modal_button").data("form", "calculate_hash_form");
	});

	krs.forms.hash = function($modal) {
		var data = $.trim($("#calculate_hash_data").val());
		if (!data) {
			$("#hash_calculation_output").html("").hide();
			return {
				"error": "Data is a required field."
			};
		} else {
			return {};
		}
	};

	krs.forms.hashComplete = function(response, data) {
		$("#hash_modal").find(".error_message").hide();

		if (response.hash) {
			$("#hash_calculation_output").html($.t("calculated_hash_is") + "<br/><br/>" +
				"<textarea style='width:100%' rows='3'>" + String(response.hash).escapeHTML() + "</textarea>").show();
		} else {
			$.growl($.t("error_calculate_hash"), {
				"type": "danger"
			});
		}
	};

	krs.forms.hashError = function() {
		$("#hash_calculation_output").hide();
	};

	return krs;
}(krs || {}, jQuery));