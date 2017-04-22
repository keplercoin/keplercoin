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
	$("body").on("click", ".show_ledger_modal_action", function(event) {
		event.preventDefault();
		if (krs.fetchingModalData) {
			return;
		}
		krs.fetchingModalData = true;
        var ledgerId, change, balance;
        if (typeof $(this).data("entry") == "object") {
            var dataObject = $(this).data("entry");
            ledgerId = dataObject["entry"];
            change = dataObject["change"];
            balance = dataObject["balance"];
        } else {
            ledgerId = $(this).data("entry");
            change = $(this).data("change");
            balance = $(this).data("balance");
        }
        if ($(this).data("back") == "true") {
            krs.modalStack.pop(); // The forward modal
            krs.modalStack.pop(); // The current modal
        }
        krs.sendRequest("getAccountLedgerEntry+", { ledgerId: ledgerId }, function(response) {
			krs.showLedgerEntryModal(response, change, balance);
		});
	});

	krs.showLedgerEntryModal = function(entry, change, balance) {
        try {
            krs.setBackLink();
    		krs.modalStack.push({ class: "show_ledger_modal_action", key: "entry", value: { entry: entry.ledgerId, change: change, balance: balance }});
            $("#ledger_info_modal_entry").html(entry.ledgerId);
            var entryDetails = $.extend({}, entry);
            entryDetails.eventType = $.t(entryDetails.eventType.toLowerCase());
            entryDetails.holdingType = $.t(entryDetails.holdingType.toLowerCase());
            if (entryDetails.timestamp) {
                entryDetails.entryTime = krs.formatTimestamp(entryDetails.timestamp);
            }
            if (entryDetails.holding) {
                entryDetails.holding_formatted_html = krs.getTransactionLink(entry.holding);
                delete entryDetails.holding;
            }
            entryDetails.height_formatted_html = krs.getBlockLink(entry.height);
            delete entryDetails.block;
            delete entryDetails.height;
            if (entryDetails.isTransactionEvent) {
                entryDetails.transaction_formatted_html = krs.getTransactionLink(entry.event);
            }
            delete entryDetails.event;
            delete entryDetails.isTransactionEvent;
            entryDetails.change_formatted_html = change;
            delete entryDetails.change;
            entryDetails.balance_formatted_html = balance;
            delete entryDetails.balance;
            var detailsTable = $("#ledger_info_details_table");
            detailsTable.find("tbody").empty().append(krs.createInfoTable(entryDetails));
            detailsTable.show();
            $("#ledger_info_modal").modal("show");
        } finally {
            krs.fetchingModalData = false;
        }
	};

	return krs;
}(krs || {}, jQuery));